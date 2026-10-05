from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    APP_NAME: str = "LMC Veículos ERP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    # O access token é curto; o painel renova sozinho com o refresh (rotativo). Quem usa
    # o sistema todo dia não percebe; quem tem o token roubado perde o acesso rápido.
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Security
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 15
    # Por usuário logado (ou por IP, se anônimo). Uma tela do painel faz 5–10 chamadas e quem
    # navega rápido passa de 60/min sozinho; o nginx segura abuso antes (30 req/s por IP).
    RATE_LIMIT_PER_MINUTE: int = 300
    RATE_LIMIT_ENABLED: bool = True

    # Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_UPLOAD_EXTENSIONS: str = "pdf,jpg,jpeg,png,webp"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "LMC Veículos <noreply@lmcveiculos.com>"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_UPLOAD_EXTENSIONS.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @field_validator("JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def limitar_access_token(cls, v: int) -> int:
        # O .env de produção chegou a ter ~1 ano aqui: token vazado valia um ano e
        # funcionário demitido continuava logado. Teto de 2h, venha o que vier no .env.
        return max(5, min(v, 120))

    @field_validator("JWT_REFRESH_TOKEN_EXPIRE_DAYS")
    @classmethod
    def limitar_refresh_token(cls, v: int) -> int:
        return max(1, min(v, 60))

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
