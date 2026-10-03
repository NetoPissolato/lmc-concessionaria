"""Mantido por compatibilidade com instruções antigas: use scripts/instalar_banco.py."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).with_name("instalar_banco.py")), run_name="__main__")
