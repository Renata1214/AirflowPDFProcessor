"""Work the DAG performs. Kept outside the DAG file so each step can run on its own."""

import logging
from pathlib import Path

from src.catalog import write_catalog
from src.config import OUTPUT_DIR, PAPERS_DIR
from src.database import get_connection, insert_paper, known_filenames
from src.llm_client import generate_metadata
from src.notify import notify_new_paper

logger = logging.getLogger(__name__)


def list_new_pdfs(papers_dir: Path, known: set[str]) -> list[Path]:
    if not papers_dir.is_dir():
        raise FileNotFoundError(
            f"Papers folder not found: {papers_dir}. "
            "Sync Google Drive and create ResearchLibrary/papers."
        )
    return sorted(
        (
            path
            for path in papers_dir.iterdir()
            if path.is_file()
            and path.suffix.lower() == ".pdf"
            and path.name not in known
        ),
        key=lambda path: path.name.lower(),
    )


def find_new_pdf_paths() -> list[str]:
    with get_connection() as connection:
        known = known_filenames(connection)
    found = list_new_pdfs(PAPERS_DIR, known)
    logger.info("Found %s new PDF(s) in %s", len(found), PAPERS_DIR)
    return [str(path) for path in found]


def process_one_pdf(pdf_path: str) -> str:
    from PDFtoMarkdown import pdf_to_markdown

    path = Path(pdf_path)
    markdown = pdf_to_markdown(path)
    if not isinstance(markdown, str) or not markdown.strip():
        raise ValueError(f"No text extracted from {path.name}")

    if not OUTPUT_DIR.parent.is_dir():
        raise FileNotFoundError(
            f"Output folder is not available: {OUTPUT_DIR}. "
            "Sync Google Drive and create ResearchLibrary."
        )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    markdown_path = OUTPUT_DIR / f"{path.stem}.md"
    markdown_path.write_text(markdown, encoding="utf-8")
    logger.info("Wrote Markdown to %s", markdown_path)

    metadata = generate_metadata(markdown)

    with get_connection() as connection:
        already_stored = path.name in known_filenames(connection)
        if not already_stored:
            insert_paper(
                connection,
                filename=path.name,
                title=metadata["title"],
                summary=metadata["summary"],
                keywords=metadata["keywords"],
                category=metadata["category"],
            )
            logger.info("Stored metadata for %s", path.name)

    notify_new_paper(
        title=metadata["title"],
        filename=path.name,
        category=metadata["category"],
    )
    return path.name


def rebuild_catalog() -> str:
    path = write_catalog()
    logger.info("Wrote catalog %s", path)
    return str(path)
