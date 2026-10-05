"""e-mails de usuário em minúsculas e limite de fotos alinhado com o painel

1. O login procura o e-mail em minúsculas, mas o cadastro gravava como foi digitado:
   quem foi cadastrado como "Joao@loja.com" nunca entrava pelo e-mail. O cadastro agora
   grava em minúsculas; aqui corrigimos os que já existem (pulando o caso raro de dois
   cadastros que só diferem na caixa — esses continuam entrando pelo nome de usuário).
2. O painel mostra "20 fotos por veículo", mas store_settings.max_fotos_veiculo nascia
   com 10 e não havia onde mudar: a 11ª foto falhava. Quem nunca mexeu (10) passa a 20.

Revision ID: b2v3e4r5i6f7
Revises: a1u2d3i4t5o6
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2v3e4r5i6f7"
down_revision: Union[str, None] = "a1u2d3i4t5o6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE users u SET email = lower(u.email)
        WHERE u.email <> lower(u.email)
          AND NOT EXISTS (SELECT 1 FROM users o WHERE o.id <> u.id AND o.email = lower(u.email))
    """)
    op.execute("UPDATE store_settings SET max_fotos_veiculo = 20 WHERE max_fotos_veiculo = 10")
    op.alter_column("store_settings", "max_fotos_veiculo", server_default="20")


def downgrade() -> None:
    op.alter_column("store_settings", "max_fotos_veiculo", server_default="10")
