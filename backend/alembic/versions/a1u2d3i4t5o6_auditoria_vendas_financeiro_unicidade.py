"""auditoria: estorno no caixa, venda ativa única, unicidade parcial, miniaturas, sessões

Revision ID: a1u2d3i4t5o6
Revises: i3j4k5l6m7n8
Create Date: 2026-10-03

O que muda e por quê:
1. financial_category ganha 'MULTA' (em maiúsculas, como o SQLAlchemy grava os nomes do
   enum). A migration 2fb5ae2c8ba5 tinha criado 'multa' minúsculo, que o código nunca usa:
   o "Pagar multas" do painel quebrava em bancos que nasceram por migration.
2. financial_entries.estorno_de_id: cancelar venda/apagar despesa gera estorno em vez de
   apagar o lançamento (histórico do caixa preservado).
3. Despesas de veículo lançadas como OUTROS_SAIDA por bug (str(enum) no Python 3.12) são
   recategorizadas pela categoria real da despesa.
4. Índice único parcial: um veículo só pode ter uma venda ativa (pendente ou concluída).
   Se o banco já tiver um veículo com duas vendas ativas, o índice NÃO é criado (o
   service continua barrando) e um aviso aparece no log da migration.
5. placa/chassi/CPF: únicos só entre registros ativos (e, para veículos, não vendidos).
6. vehicle_photos.thumb_url: miniatura para cards.
7. users.sessao_versao: trocar senha, desativar ou mudar papel derruba as sessões abertas.
8. Repara nomes estragados pela normalização antiga (INITCAP/capitalize): "T-cross" →
   "T-Cross", "Xei" → "XEi", "Ltz" → "LTZ", "Hr-v" → "HR-V", "Cg 160" → "CG 160".

Tudo idempotente (pode rodar de novo sem erro).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1u2d3i4t5o6"
down_revision: Union[str, None] = "i3j4k5l6m7n8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Valor de enum usado pelo código
    op.execute("ALTER TYPE financial_category ADD VALUE IF NOT EXISTS 'MULTA'")

    # 2. Estorno
    op.execute("ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS estorno_de_id VARCHAR(36)")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE financial_entries
                ADD CONSTRAINT financial_entries_estorno_de_id_fkey
                FOREIGN KEY (estorno_de_id) REFERENCES financial_entries(id);
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_financial_entries_estorno_de_id ON financial_entries (estorno_de_id)")

    # 3. Recategoriza despesas que caíram em OUTROS_SAIDA pelo bug do str(enum).
    # Só mexe em lançamentos ligados a uma despesa de veículo; os manuais ficam como estão.
    op.execute("""
        UPDATE financial_entries fe
        SET categoria = CASE ve.categoria::text
                WHEN 'MECANICA'      THEN 'MANUTENCAO'
                WHEN 'FUNILARIA'     THEN 'MANUTENCAO'
                WHEN 'PINTURA'       THEN 'MANUTENCAO'
                WHEN 'LAVAGEM'       THEN 'MANUTENCAO'
                WHEN 'PNEUS'         THEN 'MANUTENCAO'
                WHEN 'ELETRICA'      THEN 'MANUTENCAO'
                WHEN 'ACESSORIOS'    THEN 'MANUTENCAO'
                WHEN 'DOCUMENTACAO'  THEN 'DOCUMENTACAO'
                WHEN 'GUINCHO'       THEN 'GUINCHO'
                WHEN 'IPVA'          THEN 'IPVA'
                WHEN 'LICENCIAMENTO' THEN 'LICENCIAMENTO'
                WHEN 'COMISSAO'      THEN 'COMISSAO'
                ELSE 'OUTROS_SAIDA'
            END::financial_category
        FROM vehicle_expenses ve
        WHERE fe.expense_id = ve.id
          AND fe.categoria::text = 'OUTROS_SAIDA'
    """)

    # 4. Venda ativa única por veículo
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (
                SELECT vehicle_id FROM sales
                WHERE is_deleted = false AND status::text IN ('PENDENTE', 'CONCLUIDA')
                GROUP BY vehicle_id HAVING count(*) > 1
            ) THEN
                RAISE WARNING 'Há veículo com mais de uma venda ativa: índice uq_sales_veiculo_ativa NÃO criado. Corrija as vendas duplicadas e rode a migration de novo.';
            ELSE
                CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_veiculo_ativa ON sales (vehicle_id)
                    WHERE is_deleted = false AND status IN ('PENDENTE', 'CONCLUIDA');
            END IF;
        END $$;
    """)

    # 5. Unicidade parcial (troca o índice único global por um não único + um parcial único)
    op.execute("DROP INDEX IF EXISTS ix_vehicles_placa")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicles_placa ON vehicles (placa)")
    op.execute("""CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_placa_ativa ON vehicles (placa)
                  WHERE is_deleted = false AND status <> 'VENDIDO'""")
    op.execute("DROP INDEX IF EXISTS ix_vehicles_chassi")
    op.execute("CREATE INDEX IF NOT EXISTS ix_vehicles_chassi ON vehicles (chassi)")
    op.execute("""CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_chassi_ativo ON vehicles (chassi)
                  WHERE is_deleted = false AND status <> 'VENDIDO'""")
    op.execute("DROP INDEX IF EXISTS ix_customers_cpf_cnpj")
    op.execute("CREATE INDEX IF NOT EXISTS ix_customers_cpf_cnpj ON customers (cpf_cnpj)")
    op.execute("""CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_cpf_cnpj_ativo ON customers (cpf_cnpj)
                  WHERE is_deleted = false AND cpf_cnpj IS NOT NULL""")

    # 6. Miniaturas
    op.execute("ALTER TABLE vehicle_photos ADD COLUMN IF NOT EXISTS thumb_url VARCHAR(500)")

    # 7. Versão de sessão
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS sessao_versao INTEGER NOT NULL DEFAULT 0")

    # 8. Reparo dos nomes (mesma função usada no cadastro: o resultado bate com o que
    # um cadastro novo geraria, e rodar de novo não muda nada)
    from app.domain.normalizacao import normalizar_marca, normalizar_modelo
    conn = op.get_bind()
    for tabela, colunas in (("vehicles", ("marca", "modelo", "versao")), ("modelos_destaque", ("marca", "modelo"))):
        existe = conn.execute(sa.text("SELECT to_regclass(:t)"), {"t": tabela}).scalar()
        if not existe:
            continue
        linhas = conn.execute(sa.text(f"SELECT id, {', '.join(colunas)} FROM {tabela}")).mappings().all()
        for linha in linhas:
            novos = {}
            for col in colunas:
                atual = linha[col]
                corrigido = normalizar_marca(atual) if col == "marca" else normalizar_modelo(atual)
                if atual and corrigido != atual:
                    novos[col] = corrigido
            if novos:
                sets = ", ".join(f"{c} = :{c}" for c in novos)
                conn.execute(sa.text(f"UPDATE {tabela} SET {sets} WHERE id = :id"), {**novos, "id": linha["id"]})


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS sessao_versao")
    op.execute("ALTER TABLE vehicle_photos DROP COLUMN IF EXISTS thumb_url")
    op.execute("DROP INDEX IF EXISTS uq_customers_cpf_cnpj_ativo")
    op.execute("DROP INDEX IF EXISTS uq_vehicles_chassi_ativo")
    op.execute("DROP INDEX IF EXISTS uq_vehicles_placa_ativa")
    op.execute("DROP INDEX IF EXISTS uq_sales_veiculo_ativa")
    op.execute("ALTER TABLE financial_entries DROP CONSTRAINT IF EXISTS financial_entries_estorno_de_id_fkey")
    op.execute("DROP INDEX IF EXISTS ix_financial_entries_estorno_de_id")
    op.execute("ALTER TABLE financial_entries DROP COLUMN IF EXISTS estorno_de_id")
    # Os índices únicos globais antigos não são recriados: com veículos recomprados ou
    # registros excluídos eles falhariam. A recategorização das despesas também fica.
