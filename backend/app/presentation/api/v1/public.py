"""
Rotas publicas - sem autenticacao.
Expoe apenas veiculos com status=disponivel.
NUNCA expoe dados financeiros internos (custo, margem, placa completa, chassi, etc).
"""

from fastapi import APIRouter, Query, Path as FPath, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from fastapi import Depends
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, EmailStr
import json

from app.core.database import get_db
from app.domain.models.vehicle import Vehicle, VehicleStatus, VehicleType
from app.domain.models.vehicle_photo import VehiclePhoto
from app.domain.models.lead import Lead, LeadStatus
from app.domain.models.review import Review
from app.domain.models.availability_alert import AvailabilityAlert
from app.domain.models.store_settings import StoreSettings
from app.domain.models.user import User as UserModel
from app.application.services.upload_service import UploadService

router = APIRouter(prefix="/public", tags=["Publico"])


# ─── Public Team (employees with cargo set) ───────────────────────────────────────────
@router.get("/team", summary="Equipe da loja (funcionarios com cargo)")
async def get_team(db: AsyncSession = Depends(get_db)):
    """
    Retorna funcionarios ativos que possuem cargo preenchido.
    Usado na pagina 'Sobre' do site publico.
    NUNCA expoe: email, telefone, senha, role.
    """
    result = await db.execute(
        select(UserModel)
        .where(
            UserModel.ativo == True,
            UserModel.cargo.isnot(None),
            UserModel.cargo != "",
            UserModel.deleted_at.is_(None),
        )
        .order_by(UserModel.data_contratacao.asc().nulls_last(), UserModel.nome.asc())
    )
    users = result.scalars().all()
    return [
        {
            "id":               u.id,
            "nome":             u.nome,
            "cargo":            u.cargo,
            "foto":             UploadService.get_url(u.foto),
            "data_contratacao": u.data_contratacao.isoformat() if u.data_contratacao else None,
        }
        for u in users
    ]


# ─── Public Settings (safe fields only) ───────────────────────────────────────

@router.get("/settings", summary="Configuracoes publicas da loja")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """Retorna apenas campos seguros para o site publico (sem dados administrativos)."""
    result = await db.execute(select(StoreSettings).limit(1))
    s = result.scalar_one_or_none()
    if not s:
        return {}
    return {
        "nome_loja":     s.nome_loja,
        "slogan":        s.slogan,
        "whatsapp":      s.whatsapp,
        "telefone":      s.telefone,
        "email_contato": s.email_contato,
        "instagram":     s.instagram,
        "facebook":      s.facebook,
        "youtube":       s.youtube,
        "endereco":      s.endereco,
        "cidade":        s.cidade,
        "estado":        s.estado,
        "horario":       s.horario,
        "stat_clientes": s.stat_clientes,
        "stat_anos":     s.stat_anos,
        "stat_satisfacao": s.stat_satisfacao,
        "ga_id":         s.ga_id or "",
        "pixel_id":      s.pixel_id or "",
    }


