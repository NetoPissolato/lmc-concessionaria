"""convert carroceria and condicao columns to varchar

Revision ID: h2i3j4k5l6m7
Revises: g1h2i3j4k5l6
Create Date: 2026-08-12 00:23:00.000000

Motivo: SAEnum(PythonEnum) usa os NOMES do enum como valores no PostgreSQL (NOVO, SEMINOVO, USADO),
mas o server_default 'usado' e o código usavam os VALORES minúsculos (novo, seminovo, usado).
Isso causava LookupError ao tentar ler as linhas.
Solução: converter para VARCHAR simples, sem tipo nativo PostgreSQL enum.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h2i3j4k5l6m7'
down_revision = 'g1h2i3j4k5l6'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Remover o server_default que referencia o tipo enum
    op.execute("ALTER TABLE vehicles ALTER COLUMN condicao DROP DEFAULT")

    # 2. Converter carroceria de enum para VARCHAR
    op.execute("""
        ALTER TABLE vehicles
        ALTER COLUMN carroceria TYPE VARCHAR(30)
        USING carroceria::text
    """)

    # 3. Converter condicao de enum para VARCHAR
    op.execute("""
        ALTER TABLE vehicles
        ALTER COLUMN condicao TYPE VARCHAR(20)
        USING condicao::text
    """)

    # 4. Restaurar o default como string simples
    op.execute("ALTER TABLE vehicles ALTER COLUMN condicao SET DEFAULT 'usado'")

    # 5. Agora podemos dropar os tipos enum (sem dependências)
    op.execute("DROP TYPE IF EXISTS carroceria_type CASCADE")
    op.execute("DROP TYPE IF EXISTS condicao_type CASCADE")



def downgrade():
    # Recriar os tipos enum (sem os dados)
    op.execute("CREATE TYPE carroceria_type AS ENUM ('suv','hatch','sedan','picape','coupe','minivan','conversivel','perua','van')")
    op.execute("CREATE TYPE condicao_type AS ENUM ('novo','seminovo','usado')")

    op.execute("""
        ALTER TABLE vehicles
        ALTER COLUMN carroceria TYPE carroceria_type
        USING carroceria::carroceria_type
    """)
    op.execute("""
        ALTER TABLE vehicles
        ALTER COLUMN condicao TYPE condicao_type
        USING condicao::condicao_type
    """)
