import json
from pathlib import Path
from src.config import OUTPUT_DIR
from src.database import get_connection, list_papers


def write_catalog(
    papers: list[dict] | None = None,
    output_dir: Path | None = None,
) -> Path:
    """Write output/index.html from the papers table, or from an explicit list."""
    if papers is None:
        with get_connection() as connection:
            papers = list_papers(connection)

    destination = Path(output_dir) if output_dir is not None else OUTPUT_DIR
    destination.mkdir(parents=True, exist_ok=True)

    # Keep "<" out of the embedded JSON so a summary cannot close the script tag.
    payload = json.dumps(papers, ensure_ascii=False).replace("<", "\\u003c")
    page = _PAGE.replace("/*__PAPERS__*/", payload)
    path = destination / "index.html"
    path.write_text(page, encoding="utf-8")
    return path


_PAGE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Research library</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f4f1ea;
      --ink: #1c1915;
      --muted: #5c564c;
      --card: #fffdf8;
      --line: #ddd6c8;
      --accent: #1f4d3a;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #171512;
        --ink: #f3efe6;
        --muted: #b7b0a4;
        --card: #221f1b;
        --line: #3a342c;
        --accent: #8fceb0;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.5 Georgia, "Iowan Old Style", serif;
      background: var(--bg);
      color: var(--ink);
    }
    main { max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
    h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 0.25rem; }
    .lede { color: var(--muted); margin: 0 0 1.5rem; }
    .filters { display: grid; gap: 0.75rem; margin-bottom: 1rem; }
    @media (min-width: 40rem) {
      .filters { grid-template-columns: 1fr 14rem; }
    }
    label { display: grid; gap: 0.25rem; font-size: 0.85rem; color: var(--muted); }
    input, select {
      font: inherit;
      color: inherit;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 0.4rem;
      padding: 0.55rem 0.7rem;
    }
    #count { color: var(--muted); margin: 0 0 1rem; }
    article {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 0.6rem;
      padding: 1rem 1.1rem;
      margin: 0 0 0.75rem;
    }
    article h2 { font-size: 1.25rem; margin: 0 0 0.35rem; }
    .meta { color: var(--accent); font-size: 0.9rem; margin: 0 0 0.5rem; }
    .file { color: var(--muted); font-size: 0.85rem; margin: 0.6rem 0 0; }
    #empty { display: none; color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>Research library</h1>
    <p class="lede">Papers processed from the synced folder.</p>
    <div class="filters">
      <label>Search
        <input id="search" type="search" placeholder="Title, summary, or keyword">
      </label>
      <label>Category
        <select id="category">
          <option value="">All categories</option>
        </select>
      </label>
    </div>
    <p id="count"></p>
    <div id="list"></div>
    <p id="empty">No papers match.</p>
  </main>
  <script id="papers-data" type="application/json">/*__PAPERS__*/</script>
  <script>
    const papers = JSON.parse(document.getElementById("papers-data").textContent);
    const searchInput = document.getElementById("search");
    const categoryInput = document.getElementById("category");
    const list = document.getElementById("list");
    const count = document.getElementById("count");
    const empty = document.getElementById("empty");

    const categories = [...new Set(papers.map((paper) => paper.category))].sort();
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryInput.appendChild(option);
    }

    function matches(paper) {
      const query = searchInput.value.trim().toLowerCase();
      const category = categoryInput.value;
      const haystack = [paper.title, paper.summary, paper.filename, ...(paper.keywords || [])]
        .join(" ")
        .toLowerCase();
      const queryOk = !query || haystack.includes(query);
      const categoryOk = !category || paper.category === category;
      return queryOk && categoryOk;
    }

    function render() {
      const shown = papers.filter(matches);
      list.replaceChildren();
      for (const paper of shown) {
        const card = document.createElement("article");
        const title = document.createElement("h2");
        title.textContent = paper.title;
        const meta = document.createElement("p");
        meta.className = "meta";
        const keywords = (paper.keywords || []).join(", ");
        meta.textContent = keywords ? paper.category + " · " + keywords : paper.category;
        const summary = document.createElement("p");
        summary.textContent = paper.summary;
        const file = document.createElement("p");
        file.className = "file";
        file.textContent = paper.filename;
        card.append(title, meta, summary, file);
        list.appendChild(card);
      }
      const noun = shown.length === 1 ? "paper" : "papers";
      count.textContent = shown.length + " " + noun;
      empty.style.display = shown.length ? "none" : "block";
    }

    searchInput.addEventListener("input", render);
    categoryInput.addEventListener("change", render);
    render();
  </script>
</body>
</html>
"""