# ─── Schema público — nunca expõe dados internos ──────────────────────────────
def _to_public(v: Vehicle) -> dict:
    """
    Converte um Vehicle para dict seguro para o site público.
    Remove: valor_compra, valor_multas, custo_total, lucro_bruto,
            margem_percentual, placa, chassi, renavam,
            vendedor_nome, vendedor_telefone.
    """
    photos = []
    if v.photos:
        for p in sorted(v.photos, key=lambda x: x.ordem):
            photos.append({
                "id": p.id,
                "url": p.url,
                "is_main": p.is_main,
                "ordem": p.ordem,
            })

    return {
        "id": v.id,
        "marca": v.marca,
        "modelo": v.modelo,
        "versao": v.versao,
        "ano": v.ano,
        "cor": v.cor,
        "combustivel": v.combustivel.value,
        "cambio": v.cambio.value,
        "quilometragem": v.quilometragem,
        "tipo": v.tipo.value,
        "cilindrada": v.cilindrada,
        "tipo_moto": v.tipo_moto,
        "valor_anunciado": float(v.valor_anunciado) if v.valor_anunciado else None,
        "status": v.status.value,
        "destaque": v.destaque,
        "observacoes": v.observacoes,
        "photos": photos,
        "video_url": v.video_url,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


# ─── GET /public/vehicles ──────────────────────────────────────────────────────
@router.get("/vehicles", summary="Listar veículos disponíveis (site público)")
async def list_public_vehicles(
    tipo: Optional[str] = Query(None, description="carro | moto"),
    marca: Optional[str] = Query(None, description="Filtrar por marca"),
    cambio: Optional[str] = Query(None, description="manual | automatico | cvt"),
    combustivel: Optional[str] = Query(None, description="flex | gasolina | diesel | ..."),
    ano_min: Optional[int] = Query(None, description="Ano mínimo do veículo"),
    preco_max: Optional[float] = Query(None, description="Preço máximo anunciado"),
    destaque: Optional[bool] = Query(None, description="Filtrar apenas destaques"),
    q: Optional[str] = Query(None, description="Busca livre por marca/modelo"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna veículos disponíveis para o site público.
    Apenas status=disponivel é retornado — nunca reservado, vendido, etc.
    Dados sensíveis (custo, margem, placa, chassi) são omitidos.
    """
    stmt = (
        select(Vehicle)
        .where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.deleted_at.is_(None),
        )
        .options(selectinload(Vehicle.photos))
        .order_by(Vehicle.destaque.desc(), Vehicle.created_at.desc())
    )

    # Filtros opcionais
    if tipo:
        try:
            stmt = stmt.where(Vehicle.tipo == VehicleType(tipo.lower()))
        except ValueError:
            pass

    if marca:
        stmt = stmt.where(Vehicle.marca.ilike(f"%{marca}%"))

    if cambio:
        stmt = stmt.where(Vehicle.cambio == cambio.lower())

    if combustivel:
        stmt = stmt.where(Vehicle.combustivel == combustivel.lower())

    if ano_min:
        stmt = stmt.where(Vehicle.ano >= ano_min)

    if preco_max:
        stmt = stmt.where(Vehicle.valor_anunciado <= Decimal(str(preco_max)))

    if destaque is not None:
        stmt = stmt.where(Vehicle.destaque == destaque)

    if q:
        term = f"%{q}%"
        stmt = stmt.where(
            Vehicle.marca.ilike(term) | Vehicle.modelo.ilike(term)
        )

    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    vehicles = result.scalars().all()

    return [_to_public(v) for v in vehicles]


# ─── GET /public/vehicles/{id} ────────────────────────────────────────────────
@router.get("/vehicles/{vehicle_id}", summary="Detalhe do veículo (site público)")
async def get_public_vehicle(
    vehicle_id: str = FPath(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna detalhe de um veículo disponível.
    404 se o veículo não existir ou não estiver disponível.
    """
    stmt = (
        select(Vehicle)
        .where(
            Vehicle.id == vehicle_id,
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.deleted_at.is_(None),
        )
        .options(selectinload(Vehicle.photos))
    )
    result = await db.execute(stmt)
    vehicle = result.scalar_one_or_none()

    if not vehicle:
        raise HTTPException(
            status_code=404,
            detail="Veículo não encontrado ou não disponível"
        )

    return _to_public(vehicle)


# ─── GET /public/stats ─────────────────────────────────────────────────────────
@router.get("/stats", summary="Estatísticas públicas (site público)")
async def get_public_stats(db: AsyncSession = Depends(get_db)):
    """
    Retorna contadores para o site público:
    - total_veiculos: quantos disponíveis no estoque
    - total_marcas: quantas marcas distintas
    - satisfacao: fixo 98 (valor de marketing)
    """
    # Total disponíveis
    count_q = await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.deleted_at.is_(None),
        )
    )
    total_veiculos = count_q.scalar_one()

    # Marcas distintas
    marcas_q = await db.execute(
        select(func.count(func.distinct(Vehicle.marca))).where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.deleted_at.is_(None),
        )
    )
    total_marcas = marcas_q.scalar_one()

    # Carros disponíveis
    carros_q = await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.tipo == "carro",
            Vehicle.deleted_at.is_(None),
        )
    )
    total_carros = carros_q.scalar_one()

    # Motos disponíveis
    motos_q = await db.execute(
        select(func.count(Vehicle.id)).where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.tipo == "moto",
            Vehicle.deleted_at.is_(None),
        )
    )
    total_motos = motos_q.scalar_one()

    return {
        "total_veiculos": total_veiculos,
        "total_marcas": total_marcas,
        "total_carros": total_carros,
        "total_motos": total_motos,
        "satisfacao": 98,
    }


