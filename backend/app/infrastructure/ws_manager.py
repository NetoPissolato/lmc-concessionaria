"""
WebSocket Connection Manager — global singleton.
"""
import json
import logging
from typing import List
from fastapi import WebSocket

logger = logging.getLogger("lmc-ws")


class WebSocketManager:
    def __init__(self):
        self._connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info(f"WS connect — total: {len(self._connections)}")

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self._connections:
            self._connections.remove(ws)
        logger.info(f"WS disconnect — total: {len(self._connections)}")

    async def broadcast(self, event: str, data: dict | None = None) -> None:
        """Push an event to ALL connected browser tabs."""
        if not self._connections:
            return
        payload = json.dumps({"event": event, "data": data or {}})
        dead: List[WebSocket] = []
        for ws in self._connections[:]:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    @property
    def connection_count(self) -> int:
        return len(self._connections)


# Global singleton — imported by any service that needs to broadcast
ws_manager = WebSocketManager()
