"""
Regras de dinheiro: venda, cancelamento, estorno, despesas e dashboard.
Cada teste reproduz um bug real encontrado na auditoria de 2026-10.
"""
import io
import uuid
from decimal import Decimal

from sqlalchemy import select, func

from app.domain.models.financial import FinancialEntry
from tests.conftest import _Session

API = "/api/v1"


def _placa():
    return "TST" + uuid.uuid4().hex[:4].upper()


def veiculo_payload(**extra):
    base = {
        "marca": "toyota", "modelo": "corolla", "versao": "xei 2.0", "ano": 2022, "cor": "prata",
        "combustivel": "flex", "cambio": "cvt", "quilometragem": 30000, "tipo": "carro",
        "placa": _placa(), "chassi": uuid.uuid4().hex[:17].upper(),
        "valor_compra": "100000", "data_compra": "2026-01-10", "valor_anunciado": "120000",
    }
    base.update(extra)
    return base


async def criar_veiculo(client, headers, **extra):
    r = await client.post(f"{API}/vehicles", json=veiculo_payload(**extra), headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def criar_cliente(client, headers):
    r = await client.post(f"{API}/customers", json={"nome": "Cliente Teste"}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


async def vender(client, headers, vehicle_id, cliente_id, status="concluida", valor="118000", **extra):
    payload = {
        "cliente_id": cliente_id, "vehicle_id": vehicle_id, "valor_venda": valor,
        "forma_pagamento": "pix", "data_venda": "2026-10-01", "status": status,
    }
    payload.update(extra)
    return await client.post(f"{API}/sales", json=payload, headers=headers)


async def soma_caixa(**filtros) -> Decimal:
    async with _Session() as s:
        stmt = select(func.coalesce(func.sum(FinancialEntry.valor), 0))
        for campo, valor in filtros.items():
            stmt = stmt.where(getattr(FinancialEntry, campo) == valor)
        return Decimal(str(await s.scalar(stmt)))


# ── Venda duplicada ───────────────────────────────────────────────────────────
async def test_nao_vende_o_mesmo_veiculo_duas_vezes(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    c = await criar_cliente(client, h)
    assert (await vender(client, h, v["id"], c["id"])).status_code == 201
    r = await vender(client, h, v["id"], c["id"])
    assert r.status_code == 409, r.text


async def test_venda_pendente_reserva_e_bloqueia_outra_venda(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    c = await criar_cliente(client, h)
    r = await vender(client, h, v["id"], c["id"], status="pendente")
    assert r.status_code == 201
    assert (await client.get(f"{API}/vehicles/{v['id']}", headers=h)).json()["status"] == "reservado"
    assert (await vender(client, h, v["id"], c["id"])).status_code == 409


async def test_cancelar_venda_antiga_nao_devolve_carro_vendido_por_outra(client, admin):
    """Bug D2: cancelar uma venda velha colocava de volta no site um carro já vendido."""
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    c = await criar_cliente(client, h)
    venda_a = (await vender(client, h, v["id"], c["id"])).json()
    # A é cancelada, o carro volta ao estoque e é vendido para B
    assert (await client.patch(f"{API}/sales/{venda_a['id']}/status", json={"status": "cancelada"}, headers=h)).status_code == 200
    assert (await vender(client, h, v["id"], c["id"])).status_code == 201
    # Reativar A agora tem que falhar: o carro já é de B
    r = await client.patch(f"{API}/sales/{venda_a['id']}/status", json={"status": "concluida"}, headers=h)
    assert r.status_code == 409, r.text
    assert (await client.get(f"{API}/vehicles/{v['id']}", headers=h)).json()["status"] == "vendido"


# ── Estorno ───────────────────────────────────────────────────────────────────
async def test_cancelar_venda_estorna_sem_apagar_historico(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    c = await criar_cliente(client, h)
    venda = (await vender(client, h, v["id"], c["id"], comissao_percentual="2")).json()
    assert await soma_caixa(venda_id=venda["id"]) != 0

    r = await client.patch(f"{API}/sales/{venda['id']}/status", json={"status": "cancelada"}, headers=h)
    assert r.status_code == 200
    assert await soma_caixa(venda_id=venda["id"]) == 0  # líquido zerado…
    async with _Session() as s:  # …mas as linhas continuam lá, com o estorno ao lado
        linhas = (await s.execute(select(FinancialEntry).where(FinancialEntry.venda_id == venda["id"]))).scalars().all()
    assert len(linhas) >= 4 and any(l.estorno_de_id for l in linhas)
    # Cancelar de novo não estorna em dobro
    assert (await client.patch(f"{API}/sales/{venda['id']}/status", json={"status": "cancelada"}, headers=h)).status_code == 400
    assert (await client.get(f"{API}/vehicles/{v['id']}", headers=h)).json()["status"] == "disponivel"


async def test_funcionario_nao_desfaz_venda_concluida(client, admin, funcionario):
    v = await criar_veiculo(client, admin["headers"])
    c = await criar_cliente(client, admin["headers"])
    venda = (await vender(client, admin["headers"], v["id"], c["id"])).json()
    r = await client.patch(f"{API}/sales/{venda['id']}/status", json={"status": "cancelada"}, headers=funcionario["headers"])
    assert r.status_code == 403


# ── Validações da venda ───────────────────────────────────────────────────────
async def test_formas_de_pagamento_precisam_somar_o_total(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    c = await criar_cliente(client, h)
    r = await vender(client, h, v["id"], c["id"], payment_methods=[
        {"forma": "pix", "valor": "50000"}, {"forma": "dinheiro", "valor": "10000"},
    ])
    assert r.status_code == 422


async def test_comissao_absurda_recusada(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    c = await criar_cliente(client, h)
    assert (await vender(client, h, v["id"], c["id"], comissao_percentual="150")).status_code == 422


# ── Despesas ──────────────────────────────────────────────────────────────────
async def test_despesa_cai_na_categoria_certa_do_caixa(client, admin):
    """Bug BE-02: str(enum) no Python 3.12 jogava toda despesa em 'outros'."""
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    r = await client.post(f"{API}/vehicles/{v['id']}/expenses", headers=h, json={
        "data": "2026-02-01", "categoria": "mecanica", "descricao": "Troca de óleo",
        "valor": "450", "forma_pagamento": "pix",
    })
    assert r.status_code == 201, r.text
    async with _Session() as s:
        e = (await s.execute(select(FinancialEntry).where(FinancialEntry.expense_id == r.json()["id"]))).scalar_one()
    assert e.categoria.value == "manutencao"


async def test_apagar_despesa_so_admin_e_estorna(client, admin, funcionario):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    d = (await client.post(f"{API}/vehicles/{v['id']}/expenses", headers=h, json={
        "data": "2026-02-01", "categoria": "pneus", "descricao": "Pneus", "valor": "1200", "forma_pagamento": "pix",
    })).json()
    url = f"{API}/vehicles/{v['id']}/expenses/{d['id']}"
    assert (await client.delete(url, headers=funcionario["headers"])).status_code == 403
    assert (await client.delete(url, headers=h)).status_code == 204
    assert await soma_caixa(expense_id=d["id"]) == 0


# ── Cadastro ──────────────────────────────────────────────────────────────────
async def test_nome_do_modelo_preserva_grafia_oficial(client, admin):
    v = await criar_veiculo(client, admin["headers"], marca="volkswagen", modelo="t-cross", versao="highline 250 tsi")
    assert (v["marca"], v["modelo"], v["versao"]) == ("Volkswagen", "T-Cross", "Highline 250 TSI")


async def test_placa_de_veiculo_excluido_ou_vendido_pode_ser_recadastrada(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    assert (await client.delete(f"{API}/vehicles/{v['id']}", headers=h)).status_code == 204
    v2 = await criar_veiculo(client, h, placa=v["placa"], chassi=v["chassi"])  # antes: erro 500
    c = await criar_cliente(client, h)
    assert (await vender(client, h, v2["id"], c["id"])).status_code == 201
    await criar_veiculo(client, h, placa=v["placa"], chassi=v["chassi"])  # recompra do mesmo carro


async def test_placa_duplicada_em_estoque_da_409(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    r = await client.post(f"{API}/vehicles", json=veiculo_payload(placa=v["placa"]), headers=h)
    assert r.status_code == 409


async def test_nao_marca_vendido_sem_venda(client, admin):
    h = admin["headers"]
    v = await criar_veiculo(client, h)
    r = await client.put(f"{API}/vehicles/{v['id']}", json={"status": "vendido"}, headers=h)
    assert r.status_code == 422


async def test_cpf_invalido_e_duplicado(client, admin):
    h = admin["headers"]
    assert (await client.post(f"{API}/customers", json={"nome": "X", "cpf_cnpj": "111.111.111-11"}, headers=h)).status_code == 422
    assert (await client.post(f"{API}/customers", json={"nome": "A", "cpf_cnpj": "52998224725"}, headers=h)).status_code == 201
    r = await client.post(f"{API}/customers", json={"nome": "B", "cpf_cnpj": "529.982.247-25"}, headers=h)
    assert r.status_code == 409


# ── Dashboard ─────────────────────────────────────────────────────────────────
async def test_dashboard_lucro_e_restrito_ao_admin(client, admin, funcionario):
    h = admin["headers"]
    v = await criar_veiculo(client, h)  # custo 100.000
    await client.post(f"{API}/vehicles/{v['id']}/expenses", headers=h, json={
        "data": "2026-02-01", "categoria": "lavagem", "descricao": "Lavagem", "valor": "500", "forma_pagamento": "pix",
    })
    c = await criar_cliente(client, h)
    await vender(client, h, v["id"], c["id"], valor="118000")
    d = (await client.get(f"{API}/sales/dashboard?year=2026&month=10", headers=h)).json()
    assert Decimal(str(d["lucro_bruto_mes"])) == Decimal("17500")  # 118.000 − (100.000 + 500)
    df = (await client.get(f"{API}/sales/dashboard?year=2026&month=10", headers=funcionario["headers"])).json()
    assert df["lucro_bruto_mes"] is None and df["saldo_caixa_mes"] is None


# ── Fotos ─────────────────────────────────────────────────────────────────────
async def test_foto_e_validada_reduzida_e_ganha_miniatura(client, admin, tmp_path, monkeypatch):
    from PIL import Image
    from app.core.config import settings
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    h = admin["headers"]
    v = await criar_veiculo(client, h)

    buf = io.BytesIO()
    Image.new("RGB", (4000, 3000), (200, 30, 30)).save(buf, format="JPEG")
    r = await client.post(f"{API}/vehicles/{v['id']}/photos", headers=h,
                          files={"file": ("carro.jpg", buf.getvalue(), "image/jpeg")})
    assert r.status_code == 201, r.text
    foto = r.json()
    assert foto["url"].endswith(".webp") and foto["thumb_url"].endswith("_thumb.webp")
    grande = Image.open(tmp_path / "vehicles" / v["id"] / foto["url"].split("/")[-1])
    assert max(grande.size) == 1600

    falsa = await client.post(f"{API}/vehicles/{v['id']}/photos", headers=h,
                              files={"file": ("virus.jpg", b"isto nao e imagem", "image/jpeg")})
    assert falsa.status_code == 415
