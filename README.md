# Research library pipeline

A local Airflow pipeline that turns research PDFs into a small study library. The scheduled DAG is `paper_pipeline` in `dags/paper_pipeline.py`. Every 30 minutes it looks for new PDFs, converts each one, asks a local model for metadata, stores that metadata, refreshes `index.html`, and sends a Discord message.

## Prerequisites

Install these before the first run:

- **Python 3.14** in that virtualenv, with the packages in `requirements.txt` already installed. To recreate it: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`.
- **Apache Airflow 3**, started with `airflow standalone`. The UI is at [http://localhost:8080](http://localhost:8080).
- **Google Drive for Desktop**, signed in, with this layout on the synced drive:
  - `G:\My Drive\ResearchLibrary\papers`
  - `G:\My Drive\ResearchLibrary\output`
- **Ollama**, running locally, with the model named in `.env` pulled (`llama3.2:3b` by default).
- **A Discord server** where you are allowed to create webhooks.
```

### Discord webhook

The webhook URL is the only secret. Anyone who has it can post to that channel. Keep it in `.env`. That file is listed in `.gitignore`.

1. Open Discord and select the server.
2. Open **Server Settings → Integrations → Webhooks**.
3. Choose **New Webhook**, name it, and pick the channel that should receive the messages.
4. Choose **Copy Webhook URL**.
5. Paste the URL into `.env` as `DISCORD_WEBHOOK_URL`.


## Run

```bash
cd ./AirflowPDFProcessor
source venv/bin/activate
export AIRFLOW_HOME=$HOME/airflow
export AIRFLOW__CORE__DAGS_FOLDER=./AirflowPDFProcessor/dags
airflow standalone
```

In the Airflow UI, turn on **paper_pipeline** and trigger it. Put a text PDF in `ResearchLibrary/papers`. The next run writes the Markdown and `index.html` under `ResearchLibrary/output`, stores one row in `data/papers.db`, and posts to Discord. Open `index.html` in a browser and use the search box or the category list. A second run with no new PDF skips that file and does not send another message.
