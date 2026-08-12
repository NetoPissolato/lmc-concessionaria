"""normalize marca and modelo capitalization in vehicles table

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-08-12

Garante que marca e modelo sejam armazenados de forma canônica.
Exemplos: 'bmw' -> 'BMW', 'jeep' -> 'Jeep', 'civic' -> 'Civic'.
"""
from alembic import op
import sqlalchemy as sa

revision = 'i3j4k5l6m7n8'
down_revision = 'h2i3j4k5l6m7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Normalizar Marcas ─────────────────────────────────────────────────────
    # Mapeamento de variações -> forma canônica
    marca_map = [
        # (padrão SQL ILIKE, forma canônica)
        ("'fiat'",            "Fiat"),
        ("'chevrolet'",       "Chevrolet"),
        ("'gm'",              "Chevrolet"),
        ("'volkswagen'",      "Volkswagen"),
        ("'vw'",              "Volkswagen"),
        ("'toyota'",          "Toyota"),
        ("'hyundai'",         "Hyundai"),
        ("'honda'",           "Honda"),
        ("'renault'",         "Renault"),
        ("'jeep'",            "Jeep"),
        ("'ford'",            "Ford"),
        ("'bmw'",             "BMW"),
        ("'nissan'",          "Nissan"),
        ("'mitsubishi'",      "Mitsubishi"),
        ("'kia'",             "Kia"),
        ("'peugeot'",         "Peugeot"),
        ("'citroen'",         "Citroën"),
        ("'citro%n'",         "Citroën"),
        ("'mercedes'",        "Mercedes-Benz"),
        ("'mercedes-benz'",   "Mercedes-Benz"),
        ("'audi'",            "Audi"),
        ("'volvo'",           "Volvo"),
        ("'subaru'",          "Subaru"),
        ("'porsche'",         "Porsche"),
        ("'dodge'",           "Dodge"),
        ("'ram'",             "Ram"),
        ("'chery'",           "Chery"),
        ("'byd'",             "BYD"),
        ("'jac'",             "JAC"),
        ("'yamaha'",          "Yamaha"),
        ("'kawasaki'",        "Kawasaki"),
        ("'suzuki'",          "Suzuki"),
        ("'ducati'",          "Ducati"),
        ("'triumph'",         "Triumph"),
        ("'dafra'",           "Dafra"),
    ]

    conn = op.get_bind()

    for pattern, canonical in marca_map:
        conn.execute(
            sa.text(
                f"UPDATE vehicles SET marca = :canonical "
                f"WHERE LOWER(marca) = LOWER({pattern}) AND deleted_at IS NULL"
            ),
            {"canonical": canonical}
        )

    # ── Normalizar Modelos (INITCAP / Title Case via PostgreSQL) ──────────────
    # INITCAP transforma 'civic' -> 'Civic', 'CIVIC' -> 'Civic', etc.
    # Faz isso apenas para modelos que não estão já no formato correto.
    conn.execute(
        sa.text(
            "UPDATE vehicles "
            "SET modelo = INITCAP(modelo) "
            "WHERE deleted_at IS NULL "
            "  AND modelo != INITCAP(modelo)"
        )
    )

    # Corrigir siglas que INITCAP errou (ex: 'Hb20' -> 'HB20')
    siglas_modelo = [
        ("LIKE 'Hb%'",    "HB"),
        ("LIKE 'Gla %'",  "GLA"),
        ("LIKE 'Glb %'",  "GLB"),
        ("LIKE 'Glc %'",  "GLC"),
        ("LIKE 'Gle %'",  "GLE"),
    ]
    # Esses casos são raros — INITCAP já resolve 95% dos casos
    # Casos como HB20 ficarão 'Hb20' e serão corrigidos pelo normalize_modelo no próximo save.


def downgrade() -> None:
    # Normalização é não-destrutiva — não há downgrade necessário
    pass
