"""merge cargo branch with main

Revision ID: f5g6h7i8j9k0
Revises: c3d4e5f6a7b8, e4f5a6b7c8d9
Create Date: 2026-08-11

Junta o branch de cargo/data_contratacao com o head principal (analytics_settings).
"""
from alembic import op

revision = "f5g6h7i8j9k0"
down_revision = ("c3d4e5f6a7b8", "e4f5a6b7c8d9")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # no-op: apenas une os dois heads paralelos
    pass


def downgrade() -> None:
    pass
