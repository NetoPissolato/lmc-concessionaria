"""
Rotas publicas - sem autenticacao.
Expoe apenas veiculos com status=disponivel.
NUNCA expoe dados financeiros internos (custo, margem, placa completa, chassi, etc).
"""

from fastapi import APIRouter, Query, Path as FPath, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
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
from app.domain.models.modelo_destaque import ModeloDestaque
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

    # Deserializa opcionais de JSON string para lista
    opcionais_list = []
    if v.opcionais:
        try:
            opcionais_list = json.loads(v.opcionais)
        except Exception:
            opcionais_list = []

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
        "carroceria": v.carroceria or None,
        "condicao": v.condicao or "usado",
        "portas": v.portas,
        "opcionais": opcionais_list,
        "valor_anunciado": float(v.valor_anunciado) if v.valor_anunciado else None,
        "status": v.status.value,
        "destaque": v.destaque,
        "observacoes": v.observacoes,
        "photos": photos,
        "video_url": v.video_url,
        "visualizacoes": v.visualizacoes or 0,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


# ─── GET /public/vehicles ──────────────────────────────────────────────────────
@router.get("/vehicles", summary="Listar veículos disponíveis (site público)")
async def list_public_vehicles(
    tipo: Optional[str] = Query(None, description="carro | moto"),
    marca: Optional[str] = Query(None, description="Filtrar por marca"),
    modelo: Optional[str] = Query(None, description="Filtrar por modelo"),
    cambio: Optional[str] = Query(None, description="manual | automatico | cvt"),
    combustivel: Optional[str] = Query(None, description="flex | gasolina | diesel | ..."),
    carroceria: Optional[str] = Query(None, description="suv | hatch | sedan | picape | coupe | minivan | conversivel | perua | van"),
    condicao: Optional[str] = Query(None, description="novo | seminovo | usado"),
    ano_min: Optional[int] = Query(None, description="Ano mínimo do veículo"),
    ano_max: Optional[int] = Query(None, description="Ano máximo do veículo"),
    preco_min: Optional[float] = Query(None, description="Preço mínimo anunciado"),
    preco_max: Optional[float] = Query(None, description="Preço máximo anunciado"),
    km_max: Optional[int] = Query(None, description="Quilometragem máxima"),
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

    if tipo:
        try:
            stmt = stmt.where(Vehicle.tipo == VehicleType(tipo.lower()))
        except ValueError:
            pass

    if marca:
        stmt = stmt.where(Vehicle.marca.ilike(f"%{marca}%"))

    if modelo:
        stmt = stmt.where(Vehicle.modelo.ilike(f"%{modelo}%"))

    if cambio:
        stmt = stmt.where(Vehicle.cambio == cambio.lower())

    if combustivel:
        stmt = stmt.where(Vehicle.combustivel == combustivel.lower())

    if carroceria:
        stmt = stmt.where(Vehicle.carroceria == carroceria.lower())

    if condicao:
        stmt = stmt.where(Vehicle.condicao == condicao.lower())

    if ano_min:
        stmt = stmt.where(Vehicle.ano >= ano_min)

    if ano_max:
        stmt = stmt.where(Vehicle.ano <= ano_max)

    if preco_min:
        stmt = stmt.where(Vehicle.valor_anunciado >= Decimal(str(preco_min)))

    if preco_max:
        stmt = stmt.where(Vehicle.valor_anunciado <= Decimal(str(preco_max)))

    if km_max:
        stmt = stmt.where(Vehicle.quilometragem <= km_max)

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


# ─── POST /public/vehicles/{id}/view ───────────────────────────────────
@router.post("/vehicles/{vehicle_id}/view", summary="Incrementar contador de visualizações")
async def increment_vehicle_views(
    vehicle_id: str = FPath(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Chamado pelo site quando um usuário abre a página de um veículo.
    Incrementa o contador de visualizações de forma assíncrona.
    """
    await db.execute(
        update(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.deleted_at.is_(None))
        .values(visualizacoes=Vehicle.visualizacoes + 1)
    )
    await db.commit()
    return {"ok": True}


# ─── GET /public/modelos-destaque ────────────────────────────────────
@router.get("/modelos-destaque", summary="Modelos em destaque (site público)")
async def list_public_modelos_destaque(db: AsyncSession = Depends(get_db)):
    """
    Retorna lista de modelos configurados como destaque pelo admin.
    Inclui contagem de veículos disponíveis daquele modelo no estoque
    e a URL de imagem do estoque como fallback.
    """
    stmt = (
        select(ModeloDestaque)
        .where(ModeloDestaque.ativo == True)  # noqa: E712
        .order_by(ModeloDestaque.ordem.asc(), ModeloDestaque.created_at.asc())
    )
    result = await db.execute(stmt)
    modelos = result.scalars().all()

    # Para cada modelo, busca contagem + foto do estoque
    out = []
    for m in modelos:
        # Conta veículos disponíveis desse marca+modelo
        count_q = await db.execute(
            select(func.count(Vehicle.id)).where(
                Vehicle.marca.ilike(m.marca),
                Vehicle.modelo.ilike(m.modelo),
                Vehicle.status == VehicleStatus.DISPONIVEL,
                Vehicle.deleted_at.is_(None),
            )
        )
        total = count_q.scalar_one()

        # Foto de fallback: pega a foto principal do primeiro veículo desse modelo
        foto_estoque = None
        if not m.imagem_url:
            foto_q = await db.execute(
                select(Vehicle)
                .where(
                    Vehicle.marca.ilike(m.marca),
                    Vehicle.modelo.ilike(m.modelo),
                    Vehicle.status == VehicleStatus.DISPONIVEL,
                    Vehicle.deleted_at.is_(None),
                )
                .options(selectinload(Vehicle.photos))
                .limit(1)
            )
            v = foto_q.scalar_one_or_none()
            if v and v.photos:
                main = next((p for p in v.photos if p.is_main), v.photos[0] if v.photos else None)
                if main:
                    foto_estoque = main.url

        out.append({
            "id": m.id,
            "marca": m.marca,
            "modelo": m.modelo,
            "carroceria": m.carroceria,
            "imagem_url": m.imagem_url or foto_estoque,
            "total_disponiveis": total,
            "ordem": m.ordem,
        })

    return out


# ─── GET /public/popular-models ───────────────────────────────────────────────
@router.get("/popular-models", summary="Modelos mais vistos do estoque (automático)")
async def list_popular_models(
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    Agrupa todos os veículos (disponíveis) por marca+modelo,
    ordena pelo total de visualizações e retorna os top N.
    Usado na home como automação estilo Webmotors.
    """
    from collections import defaultdict
    import re

    def _canonical(text: str) -> str:
        """Title case preservando siglas numéricas (HB20, T-Cross, BMW)."""
        if not text:
            return text
        _CAPS = {"bmw", "byd", "jac", "cvt", "4wd", "4x4", "suv", "amg", "gti", "tdi", "gla", "glb", "glc", "gle"}
        parts = text.strip().split()
        out = []
        for p in parts:
            lp = p.lower()
            if lp in _CAPS:
                out.append(p.upper())
            elif lp[:2] in {"hb", "gl"} and any(c.isdigit() for c in p):
                out.append(p.upper())
            else:
                out.append(p.capitalize())
        return " ".join(out)

    stmt = (
        select(Vehicle)
        .where(
            Vehicle.status == VehicleStatus.DISPONIVEL,
            Vehicle.deleted_at.is_(None),
        )
        .options(selectinload(Vehicle.photos))
    )
    result = await db.execute(stmt)
    vehicles = result.scalars().all()

    # Agrupa por (marca_lower, modelo_lower) para ser 100% case-insensitive
    # Mantém a primeira forma capitalizada correta encontrada para exibição
    groups: dict = defaultdict(list)
    canonical_name: dict = {}  # lowercase_key -> (marca_canonical, modelo_canonical)
    for v in vehicles:
        marca_lower  = v.marca.strip().lower()
        modelo_lower = v.modelo.strip().lower()
        key = (marca_lower, modelo_lower)
        groups[key].append(v)
        if key not in canonical_name:
            # Usa o normalize_modelo do próprio dado do banco (já normalizado pela migration)
            canonical_name[key] = (_canonical(v.marca.strip()), _canonical(v.modelo.strip()))

    out = []
    for key, vs in groups.items():
        marca, modelo = canonical_name[key]
        total_views = sum(v.visualizacoes or 0 for v in vs)
        prices      = [float(v.valor_anunciado) for v in vs if v.valor_anunciado]
        min_price   = min(prices) if prices else None
        tipos       = [v.tipo.value for v in vs if v.tipo]
        tipo        = max(set(tipos), key=tipos.count) if tipos else "carro"
        carrocerias = [v.carroceria for v in vs if v.carroceria]
        carroceria  = max(set(carrocerias), key=carrocerias.count) if carrocerias else None

        vs_sorted = sorted(vs, key=lambda x: x.visualizacoes or 0, reverse=True)
        photo_url = None
        for v in vs_sorted:
            if v.photos:
                main = next((p for p in v.photos if p.is_main), v.photos[0] if v.photos else None)
                if main:
                    photo_url = main.url
                    break

        out.append({
            "marca":             marca,
            "modelo":            modelo,
            "tipo":              tipo,
            "carroceria":        carroceria,
            "total_disponiveis": len(vs),
            "min_price":         min_price,
            "total_views":       total_views,
            "photo_url":         photo_url,
        })

    out.sort(key=lambda x: (-(x["total_views"]), -(x["total_disponiveis"])))
    return out[:limit]


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
