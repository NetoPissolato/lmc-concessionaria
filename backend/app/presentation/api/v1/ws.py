"""
WebSocket endpoint — /ws

Autenticação: o cliente abre a conexão e manda como PRIMEIRA mensagem
    {"type": "auth", "token": "<access token>"}
em até 10 segundos. (Antes o token ia na URL, ?token=..., e ficava gravado no log
de acesso do nginx e no histórico do navegador.)

Eventos enviados a todos os clientes:
  sale_created, sale_updated, vehicle_updated, financial_entry, customer_updated
"""
import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.domain.models.user import User
from app.infrastructure.ws_manager import ws_manager

logger = logging.getLogger("lmc-ws")

router = APIRouter(tags=["WebSocket"])


async def _usuario_valido(token: str) -> str | None:
    try:
        payload = decode_token(token)
    except JWTError:
        return None
    if payload.get("type") != "access":  # refresh token não abre WebSocket
        return None
    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            select(User.ativo, User.is_deleted, User.sessao_versao).where(User.id == payload.get("sub"))
        )).one_or_none()
    if not row or not row.ativo or row.is_deleted or int(payload.get("sv", 0)) != (row.sessao_versao or 0):
        return None
    return payload.get("sub")


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        primeira = await asyncio.wait_for(ws.receive_text(), timeout=10)
        dados = json.loads(primeira)
        user_id = await _usuario_valido(dados.get("token", "")) if dados.get("type") == "auth" else None
    except (asyncio.TimeoutError, ValueError, AttributeError, WebSocketDisconnect):
        user_id = None
    if not user_id:
        await ws.close(code=4001)
        return

    ws_manager.register(ws)
    await ws.send_text(json.dumps({"event": "auth_ok", "data": {}}))
    logger.info("WS autenticado: usuário %s", user_id)

    try:
        while True:
            # Keep-alive: o cliente manda "ping", o servidor responde "pong"
            if await ws.receive_text() == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning("WS erro (usuário %s): %s", user_id, e)
    finally:
        ws_manager.disconnect(ws)
