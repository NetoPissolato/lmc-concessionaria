"""
StoreSettings — modelo de configurações da loja.
Tabela com linha única (singleton pattern).
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from app.core.database import Base


class StoreSettings(Base):
    __tablename__ = "store_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Contato
    whatsapp        = Column(String(20),  nullable=False, default="")
    telefone        = Column(String(20),  nullable=False, default="")
    email_contato   = Column(String(120), nullable=False, default="")

    # Redes sociais
    instagram       = Column(String(200), nullable=False, default="")
    facebook        = Column(String(200), nullable=False, default="")
    youtube         = Column(String(200), nullable=False, default="")

    # Dados da loja
    nome_loja       = Column(String(100), nullable=False, default="LMC Veículos")
    slogan          = Column(String(200), nullable=False, default="Seu próximo veículo está aqui")
    endereco        = Column(String(200), nullable=False, default="")
    cidade          = Column(String(100), nullable=False, default="")
    estado          = Column(String(2),   nullable=False, default="")
    cep             = Column(String(10),  nullable=False, default="")
    cnpj            = Column(String(20),  nullable=False, default="")
    horario         = Column(Text,        nullable=False, default="Seg–Sex: 8h–18h | Sáb: 8h–13h")

    # Site público
    hero_titulo     = Column(String(200), nullable=False, default="Encontre seu próximo veículo")
    hero_subtitulo  = Column(String(300), nullable=False, default="Carros e motos selecionados com qualidade e transparência")

    # Estatísticas
    stat_clientes   = Column(Integer, nullable=False, default=0)
    stat_anos       = Column(Integer, nullable=False, default=0)
    stat_satisfacao = Column(Integer, nullable=False, default=98)

    # Sistema
    max_fotos_veiculo = Column(Integer, nullable=False, default=10)
    modo_manutencao   = Column(Boolean, nullable=False, default=False)

    # Analytics
    ga_id             = Column(String(50),  nullable=True, default="")   # Google Analytics 4 (G-XXXXXXXXXX)
    pixel_id          = Column(String(50),  nullable=True, default="")   # Meta Pixel ID

    # Auditoria
    updated_at = Column(DateTime(timezone=True), nullable=True)
