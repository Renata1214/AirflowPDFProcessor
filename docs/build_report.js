// Builds docs/Assignment3_Report.docx from the screenshots in docs/screenshots.
// Run from the project root: node docs/build_report.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle, LevelFormat,
  Footer, PageNumber, ExternalHyperlink,
} = require("docx");

const SHOTS = path.join(__dirname, "screenshots");
const OUT = path.join(__dirname, "Assignment3_Report.docx");
const REPO = "https://github.com/Renata1214/AirflowPDFProcessor";
const FONT = "Calibri";
const MONO = "Menlo";

const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120 }, ...opts, children: runs(text) });

// "**bold**" and "`code`" inline markup
function runs(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean).map((part) => {
    if (part.startsWith("**")) return new TextRun({ text: part.slice(2, -2), bold: true });
    if (part.startsWith("`")) return new TextRun({ text: part.slice(1, -1), font: MONO, size: 19 });
    return new TextRun(part);
  });
}

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const bullet = (text) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: runs(text) });
const step = (text) => new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 60 }, children: runs(text) });

function code(lines) {
  return lines.split("\n").map((line, i, all) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "F3F3F3", color: "auto" },
    spacing: { before: i === 0 ? 60 : 0, after: i === all.length - 1 ? 160 : 0 },
    indent: { left: 120, right: 120 },
    children: [new TextRun({ text: line || " ", font: MONO, size: 17 })],
  }));
}

