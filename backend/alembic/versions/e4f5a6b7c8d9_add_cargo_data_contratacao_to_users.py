"""add cargo data_contratacao to users

Revision ID: e4f5a6b7c8d9
Revises: 7781b2330019
Create Date: 2026-08-11

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "7781b2330019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("cargo", sa.String(120), nullable=True))
    op.add_column("users", sa.Column("data_contratacao", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "data_contratacao")
    op.drop_column("users", "cargo")
