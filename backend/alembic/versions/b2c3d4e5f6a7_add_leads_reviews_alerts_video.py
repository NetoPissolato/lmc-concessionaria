"""add leads reviews availability_alerts video_url

Revision ID: b2c3d4e5f6a7
Revises: f1a2b3c4d5e6
Create Date: 2026-08-11 01:12:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'b2c3d4e5f6a7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ─── lead_status enum (IF NOT EXISTS via DO block) ───────────────────────
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE lead_status AS ENUM (
                'novo', 'em_atendimento', 'proposta', 'fechado', 'perdido'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """))

    # ─── leads table (IF NOT EXISTS) ─────────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS leads (
            id VARCHAR(36) PRIMARY KEY,
            nome VARCHAR(120) NOT NULL,
            telefone VARCHAR(30) NOT NULL,
            email VARCHAR(120),
            mensagem TEXT,
            veiculo_id VARCHAR(36) REFERENCES vehicles(id) ON DELETE SET NULL,
            veiculo_descricao VARCHAR(200),
            status lead_status NOT NULL DEFAULT 'novo',
            origem VARCHAR(50) NOT NULL DEFAULT 'contato',
            observacoes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))

    # ─── reviews table (IF NOT EXISTS) ───────────────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS reviews (
            id VARCHAR(36) PRIMARY KEY,
            nome VARCHAR(120) NOT NULL,
            nota INTEGER NOT NULL,
            texto TEXT NOT NULL,
            foto_url VARCHAR(500),
            cidade VARCHAR(100),
            aprovado BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))

    # ─── availability_alerts table (IF NOT EXISTS) ────────────────────────────
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS availability_alerts (
            id VARCHAR(36) PRIMARY KEY,
            email VARCHAR(120) NOT NULL,
            nome VARCHAR(120),
            marca VARCHAR(80),
            modelo VARCHAR(80),
            tipo VARCHAR(20),
            ano_min INTEGER,
            ano_max INTEGER,
            preco_max NUMERIC(12, 2),
            ativo BOOLEAN NOT NULL DEFAULT true,
            notificacoes_enviadas INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))

    # index
    conn.execute(sa.text("""
        CREATE INDEX IF NOT EXISTS ix_availability_alerts_email
        ON availability_alerts (email)
    """))

    # ─── video_url column on vehicles (IF NOT EXISTS) ────────────────────────
    conn.execute(sa.text("""
        DO $$ BEGIN
            ALTER TABLE vehicles ADD COLUMN video_url VARCHAR(500);
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE vehicles DROP COLUMN IF EXISTS video_url"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_availability_alerts_email"))
    conn.execute(sa.text("DROP TABLE IF EXISTS availability_alerts"))
    conn.execute(sa.text("DROP TABLE IF EXISTS reviews"))
    conn.execute(sa.text("DROP TABLE IF EXISTS leads"))
    conn.execute(sa.text("DROP TYPE IF EXISTS lead_status"))