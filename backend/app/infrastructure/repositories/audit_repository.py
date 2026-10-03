from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.models.audit_log import AuditLog
from app.core import contexto


class AuditRepository:
    """
    Audit trail repository.
    Records are immutable — no update or delete operations.
    """
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        usuario_id: Optional[str],
        acao: str,
        entidade: str,
        entidade_id: Optional[str] = None,
        dados_antes: Optional[dict] = None,
        dados_depois: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        descricao: Optional[str] = None,
    ) -> AuditLog:
        entry = AuditLog(
            usuario_id=usuario_id,
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            dados_antes=dados_antes,
            dados_depois=dados_depois,
            # Sem IP explícito, usa o da requisição atual (preenchido pelo middleware)
            ip_address=ip_address or contexto.ip_cliente.get(),
            user_agent=(user_agent or contexto.user_agent.get() or "")[:500] or None,
            descricao=descricao,
            timestamp=datetime.now(timezone.utc),
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def get_by_entity(self, entidade: str, entidade_id: str, limit: int = 50):
        from sqlalchemy import select
        result = await self.db.execute(
            select(AuditLog)
            .where(
                AuditLog.entidade == entidade,
                AuditLog.entidade_id == entidade_id,
            )
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
