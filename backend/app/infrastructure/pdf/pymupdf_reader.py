import pymupdf

from app.domain.ports.pdf_reader import PdfDocument, PdfReader, TextBlock


class PyMuPDFReader:
    def read(self, content: bytes) -> PdfDocument:
        document = pymupdf.open(stream=content, filetype="pdf")

        try:
            blocks: list[TextBlock] = []

            for page_number, page in enumerate(document, start=1):
                page_blocks = page.get_text("dict")["blocks"]

                for block in page_blocks:
                    if block.get("type") != 0:
                        continue

                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            text = span.get("text", "").strip()

                            if not text:
                                continue

                            font_name = span.get("font", "")
                            is_bold = "bold" in font_name.lower()

                            x0, y0, x1, y1 = span["bbox"]

                            blocks.append(
                                TextBlock(
                                    page_number=page_number,
                                    text=text,
                                    x0=x0,
                                    y0=y0,
                                    x1=x1,
                                    y1=y1,
                                    font_size=span.get("size", 0.0),
                                    font_name=font_name,
                                    is_bold=is_bold,
                                )
                            )

            return PdfDocument(
                page_count=document.page_count,
                blocks=tuple(blocks),
            )

        finally:
            document.close()


def create_pdf_reader() -> PdfReader:
    return PyMuPDFReader()