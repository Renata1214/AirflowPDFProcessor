"""Scheduled pipeline: new PDFs become Markdown, metadata, a catalog, and a Discord note."""

import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from airflow.sdk import TriggerRule, dag, task
from src.pipeline import find_new_pdf_paths, process_one_pdf, rebuild_catalog


@dag(
    dag_id="paper_pipeline",
    description="Turn new research PDFs into a searchable study library",
    schedule="*/30 * * * *",
    start_date=datetime(2026, 11, 5),
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 1, "retry_delay": timedelta(minutes=5)},
    tags=["papers"],
)
def paper_pipeline():
    """Look for new PDFs, describe each one, then refresh the HTML catalog."""
    @task
    def find_new_pdfs() -> list[str]:
        return find_new_pdf_paths()

    @task(max_active_tis_per_dag=1)
    def process_pdf(pdf_path: str) -> str:
        return process_one_pdf(pdf_path)

    @task(trigger_rule=TriggerRule.ALL_DONE)
    def rebuild_html() -> str:
        return rebuild_catalog()

    found = find_new_pdfs()
    processed = process_pdf.expand(pdf_path=found)
    catalog = rebuild_html()
    processed >> catalog


paper_pipeline_dag = paper_pipeline()
