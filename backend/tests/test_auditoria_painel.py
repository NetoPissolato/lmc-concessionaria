"""
Regressões encontradas na auditoria de 2026-10-05 (painel + API).
Cada teste reproduz um defeito que existia, com a regra que vale agora.
"""
import asyncio
import random
import string
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.domain.models.financial import FinancialEntry
from tests.conftest import _Session, SENHA_TESTE

pytestmark = pytest.mark.asyncio
API = "/api/v1"


def _placa():
    return "T" + "".join(random.choices(string.ascii_uppercase, k=2)) + str(random.randint(1, 9)) + \
        random.choice(string.ascii_uppercase) + f"{random.randint(0, 99):02d}"


def _veiculo(**kw):
    p = {"marca": "fiat", "modelo": "argo", "ano": 2022, "cor": "branco", "combustivel": "flex",
         "cambio": "manual", "quilometragem": 1000, "placa": _placa(),
         "chassi": "9BD" + "".join(random.choices(string.digits, k=14)),
         "valor_compra": "50000", "data_compra": date.today().isoformat(), "valor_anunciado": "60000"}
    p.update(kw)
    return p


def _cpf():
    while True:
        d = [random.randint(0, 9) for _ in range(9)]
        for n in (9, 10):
            d.append((sum(d[i] * (n + 1 - i) for i in range(n)) * 10 % 11) % 10)
        if len(set(d)) > 1:
            return "".join(map(str, d))


async def _lancamentos(vehicle_id):
    async with _Session() as s:
        return list((await s.execute(select(FinancialEntry).where(FinancialEntry.vehicle_id == vehicle_id))).scalars())


# ── Login com e-mail digitado com maiúscula ───────────────────────────────────
async def test_usuario_com_email_maiusculo_entra_pelo_email(client, admin):
    r = await client.post(f"{API}/users", headers=admin["headers"], json={
        "nome": "Joao", "email": "Joao.Silva@Loja.com", "senha": SENHA_TESTE})
    assert r.status_code == 201, r.text
    assert r.json()["email"] == "joao.silva@loja.com"
    for ident in ("Joao.Silva@Loja.com", "joao.silva@loja.com"):
        r = await client.post(f"{API}/auth/login", json={"identifier": ident, "senha": SENHA_TESTE})
        assert r.status_code == 200, (ident, r.text)
    r = await client.post(f"{API}/users", headers=admin["headers"], json={
        "nome": "Dup", "email": "JOAO.SILVA@loja.com", "senha": SENHA_TESTE})
    assert r.status_code == 409


# ── Texto/número maior que a coluna: 422, nunca 500 ───────────────────────────
@pytest.mark.parametrize("rota,corpo", [
    ("/users", {"nome": "N" * 200, "email": "a@b.com", "senha": "12345678"}),
    ("/users", {"nome": "x", "email": "t@b.com", "senha": "12345678", "telefone": "1" * 30}),
    ("/customers", {"nome": "C", "estado": "São Paulo"}),
    ("/customers", {"nome": "C", "cep": "1" * 15}),
    ("/customers", {"nome": "C", "numero": "123 fundos casa 2"}),
    ("/vehicles", _veiculo(placa="ABC1D23XYZ99")),
    ("/vehicles", _veiculo(chassi="9BW" + "1" * 17)),
    ("/vehicles", _veiculo(renavam="1" * 15)),
    ("/vehicles", _veiculo(tipo="moto", cilindrada=99999)),
    ("/vehicles", _veiculo(portas=99999)),
    ("/vehicles", _veiculo(cor="c" * 80)),
    ("/vehicles", _veiculo(valor_compra="99999999999.00")),
    ("/vehicles", _veiculo(valor_multas="-1")),
    ("/vehicles", _veiculo(valor_anunciado="-1")),
    ("/modelos-destaque", {"marca": "M" * 100, "modelo": "X", "carroceria": "suv"}),
])
async def test_entrada_grande_demais_vira_422(client, admin, rota, corpo):
    r = await client.post(API + rota, headers=admin["headers"], json=corpo)
    assert r.status_code == 422, (rota, r.status_code, r.text[:200])


