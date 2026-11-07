import os
from pathlib import Path

from dotenv import load_dotenv

# This file lives in src/, so the parent of that folder is the project root.
PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(PROJECT_ROOT / ".env")


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value or not value.strip():
        raise ValueError(f"Missing required environment variable: {name}")
    return value.strip().strip('"').strip("'")


def resolve_path(value: str) -> Path:
    """Resolve a path from .env. Relative paths stay inside this project."""
    path = Path(value).expanduser()
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return path


PAPERS_DIR = resolve_path(get_required_env("PAPERS_DIR"))
OUTPUT_DIR = resolve_path(get_required_env("OUTPUT_DIR"))
DB_PATH = resolve_path(get_required_env("DB_PATH"))

OLLAMA_BASE_URL = get_required_env("OLLAMA_BASE_URL")
OLLAMA_MODEL = get_required_env("OLLAMA_MODEL")
DISCORD_WEBHOOK_URL = get_required_env("DISCORD_WEBHOOK_URL")