let figureNo = 0;
function figure(file, caption, pxWidth, pxHeight) {
  figureNo += 1;
  const full = path.join(SHOTS, file);
  const label = `Figure ${figureNo}. ${caption}`;
  if (!fs.existsSync(full)) {
    return [p(`[Screenshot to add: ${caption}]`, { alignment: AlignmentType.CENTER }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: label, italics: true, size: 18 })] })];
  }
  const width = 600;
  const height = Math.round((pxHeight / pxWidth) * width);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true,
      children: [new ImageRun({ type: file.endsWith(".png") ? "png" : "jpg", data: fs.readFileSync(full),
        transformation: { width, height }, altText: { title: caption, description: caption, name: file } })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: label, italics: true, size: 18 })] }),
  ];
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
function table(widths, header, rows) {
  const cell = (text, w, head) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: head ? { type: ShadingType.CLEAR, fill: "E7EEF5", color: "auto" } : undefined,
    children: [new Paragraph({ children: head ? [new TextRun({ text, bold: true, size: 19 })] : runs(text).map((r) => r) })],
  });
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((t, i) => cell(t, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, widths[i], false)) })),
    ],
  });
}
const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const children = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Assignment 3: Workflows with Airflow")] }),
  p("INFO-H420 Process Modeling, Data Pipelines, and Responsible AI", { spacing: { after: 60 } }),
  p("Group members: [Name 1], [Name 2], [Name 3]", { spacing: { after: 60 } }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun("Code repository: "),
    new ExternalHyperlink({ link: REPO, children: [new TextRun({ text: REPO, style: "Hyperlink" })] })] }),
  p("Submitted: 9 November 2026", { spacing: { after: 240 } }),

  h1("1. Overview"),
  p("We built a small local pipeline that turns research PDFs into a searchable study library. A scheduled Apache Airflow 3 DAG looks for new PDFs in a Google Drive-synced folder, converts each one to Markdown, asks a locally served LLM (Llama 3.2 3B through Ollama's OpenAI-compatible API) for a title, summary, keywords and category as JSON, stores that metadata in a local SQLite database, rebuilds a static HTML catalogue with search and category filtering, and posts a Discord message for every new paper."),
  p("Everything runs on one laptop: Airflow in standalone mode, Ollama for the model, and SQLite for storage. Only the PDFs and the generated HTML live in synced folders; the database stays local, as the assignment requires."),

  h1("2. Architecture"),
  table([2300, 2600, 4126], ["Concern", "Tool", "Where in the code"], [
    ["Orchestration", "Apache Airflow 3.4 (`airflow standalone`)", "`dags/paper_pipeline.py`"],
    ["PDF to Markdown", "PyMuPDF4LLM 2.1", "`src/PDFtoMarkdown.py`"],
    ["Local LLM", "Ollama, `llama3.2:3b`, OpenAI-compatible `/v1` endpoint", "`src/llm_client.py` (Python `openai` client)"],
    ["Metadata storage", "Python `sqlite3`", "`src/database.py`, file `data/papers.db`"],
    ["Static HTML", "Single self-contained `index.html`", "`src/catalog.py`"],
    ["Notification", "Discord webhook via `requests`", "`src/notify.py`"],
    ["Configuration", "`.env` loaded with python-dotenv", "`src/config.py`"],
  ]),
  spacer(),
  p("The DAG file only wires tasks together. The work itself lives in `src/pipeline.py` (`find_new_pdf_paths`, `process_one_pdf`, `rebuild_catalog`), so each step can also be run and tested outside Airflow. Paths, the model name and the webhook URL come from `.env`, so the same code runs on any machine."),
  h2("Folder layout"),
  ...code(`Google Drive (synced from the laptop)
├── airflowpapers/              ← PAPERS_DIR: PDFs dropped here
└── airflowpapers_output/       ← OUTPUT_DIR: <paper>.md files and index.html

Local project (AirflowPDFProcessor/)
├── dags/paper_pipeline.py      ← the DAG
├── src/                        ← pipeline steps
├── data/papers.db              ← SQLite, not synced
└── .env                        ← paths, model, webhook (git-ignored)`),

  h1("3. Airflow DAG and task dependencies"),
  p("The DAG `paper_pipeline` is written with the TaskFlow API and has three tasks:"),
  ...code(`find_new_pdfs  →  process_pdf.expand(pdf_path=found)  →  rebuild_html

@dag(dag_id="paper_pipeline", schedule="*/5 * * * *",   # normally "*/30 * * * *"
     start_date=datetime(2026, 11, 5), catchup=False, max_active_runs=1,
     default_args={"retries": 1, "retry_delay": timedelta(minutes=5)})
def paper_pipeline():
    @task
    def find_new_pdfs() -> list[str]: ...
    @task(max_active_tis_per_dag=1)
    def process_pdf(pdf_path: str) -> str: ...
    @task(trigger_rule=TriggerRule.ALL_DONE)
    def rebuild_html() -> str: ...`),
  bullet("**find_new_pdfs** lists the PDFs in the papers folder whose filename is not yet in `papers.db` and returns their paths through XCom."),
  bullet("**process_pdf** uses dynamic task mapping (`.expand`): Airflow creates one task instance per new PDF, so each paper succeeds, fails and retries on its own and has its own log. `max_active_tis_per_dag=1` runs them one at a time, because a laptop-hosted Ollama serves one request at a time and parallel requests only queue up and time out."),
  bullet("**rebuild_html** depends on all mapped instances and uses `TriggerRule.ALL_DONE`, so the catalogue is rebuilt even when there are no new PDFs (the mapped task is then skipped) or when one paper failed."),
  bullet("`max_active_runs=1` stops two runs from processing the same PDF at once; `catchup=False` avoids replaying every missed interval since the start date; each task retries once after five minutes."),
  ...figure("02_graph.jpg", "Graph view of paper_pipeline: find_new_pdfs → process_pdf (mapped) → rebuild_html", 1384, 823),

  h1("4. PDF conversion and local LLM integration"),
  h2("PDF to Markdown"),
  p("`pymupdf4llm.to_markdown()` converts each PDF to Markdown, which is written next to the HTML as `<paper>.md`. Text-based PDFs convert without OCR; the RapidOCR warning in the logs only matters for scanned PDFs."),
  h2("Calling the LLM"),
  p("The `openai` Python package is pointed at Ollama's OpenAI-compatible endpoint (`http://127.0.0.1:11434/v1`). The request uses JSON mode (`response_format={\"type\": \"json_object\"}`) and a low temperature of 0.1. The prompt gives the exact JSON structure from the assignment and a fixed list of categories with a one-line description each."),
  p("The reply is parsed with `json.loads()` and checked: `title`, `summary` and `category` must be non-empty strings and `keywords` must be a list of strings. If parsing or the check fails, the request is retried once; a second failure fails the task, and Airflow's own task retry applies after that."),
  h2("Two problems we hit and how we solved them"),
  bullet("**Context window.** Ollama serves `llama3.2:3b` with a 4,096-token context, but a full paper is 20,000–45,000 tokens. Ollama silently drops the beginning of a prompt that is too long, which removed our instructions: the model then returned JSON without a `title` and each call took about three minutes. We now send only the first 8,000 characters (title, abstract and introduction), which is all the metadata needs. Each paper now takes 12–23 seconds."),
  bullet("**Category quality.** With a free-text category, the 3B model copied the example (\"Research category\") or answered \"Research\" for every paper, and sometimes prefixed titles with \"Paper title:\". A fixed list of seven categories with short descriptions, placed after the paper text, gave meaningful categories (Table 2)."),

  h1("5. SQLite storage, static HTML and Discord"),
  h2("SQLite"),
  p("One table holds one record per paper. `filename` is the primary key, which is also how the DAG decides what is new; keywords are stored as a JSON string."),
  ...code(`CREATE TABLE IF NOT EXISTS papers (
    filename TEXT PRIMARY KEY,
    title    TEXT NOT NULL,
    summary  TEXT NOT NULL,
    keywords TEXT NOT NULL,   -- JSON list, e.g. ["text-to-SQL", "LLM"]
    category TEXT NOT NULL
);`),
  h2("Static HTML"),
  p("`rebuild_html` reads the whole table and writes one self-contained `index.html` with the papers embedded as JSON. A few lines of JavaScript provide a search box over title, summary, keywords and filename, and a category drop-down built from the categories in the data. The page needs no server, so it opens straight from the synced folder."),
  h2("Discord"),
  p("After a paper is stored, `notify_new_paper()` posts \"New paper processed: <title> (<category>)\" with the filename to a Discord webhook. Errors are reported without the webhook URL so the secret never reaches the Airflow logs."),

  h1("6. Showing that the workflow runs correctly"),
  h2("Schedule change for the demonstration"),
  p("**The DAG normally runs every 30 minutes (`*/30 * * * *`). To record several scheduled runs for this report in a short time, we temporarily changed the schedule to every 5 minutes (`*/5 * * * *`).** The DAG file marks this with a comment; the 30-minute schedule should be restored after grading."),
  h2("Test scenario"),
  p("We started from an empty `papers` table and output folder, put 8 of our 10 test papers (2026 arXiv papers on databases and AI) in the papers folder, and turned the DAG on. All three runs below were started by the scheduler, not triggered by hand:"),
  table([1500, 1500, 1300, 4726], ["Scheduled run", "Duration", "New PDFs", "What happened"], [
    ["19:20", "2 min 34 s", "8", "8 mapped `process_pdf` instances ran one after another (12–23 s each); 8 rows stored, catalogue built, 8 Discord messages."],
    ["19:25", "5 s", "0", "No new PDFs: `process_pdf` was skipped, `rebuild_html` still ran. No duplicate rows, no Discord messages."],
    ["19:30", "51 s", "2", "We had added the 2 remaining PDFs (NousDB, Uber-Join) to the folder. Only these 2 were processed."],
  ]),
  p("Table 1. Scheduled runs during the demonstration.", { alignment: AlignmentType.CENTER }),
  ...figure("06_runs_three.jpg", "Three scheduled runs: 8 papers, then nothing new (process_pdf skipped, pink), then 2 new papers", 1384, 823),
  ...figure("04_mapped_process_pdf.jpg", "The 8 mapped process_pdf instances of the first run, all successful on the first try", 1384, 823),
  ...figure("05_task_log.png", "Log of one process_pdf instance: Markdown written, metadata stored", 1568, 266),
  table([4200, 4826], ["Paper (file)", "Category from the LLM"], [
    ["SQLoom_Text_to_SQL.pdf", "Text-to-SQL"],
    ["LLM_based_Data_Cleaning.pdf", "Data Cleaning and Integration"],
    ["Uber_Join_LLM_Table_Joins.pdf", "Data Cleaning and Integration"],
    ["GenDB_V_AI_Generated_Database_Systems.pdf", "Database Systems"],
    ["DiagDBench_Agentic_Database_Diagnosis.pdf", "Database Diagnosis (not in the list, see Section 8)"],
    ["GraphRAGProv_GraphRAG_Provenance.pdf", "Knowledge Graphs and RAG"],
    ["LLM_Augmented_Cardinality_Estimation.pdf", "Knowledge Graphs and RAG"],
    ["RT_J_Relational_Transformers.pdf", "Machine Learning for Data"],
    ["CascadeFilter_Semantic_Filtering.pdf", "Query Processing"],
    ["NousDB_Semantic_Analytics_Engine.pdf", "Query Processing"],
  ]),
  p("Table 2. Contents of the papers table after the three runs.", { alignment: AlignmentType.CENTER }),
  ...figure("07_html_all.jpg", "Generated index.html listing all 10 papers", 1384, 823),
  ...figure("08_html_search.jpg", "Search box: \"SQL\" narrows the list to 2 papers", 1384, 823),
  ...figure("09_html_category.jpg", "Category filter: \"Knowledge Graphs and RAG\"", 1384, 823),
  ...figure("10_discord.jpg", "Discord messages posted by the AirFlow webhook, one per processed paper (7:23 PM, first demo run). The messages above it come from an earlier test run, before the prompt fix, and show the old \"Paper title:\" prefix and \"Research\" categories", 1384, 767),
  ...figure("11_drive.jpg", "The papers folder synced to Google Drive (Computers → My MacBook Pro)", 1384, 767),
  ...figure("12_drive_output.jpg", "The output folder synced to Google Drive: one Markdown file per paper and index.html", 1384, 767),

  h1("7. How to run it"),
  p("Full instructions are in the repository README. In short:"),
  step("Install Ollama and pull the model: `ollama pull llama3.2:3b`."),
  step("Create a virtual environment and install the dependencies: `python -m venv venv`, `source venv/bin/activate`, `pip install -r requirements.txt`."),
  step("Copy `.env.example` to `.env` and set `PAPERS_DIR` and `OUTPUT_DIR` to the Google Drive-synced folders, plus `DISCORD_WEBHOOK_URL`."),
  step("Start Airflow from the project folder with an absolute DAGs path:"),
  ...code(`export AIRFLOW_HOME=$HOME/airflow
export AIRFLOW__CORE__DAGS_FOLDER=$PWD/dags
export AIRFLOW__CORE__LOAD_EXAMPLES=False
airflow standalone`),
  step("Open http://localhost:8080 (user `admin`, password in `$AIRFLOW_HOME/simple_auth_manager_passwords.json.generated`), turn on `paper_pipeline`, and drop PDFs in the papers folder."),

  h1("8. Limitations"),
  bullet("A 3B model is fast on a laptop but not perfectly reliable: one paper was given a category outside the list (\"Database Diagnosis\"). The page still filters on it correctly; a larger model or a validation-and-retry on the category would fix it."),
  bullet("Only the first 8,000 characters of each paper reach the model. This is enough for the title, abstract and introduction, but a summary of the full paper would need chunking or a model with a larger context."),
  bullet("A paper is identified by its filename, as the assignment allows: renaming a PDF makes it look new, and replacing a PDF under the same name is not picked up."),
  bullet("Scanned PDFs would need OCR (RapidOCR is not installed)."),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { font: FONT, size: 40, bold: true, color: "1F3864" }, paragraph: { spacing: { before: 0, after: 120 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 30, bold: true, color: "1F3864" }, paragraph: { spacing: { before: 320, after: 120 }, keepNext: true, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 24, bold: true, color: "2E5597" }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
