"""add ga_id pixel_id to store_settings

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-11 01:36:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # IF NOT EXISTS via DO block para evitar erro se coluna ja existe
    conn.execute(sa.text("""
        DO $$ BEGIN
            ALTER TABLE store_settings ADD COLUMN ga_id VARCHAR(50) DEFAULT '';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """))
    conn.execute(sa.text("""
        DO $$ BEGIN
            ALTER TABLE store_settings ADD COLUMN pixel_id VARCHAR(50) DEFAULT '';
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE store_settings DROP COLUMN IF EXISTS ga_id"))
    conn.execute(sa.text("ALTER TABLE store_settings DROP COLUMN IF EXISTS pixel_id"))
