"""merge_branch_heads

Revision ID: e0merge0heads0
Revises: a1b2c3d4e5f6, d2cd6e0e01ec
Create Date: 2026-08-10

Junta os dois heads paralelos existentes antes de adicionar store_settings.
"""
from alembic import op

revision = "e0merge0heads0"
down_revision = ("a1b2c3d4e5f6", "d2cd6e0e01ec")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # no-op: apenas junta os branches
    pass


def downgrade() -> None:
    pass
