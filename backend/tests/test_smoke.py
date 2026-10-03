async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200


async def test_login_admin_e_me(client, admin):
    r = await client.get("/api/v1/users/me", headers=admin["headers"])
    assert r.status_code == 200, r.text