async def test_configuracao_grande_demais_vira_422(client, admin):
    for corpo in ({"estado": "São Paulo"}, {"whatsapp": "+55 (11) 99999-9999 ramal"}):
        r = await client.put(f"{API}/settings", headers=admin["headers"], json=corpo)
        assert r.status_code == 422, (corpo, r.text)


async def test_venda_para_cliente_inexistente_ou_excluido_e_recusada(client, admin):
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
    base = {"vehicle_id": v["id"], "valor_venda": "60000", "forma_pagamento": "pix", "data_venda": date.today().isoformat()}
    r = await client.post(f"{API}/sales", headers=admin["headers"], json={**base, "cliente_id": "00000000-0000-0000-0000-000000000000"})
    assert r.status_code == 422, r.text
    cli = (await client.post(f"{API}/customers", headers=admin["headers"], json={"nome": "Apagado"})).json()
    await client.delete(f"{API}/customers/{cli['id']}", headers=admin["headers"])
    r = await client.post(f"{API}/sales", headers=admin["headers"], json={**base, "cliente_id": cli["id"]})
    assert r.status_code == 422, r.text


# ── Edição de veículo ─────────────────────────────────────────────────────────
async def test_edicao_de_veiculo_valida_valores(client, admin):
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
    for corpo in ({"valor_compra": "-10"}, {"quilometragem": -1}, {"ano": 1500}, {"valor_multas": "-5"}):
        r = await client.put(f"{API}/vehicles/{v['id']}", headers=admin["headers"], json=corpo)
        assert r.status_code == 422, (corpo, r.text)


async def test_placa_e_chassi_podem_ser_corrigidos_sem_duplicar(client, admin):
    v1 = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
    v2 = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
    nova = _placa()
    r = await client.put(f"{API}/vehicles/{v1['id']}", headers=admin["headers"], json={"placa": nova.lower()[:3] + "-" + nova[3:]})
    assert r.status_code == 200 and r.json()["placa"] == nova, r.text
    r = await client.put(f"{API}/vehicles/{v1['id']}", headers=admin["headers"], json={"placa": v2["placa"]})
    assert r.status_code == 409
    r = await client.put(f"{API}/vehicles/{v1['id']}", headers=admin["headers"], json={"chassi": v2["chassi"]})
    assert r.status_code == 409


async def test_veiculo_com_venda_pendente_nao_muda_status_nem_e_excluido(client, admin):
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
    cli = (await client.post(f"{API}/customers", headers=admin["headers"], json={"nome": "Comprador"})).json()
    r = await client.post(f"{API}/sales", headers=admin["headers"], json={
        "cliente_id": cli["id"], "vehicle_id": v["id"], "valor_venda": "60000", "forma_pagamento": "pix",
        "data_venda": date.today().isoformat(), "status": "pendente"})
    assert r.status_code == 201, r.text
    r = await client.put(f"{API}/vehicles/{v['id']}", headers=admin["headers"], json={"status": "disponivel"})
    assert r.status_code == 409
    r = await client.delete(f"{API}/vehicles/{v['id']}", headers=admin["headers"])
    assert r.status_code == 409
    # cancelada a venda, o veículo volta a ser editável e excluível
    sale_id = (await client.get(f"{API}/sales", headers=admin["headers"])).json()[0]["id"]
    await client.patch(f"{API}/sales/{sale_id}/status", headers=admin["headers"], json={"status": "cancelada"})
    r = await client.delete(f"{API}/vehicles/{v['id']}", headers=admin["headers"])
    assert r.status_code == 204, r.text


