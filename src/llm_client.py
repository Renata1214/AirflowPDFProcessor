import json
from openai import OpenAI
from src.config import OLLAMA_BASE_URL, OLLAMA_MODEL


def validate_metadata(data: dict) -> dict:
    if not isinstance(data, dict):
        raise ValueError("LLM response must be a JSON object")

    for field in ("title", "summary", "category"):
        if not isinstance(data.get(field), str):
            raise ValueError(f"Invalid or missing field: {field}")
        if not data[field].strip():
            raise ValueError(f"Empty field: {field}")

    keywords = data.get("keywords")
    if not isinstance(keywords, list):
        raise ValueError("Keywords must be a list")
    if not all(isinstance(keyword, str) for keyword in keywords):
        raise ValueError("Keywords must contain strings")

    return {
        "title": data["title"].strip(),
        "summary": data["summary"].strip(),
        "keywords": [keyword.strip() for keyword in keywords if keyword.strip()],
        "category": data["category"].strip(),
    }


def generate_metadata(markdown: str) -> dict:
    """Ask the local OpenAI-compatible server for paper metadata.
    JSON parsing and field checks run twice at most: the first response, then
    one retry when that response is not usable.
    """
    client = OpenAI(
        base_url=OLLAMA_BASE_URL,
        api_key="ollama",
        timeout=180.0,
    )

    prompt = f"""
        Extract metadata from the following research paper.
        Return only a JSON object containing exactly these fields:

        {{
            "title": "Paper title",
            "summary": "A short summary of the paper",
            "keywords": ["keyword one", "keyword two"],
            "category": "Research category"
        }}

        Requirements:
        - Use information from the document.
        - Provide a concise summary.
        - Return keywords as a list of strings.
        - Return valid JSON only.
        Paper:
        {markdown}
        """
    last_error: Exception | None = None
    for attempt in range(2):
        response = client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=
            [
                {
                    "role": "system",
                    "content": (
                        "You extract research paper metadata and return valid JSON."),
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        try:
            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty LLM response")
            return validate_metadata(json.loads(content))
        except (json.JSONDecodeError, ValueError) as error:
            last_error = error
            if attempt == 1:
                raise
                
    raise RuntimeError("Metadata generation failed") from last_error
