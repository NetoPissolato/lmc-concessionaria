"""add_store_settings_table

Revision ID: f1a2b3c4d5e6
Revises: d322666bfcd5
Create Date: 2026-08-10

"""
from alembic import op
import sqlalchemy as sa

revision = "f1a2b3c4d5e6"
down_revision = "d322666bfcd5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "store_settings",
        sa.Column("id",              sa.String(),   nullable=False),
        # Contato
        sa.Column("whatsapp",        sa.String(20),  nullable=False, server_default=""),
        sa.Column("telefone",        sa.String(20),  nullable=False, server_default=""),
        sa.Column("email_contato",   sa.String(120), nullable=False, server_default=""),
        # Redes sociais
        sa.Column("instagram",       sa.String(200), nullable=False, server_default=""),
        sa.Column("facebook",        sa.String(200), nullable=False, server_default=""),
        sa.Column("youtube",         sa.String(200), nullable=False, server_default=""),
        # Dados da loja
        sa.Column("nome_loja",       sa.String(100), nullable=False, server_default="LMC Veículos"),
        sa.Column("slogan",          sa.String(200), nullable=False, server_default="Seu próximo veículo está aqui"),
        sa.Column("endereco",        sa.String(200), nullable=False, server_default=""),
        sa.Column("cidade",          sa.String(100), nullable=False, server_default=""),
        sa.Column("estado",          sa.String(2),   nullable=False, server_default=""),
        sa.Column("cep",             sa.String(10),  nullable=False, server_default=""),
        sa.Column("cnpj",            sa.String(20),  nullable=False, server_default=""),
        sa.Column("horario",         sa.Text(),      nullable=False, server_default="Seg-Sex: 8h-18h | Sab: 8h-13h"),
        # Site
        sa.Column("hero_titulo",     sa.String(200), nullable=False, server_default="Encontre seu próximo veículo"),
        sa.Column("hero_subtitulo",  sa.String(300), nullable=False, server_default="Carros e motos selecionados com qualidade e transparência"),
        # Stats
        sa.Column("stat_clientes",   sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("stat_anos",       sa.Integer(),   nullable=False, server_default="0"),
        sa.Column("stat_satisfacao", sa.Integer(),   nullable=False, server_default="98"),
        # Sistema
        sa.Column("max_fotos_veiculo", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("modo_manutencao",   sa.Boolean(), nullable=False, server_default="false"),
        # Auditoria
        sa.Column("updated_at",  sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Insere a linha singleton com valores padrão
    op.execute("""
        INSERT INTO store_settings (id, updated_at)
        VALUES (gen_random_uuid()::text, NULL)
    """)


def downgrade() -> None:
    op.drop_table("store_settings")
