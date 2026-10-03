"""
Dados da requisição atual acessíveis em qualquer camada (sem passar por parâmetro).

Usado pelo audit log para gravar IP e navegador de quem fez a ação, sem que cada
rota precise repassar o `Request`. O middleware em main.py preenche a cada requisição.
"""
from contextvars import ContextVar
from typing import Optional

ip_cliente: ContextVar[Optional[str]] = ContextVar("ip_cliente", default=None)
user_agent: ContextVar[Optional[str]] = ContextVar("user_agent", default=None)
