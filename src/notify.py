import requests

from src.config import DISCORD_WEBHOOK_URL


def notify_new_paper(title: str, filename: str, category: str) -> None:
    """Post one message. The webhook URL is not included in errors or logs."""
    message = f"New paper processed: {title} ({category})\nFile: {filename}"
    try:
        response = requests.post(
            DISCORD_WEBHOOK_URL,
            json={"content": message},
            timeout=30,
        )
        response.raise_for_status()
    except requests.RequestException as error:
        status = getattr(getattr(error, "response", None), "status_code", None)
        detail = f" (HTTP {status})" if status else ""
        raise RuntimeError(f"Discord notification failed{detail}") from None