# ─── GET /public/marcas ────────────────────────────────────────────────────────
@router.get("/marcas", summary="Lista de marcas disponíveis no estoque")
async def get_public_marcas(
    tipo: Optional[str] = Query(None, description="carro | moto"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna lista de marcas que têm veículos disponíveis.
    Usado para popular dropdowns do site.
    """
    stmt = (
        select(func.distinct(Vehicle.marca))
        .where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.deleted_at.is_(None),
        )
        .order_by(Vehicle.marca)
    )

    if tipo:
        try:
            stmt = stmt.where(Vehicle.tipo == VehicleType(tipo.lower()))
        except ValueError:
            pass

    result = await db.execute(stmt)
    marcas = [row[0] for row in result.fetchall()]
    return {"marcas": marcas}


# ─── GET /public/settings ─────────────────────────────────────────────────────
@router.get("/settings", summary="Configurações públicas da loja (site público)")
async def get_public_settings(db: AsyncSession = Depends(get_db)):
    """
    Retorna apenas os dados públicos da loja:
    contato, redes sociais, stats, hero text.
    Nunca expõe CNPJ, horário interno, sistema, etc.
    """
    from app.domain.models.store_settings import StoreSettings
    result = await db.execute(select(StoreSettings).limit(1))
    s = result.scalar_one_or_none()

    if not s:
        # Defaults quando a tabela ainda está vazia
        return {
            "whatsapp":       "",
            "instagram":      "",
            "facebook":       "",
            "youtube":        "",
            "telefone":       "",
            "email_contato":  "",
            "nome_loja":      "LMC Veículos",
            "slogan":         "Seu próximo veículo está aqui",
            "endereco":       "",
            "cidade":         "",
            "estado":         "",
            "horario":        "Seg–Sex: 8h–18h | Sáb: 8h–13h",
            "hero_titulo":    "Encontre seu próximo veículo",
            "hero_subtitulo": "Carros e motos selecionados com qualidade e transparência",
            "stat_clientes":  0,
            "stat_anos":      0,
            "stat_satisfacao": 98,
            "modo_manutencao": False,
        }

    return {
        "whatsapp":       s.whatsapp,
        "instagram":      s.instagram,
        "facebook":       s.facebook,
        "youtube":        s.youtube,
        "telefone":       s.telefone,
        "email_contato":  s.email_contato,
        "nome_loja":      s.nome_loja,
        "slogan":         s.slogan,
        "endereco":       s.endereco,
        "cidade":         s.cidade,
        "estado":         s.estado,
        "horario":        s.horario,
        "hero_titulo":    s.hero_titulo,
        "hero_subtitulo": s.hero_subtitulo,
        "stat_clientes":  s.stat_clientes,
        "stat_anos":      s.stat_anos,
        "stat_satisfacao": s.stat_satisfacao,
        "modo_manutencao": s.modo_manutencao,
    }


# ============================================================
# LEADS - Formulario de contato
# ============================================================

class LeadCreateSchema(BaseModel):
    nome: str
    telefone: str
    email: Optional[str] = None
    mensagem: Optional[str] = None
    veiculo_id: Optional[str] = None
    veiculo_descricao: Optional[str] = None
    origem: str = "contato"


@router.post("/leads", status_code=201, summary="Enviar lead de contato")
async def create_lead(
    body: LeadCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    Recebe lead do formulario de contato do site.
    Salva no banco com status=novo para o admin acompanhar.
    """
    lead = Lead(
        nome=body.nome.strip(),
        telefone=body.telefone.strip(),
        email=body.email,
        mensagem=body.mensagem,
        veiculo_id=body.veiculo_id,
        veiculo_descricao=body.veiculo_descricao,
        origem=body.origem,
        status=LeadStatus.NOVO,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {"ok": True, "id": lead.id, "message": "Mensagem recebida! Entraremos em contato em breve."}


# ============================================================
# REVIEWS - Avaliacoes de clientes
# ============================================================

class ReviewCreateSchema(BaseModel):
    nome: str
    nota: int
    texto: str
    cidade: Optional[str] = None


@router.get("/reviews", summary="Listar avaliacoes aprovadas")
async def list_public_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Retorna apenas reviews aprovadas pelo admin."""
    stmt = (
        select(Review)
        .where(Review.aprovado == True)  # noqa: E712
        .order_by(desc(Review.created_at))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    reviews = result.scalars().all()
    return [
        {
            "id": r.id,
            "nome": r.nome,
            "nota": r.nota,
            "texto": r.texto,
            "foto_url": r.foto_url,
            "cidade": r.cidade,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]


@router.post("/reviews", status_code=201, summary="Enviar avaliacao (fica pendente de aprovacao)")
async def create_review(
    body: ReviewCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    if not (1 <= body.nota <= 5):
        raise HTTPException(status_code=422, detail="Nota deve ser entre 1 e 5")
    if len(body.texto.strip()) < 10:
        raise HTTPException(status_code=422, detail="Texto muito curto (minimo 10 caracteres)")

    review = Review(
        nome=body.nome.strip(),
        nota=body.nota,
        texto=body.texto.strip(),
        cidade=body.cidade,
        aprovado=False,  # Fica pendente ate admin aprovar
    )
    db.add(review)
    await db.commit()
    return {"ok": True, "message": "Avaliacao recebida! Sera publicada apos revisao."}


# ============================================================
# ALERTAS DE DISPONIBILIDADE
# ============================================================

class AlertCreateSchema(BaseModel):
    email: str
    nome: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    tipo: Optional[str] = None
    ano_min: Optional[int] = None
    ano_max: Optional[int] = None
    preco_max: Optional[float] = None


@router.post("/availability-alerts", status_code=201, summary="Cadastrar alerta de disponibilidade")
async def create_availability_alert(
    body: AlertCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    Visitante quer ser notificado quando um veiculo especifico entrar no estoque.
    """
    alert = AvailabilityAlert(
        email=body.email.strip().lower(),
        nome=body.nome,
        marca=body.marca,
        modelo=body.modelo,
        tipo=body.tipo,
        ano_min=body.ano_min,
        ano_max=body.ano_max,
        preco_max=Decimal(str(body.preco_max)) if body.preco_max else None,
    )
    db.add(alert)
    await db.commit()
    return {"ok": True, "message": "Perfeito! Voce sera notificado quando o veiculo estiver disponivel."}


# ─── POST /public/leads — Formulário de contato público ───────────────────────

class LeadPublicSchema(BaseModel):
    nome: str
    telefone: str = "nao informado"
    email: Optional[str] = None
    mensagem: Optional[str] = None
    veiculo_id: Optional[str] = None
    veiculo_descricao: Optional[str] = None
    origem: str = "contato"


@router.post("/leads", status_code=201, summary="Salvar lead do formulario de contato")
async def create_public_lead(
    body: LeadPublicSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    Recebe o formulario de contato do site publico e salva como lead no CRM.
    Nao requer autenticacao.
    """
    import uuid
    lead = Lead(
        id=str(uuid.uuid4()),
        nome=body.nome.strip(),
        telefone=body.telefone.strip(),
        email=body.email.strip() if body.email else None,
        mensagem=body.mensagem,
        veiculo_id=body.veiculo_id,
        veiculo_descricao=body.veiculo_descricao,
        status=LeadStatus.novo,
        origem=body.origem,
    )
    db.add(lead)
    await db.commit()
    return {"ok": True, "message": "Mensagem recebida! Entraremos em contato em breve."}
