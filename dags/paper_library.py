from datetime import datetime, timedelta
from airflow.sdk import dag, task

@dag(
    dag_id="paper_library",
    description="Turn new research PDFs into a searchable local library",
    schedule="*/30 * * * *",
    start_date=datetime(2026, 11, 5),
    catchup=False,
    default_args={"retries": 1, "retry_delay": timedelta(minutes=5)},
)
def paper_library():
    @task
    def find_new_pdfs() -> list[str]:
        ...  # paths not already stored in papers.db

    @task
    def process_pdf(pdf_path: str) -> str:
        ...  # markdown, Ollama, insert, Discord
        return pdf_path

    @task
    def rebuild_html(processed: list[str]) -> None:
        ...  # rewrite papers/index.html from the full table

    found = find_new_pdfs()
    done = process_pdf.expand(pdf_path=found)
    rebuild_html(done)

paper_library()