import json
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from src.config import DB_PATH


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path is not None else DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS papers (
            filename TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            keywords TEXT NOT NULL,
            category TEXT NOT NULL
        )
        """
    )


@contextmanager
def get_connection(db_path: Path | None = None) -> Iterator[sqlite3.Connection]:
    connection = connect(db_path)
    try:
        init_db(connection)
        yield connection
        connection.commit()
    finally:
        connection.close()


def known_filenames(connection: sqlite3.Connection) -> set[str]:
    rows = connection.execute("SELECT filename FROM papers").fetchall()
    return {row["filename"] for row in rows}


def insert_paper(
    connection: sqlite3.Connection,
    *,
    filename: str,
    title: str,
    summary: str,
    keywords: list[str],
    category: str,
) -> None:
    connection.execute(
        """
        INSERT INTO papers (filename, title, summary, keywords, category)
        VALUES (?, ?, ?, ?, ?)
        """,
        (filename, title, summary, json.dumps(keywords), category),
    )


def list_papers(connection: sqlite3.Connection) -> list[dict]:
    rows = connection.execute(
        """
        SELECT filename, title, summary, keywords, category
        FROM papers
        ORDER BY title COLLATE NOCASE
        """
    ).fetchall()
    papers = []
    for row in rows:
        papers.append(
            {
                "filename": row["filename"],
                "title": row["title"],
                "summary": row["summary"],
                "keywords": json.loads(row["keywords"]),
                "category": row["category"],
            }
        )
    return papers
