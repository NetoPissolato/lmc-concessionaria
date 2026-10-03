"""
Sessão e login: revogação, rotação do refresh, bloqueio por tentativas, permissões.
Usa um Redis falso em memória (fakeredis) — em produção é o Redis real.
"""
import pytest
from fakeredis import aioredis as fake_aioredis

import app.core.redis as redis_mod
from tests.conftest import SENHA_TESTE

API = "/api/v1"


@pytest.fixture(autouse=True)
def redis_falso(monkeypatch):
    cliente = fake_aioredis.FakeRedis(decode_responses=True)

    async def _get():
        return cliente

    monkeypatch.setattr(redis_mod, "get_redis", _get)
    import app.application.services.auth_service as svc
    monkeypatch.setattr(svc, "get_redis", _get)
    return cliente


async def _login(client, email, senha=SENHA_TESTE):
    return await client.post(f"{API}/auth/login", json={"identifier": email, "senha": senha})


async def test_desativar_derruba_sessao_na_hora(client, admin, funcionario):
    assert (await client.get(f"{API}/users/me", headers=funcionario["headers"])).status_code == 200
    r = await client.put(f"{API}/users/{funcionario['user'].id}", json={"ativo": False}, headers=admin["headers"])
    assert r.status_code == 200, r.text
    assert (await client.get(f"{API}/users/me", headers=funcionario["headers"])).status_code == 401


async def test_trocar_a_propria_senha_funciona_e_derruba_outras_sessoes(client, funcionario):
    """Bug: /me/change-password caía na rota /{user_id}/change-password (só admin)."""
    outra_sessao = (await _login(client, funcionario["user"].email)).json()
    r = await client.post(f"{API}/users/me/change-password", headers=funcionario["headers"], json={
        "senha_atual": SENHA_TESTE, "nova_senha": "NovaSenha@2026", "confirmar_senha": "NovaSenha@2026",
    })
    assert r.status_code == 204, r.text
    h_antigo = {"Authorization": f"Bearer {outra_sessao['access_token']}"}
    assert (await client.get(f"{API}/users/me", headers=h_antigo)).status_code == 401
    r = await client.post(f"{API}/auth/refresh", json={"refresh_token": outra_sessao["refresh_token"]})
    assert r.status_code == 401
    assert (await _login(client, funcionario["user"].email, "NovaSenha@2026")).status_code == 200


async def test_senha_atual_errada_nao_desloga(client, funcionario):
    r = await client.post(f"{API}/users/me/change-password", headers=funcionario["headers"], json={
        "senha_atual": "errada", "nova_senha": "NovaSenha@2026", "confirmar_senha": "NovaSenha@2026",
    })
    assert r.status_code == 400


async def test_refresh_e_rotativo(client, admin):
    tokens = (await _login(client, admin["user"].email)).json()
    r1 = await client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r1.status_code == 200
    novo = r1.json()
    assert novo["refresh_token"] != tokens["refresh_token"]
    # O refresh já usado não vale de novo (roubado e reutilizado depois do dono)
    assert (await client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})).status_code == 401
    assert (await client.post(f"{API}/auth/refresh", json={"refresh_token": novo["refresh_token"]})).status_code == 200


async def test_logout_revoga_refresh(client, admin):
    tokens = (await _login(client, admin["user"].email)).json()
    await client.post(f"{API}/auth/logout", json={"refresh_token": tokens["refresh_token"]})
    assert (await client.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})).status_code == 401


async def test_bloqueio_nao_e_burlado_trocando_maiusculas(client, funcionario):
    email = funcionario["user"].email
    for i in range(5):
        variante = email.upper() if i % 2 else email
        await _login(client, variante, "errada")
    # Bloqueado: nem a senha certa entra agora (mesmo IP)
    assert (await _login(client, email)).status_code == 429


async def test_rebaixar_admin_vale_imediatamente(client, admin):
    from app.domain.models.user import UserRole
    from tests.conftest import _criar_usuario
    outro = await _criar_usuario(UserRole.ADMIN)
    h_outro = {"Authorization": f"Bearer {(await _login(client, outro.email)).json()['access_token']}"}
    assert (await client.get(f"{API}/users", headers=h_outro)).status_code == 200
    r = await client.patch(f"{API}/users/{outro.id}/role", params={"role": "funcionario"}, headers=admin["headers"])
    assert r.status_code == 200, r.text
    # Token emitido quando era admin deixou de valer
    assert (await client.get(f"{API}/users", headers=h_outro)).status_code == 401


async def test_funcionario_nao_ve_financeiro_nem_relatorios(client, funcionario):
    h = funcionario["headers"]
    assert (await client.get(f"{API}/financial", headers=h)).status_code == 403
    assert (await client.get(f"{API}/reports/clientes", headers=h)).status_code == 403
    assert (await client.get(f"{API}/reports/lucratividade", headers=h)).status_code == 403


async def test_formulario_publico_com_honeypot_e_descartado(client, admin):
    r = await client.post(f"{API}/public/leads", json={"nome": "Robô", "telefone": "1", "website": "http://spam"})
    assert r.status_code == 201
    leads = (await client.get(f"{API}/leads", headers=admin["headers"])).json()
    assert leads["total"] == 0
    r = await client.post(f"{API}/public/leads", json={"nome": "Maria", "telefone": "11999990000"})
    assert r.status_code == 201
    assert (await client.get(f"{API}/leads", headers=admin["headers"])).json()["total"] == 1


async def test_settings_publicos_nao_inventam_dados(client):
    s = (await client.get(f"{API}/public/settings")).json()
    assert s.get("whatsapp") in (None, "") and s.get("cnpj") in (None, "")
