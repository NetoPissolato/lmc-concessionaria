"""
Datas no fuso da loja.

O servidor roda em UTC. Sem isto, "hoje" vira amanhã depois das 21h em São Paulo e
vendas do fim do dia caem no dia (ou no mês) seguinte nos relatórios.
"""
from datetime import date, datetime
from zoneinfo import ZoneInfo

FUSO_LOJA = ZoneInfo("America/Sao_Paulo")


def agora_loja() -> datetime:
    return datetime.now(FUSO_LOJA)


def hoje_loja() -> date:
    return agora_loja().date()