async def test_correcao_da_compra_fica_no_mes_da_compra(client, admin):
    mes_passado = (date.today().replace(day=1) - timedelta(days=1)).replace(day=10)
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"],
                           json=_veiculo(valor_compra="50000", data_compra=mes_passado.isoformat()))).json()
    r = await client.put(f"{API}/vehicles/{v['id']}", headers=admin["headers"], json={"valor_compra": "52000"})
    assert r.status_code == 200, r.text
    por_mes = {}
    for e in await _lancamentos(v["id"]):
        por_mes[(e.data.year, e.data.month)] = por_mes.get((e.data.year, e.data.month), 0) + e.valor
    assert por_mes.get((mes_passado.year, mes_passado.month)) == Decimal("52000.00")
    assert por_mes.get((date.today().year, date.today().month), 0) == 0
    # mudar só a data da compra leva o lançamento para o mês novo
    r = await client.put(f"{API}/vehicles/{v['id']}", headers=admin["headers"], json={"data_compra": date.today().isoformat()})
    por_mes = {}
    for e in await _lancamentos(v["id"]):
        por_mes[(e.data.year, e.data.month)] = por_mes.get((e.data.year, e.data.month), 0) + e.valor
    assert por_mes.get((mes_passado.year, mes_passado.month)) == 0
    assert por_mes.get((date.today().year, date.today().month)) == Decimal("52000.00")


async def test_despesa_nao_aceita_valor_negativo_e_correcao_fica_no_mes(client, admin):
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
    dia = (date.today().replace(day=1) - timedelta(days=1)).replace(day=5)
    e = (await client.post(f"{API}/vehicles/{v['id']}/expenses", headers=admin["headers"], json={
        "data": dia.isoformat(), "categoria": "mecanica", "descricao": "Óleo", "valor": "100.10",
        "forma_pagamento": "pix"})).json()
    r = await client.put(f"{API}/vehicles/{v['id']}/expenses/{e['id']}", headers=admin["headers"], json={"valor": "-5"})
    assert r.status_code == 422
    r = await client.put(f"{API}/vehicles/{v['id']}/expenses/{e['id']}", headers=admin["headers"], json={"valor": "120"})
    assert r.status_code == 200
    estornos = [x for x in await _lancamentos(v["id"]) if x.estorno_de_id]
    assert estornos and all(x.data == dia for x in estornos)


async def test_custo_total_sem_erro_de_centavos(client, admin):
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo(valor_compra="80000"))).json()
    for valor in ("450.10", "0.20", "0.10"):
        await client.post(f"{API}/vehicles/{v['id']}/expenses", headers=admin["headers"], json={
            "data": date.today().isoformat(), "categoria": "lavagem", "descricao": "x", "valor": valor,
            "forma_pagamento": "pix"})
    r = await client.get(f"{API}/vehicles/{v['id']}", headers=admin["headers"])
    assert Decimal(str(r.json()["custo_total"])) == Decimal("80450.40")
    assert len(str(r.json()["custo_total"]).split(".")[-1]) <= 2


async def test_pagar_multas_em_clique_duplo_paga_uma_vez(client, admin):
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo(valor_multas="300"))).json()
    rs = await asyncio.gather(*[client.post(f"{API}/vehicles/{v['id']}/pay-fines", headers=admin["headers"]) for _ in range(3)])
    assert sorted(r.status_code for r in rs).count(200) == 1
    multas = sum(e.valor for e in await _lancamentos(v["id"]) if e.categoria.value == "multa")
    assert multas == Decimal("300.00")


# ── Clientes ──────────────────────────────────────────────────────────────────
async def test_cliente_devolve_endereco_completo_e_busca_por_digitos(client, admin):
    cpf = _cpf()
    r = await client.post(f"{API}/customers", headers=admin["headers"], json={
        "nome": "Maria", "cpf_cnpj": cpf, "telefone": "(11) 98888-7777", "cep": "01310-100", "endereco": "Av. Paulista",
        "numero": "1000", "complemento": "ap 12", "bairro": "Bela Vista", "cidade": "São Paulo", "estado": "sp"})
    assert r.status_code == 201, r.text
    c = r.json()
    assert (c["cep"], c["numero"], c["complemento"], c["bairro"], c["estado"]) == ("01310-100", "1000", "ap 12", "Bela Vista", "SP")
    for termo in (cpf, cpf[:6], "988887777"):
        r = await client.get(f"{API}/customers", headers=admin["headers"], params={"q": termo})
        assert any(x["id"] == c["id"] for x in r.json()), termo


