import pymupdf4llm


def pdf_to_markdown(pdf_path) -> str:
    """Convert a PDF to Markdown with PyMuPDF4LLM."""
    markdown = pymupdf4llm.to_markdown(
        str(pdf_path),
        show_progress=False,
        write_images=False,
    )
    if isinstance(markdown, str):
        return markdown
    if isinstance(markdown, list):
        parts = []
        for item in markdown:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and "text" in item:
                parts.append(str(item["text"]))
            else:
                parts.append(str(item))
        return "\n\n".join(parts)
    return str(markdown)
