"""
WebSocket endpoint — /ws

Authentication: JWT token passed as query param ?token=...
(WebSocket protocol doesn't support custom headers, so token goes in URL)

Events pushed to all clients:
  sale_created    → new sale registered
  sale_updated    → status changed (concluida / cancelada)
  vehicle_updated → vehicle status/data changed
  financial_entry → manual financial entry added
  customer_updated→ customer data changed
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import JWTError

from app.core.security import decode_token
from app.infrastructure.ws_manager import ws_manager

logger = logging.getLogger("lmc-ws")

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    ws: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """Real-time WebSocket connection. Requires valid JWT via ?token=<access_token>."""
    # Validate token before accepting connection
    try:
        payload = decode_token(token)
        user_id = payload.get("sub", "unknown")
    except JWTError:
        await ws.close(code=4001)
        return

    await ws_manager.connect(ws)
    logger.info(f"WS authenticated: user {user_id}")

    try:
        while True:
            # Keep-alive: client sends "ping", server replies "pong"
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)
        logger.info(f"WS disconnected: user {user_id}")
    except Exception as e:
        logger.warning(f"WS error for user {user_id}: {e}")
        ws_manager.disconnect(ws)