# ── Site público ──────────────────────────────────────────────────────────────
async def test_filtros_invalidos_do_site_nao_derrubam(client):
    for prm in ({"cambio": "xyz"}, {"combustivel": "xyz"}, {"tipo": "xyz"}):
        r = await client.get(f"{API}/public/vehicles", params=prm)
        assert r.status_code == 200, (prm, r.text)
    r = await client.get(f"{API}/public/settings")
    assert r.json()["max_fotos_veiculo"] >= 1


# ── Permissões ────────────────────────────────────────────────────────────────
async def test_funcionario_nao_exclui_avaliacao(client, admin, funcionario):
    await client.post(f"{API}/public/reviews", json={"nome": "Cliente", "nota": 5, "texto": "Ótimo atendimento"})
    rev = (await client.get(f"{API}/reviews", headers=admin["headers"])).json()[0]
    r = await client.delete(f"{API}/reviews/{rev['id']}", headers=funcionario["headers"])
    assert r.status_code == 403
    r = await client.delete(f"{API}/reviews/{rev['id']}", headers=admin["headers"])
    assert r.status_code == 200


async def test_relatorio_de_comissoes_ignora_venda_pendente(client, admin):
    cli = (await client.post(f"{API}/customers", headers=admin["headers"], json={"nome": "Comprador"})).json()
    hoje = date.today().isoformat()
    for status in ("pendente", "concluida"):
        v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo())).json()
        r = await client.post(f"{API}/sales", headers=admin["headers"], json={
            "cliente_id": cli["id"], "vehicle_id": v["id"], "valor_venda": "60000", "forma_pagamento": "pix",
            "comissao_percentual": "2", "data_venda": hoje, "status": status})
        assert r.status_code == 201
    r = await client.get(f"{API}/reports/comissoes", headers=admin["headers"], params={"data_inicio": hoje, "data_fim": hoje})
    assert r.json()["resumo"]["comissao_total"] == 1200.0
    assert all(x["status"] == "concluida" for x in r.json()["detalhado"])


# ── Limite de requisições ─────────────────────────────────────────────────────
def test_limite_conta_por_usuario_e_isenta_chamada_interna():
    from starlette.requests import Request
    from app.core.rate_limit import chave_usuario_ou_ip, chamada_interna
    from app.core.security import create_access_token

    def req(ip, headers=()):
        return Request({"type": "http", "method": "GET", "path": "/", "headers": [(k.encode(), v.encode()) for k, v in headers],
                        "client": (ip, 1234), "query_string": b""})

    tok = create_access_token("user-1", "a@b.com", "funcionario")
    assert chave_usuario_ou_ip(req("200.1.1.1", [("authorization", f"Bearer {tok}")])) == "u:user-1"
    assert chave_usuario_ou_ip(req("200.1.1.1", [("authorization", "Bearer forjado")])) == "ip:200.1.1.1"
    assert chamada_interna(req("172.18.0.5"))                                   # site renderizando no servidor
    assert not chamada_interna(req("172.18.0.5", [("x-forwarded-for", "200.1.1.1")]))  # veio pelo nginx
    assert not chamada_interna(req("200.1.1.1"))


async def test_datas_no_futuro_e_preco_minimo_sao_recusados(client, admin):
    futuro = (date.today() + timedelta(days=60)).isoformat()
    r = await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo(data_compra=futuro))
    assert r.status_code == 422
    r = await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo(valor_anunciado="90000", valor_minimo="120000"))
    assert r.status_code == 422
    v = (await client.post(f"{API}/vehicles", headers=admin["headers"], json=_veiculo(valor_anunciado="90000"))).json()
    r = await client.put(f"{API}/vehicles/{v['id']}", headers=admin["headers"], json={"valor_minimo": "95000"})
    assert r.status_code == 422
    cli = (await client.post(f"{API}/customers", headers=admin["headers"], json={"nome": "C"})).json()
    r = await client.post(f"{API}/sales", headers=admin["headers"], json={
        "cliente_id": cli["id"], "vehicle_id": v["id"], "valor_venda": "90000", "forma_pagamento": "pix", "data_venda": futuro})
    assert r.status_code == 422
