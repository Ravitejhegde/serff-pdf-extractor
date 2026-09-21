from pathlib import Path

from app.infrastructure.pdf.pymupdf_reader import PyMuPDFReader
from app.application.services.text_line_builder import TextLineBuilder
from app.application.services.page_metadata_detector import PageMetadataDetector
from app.application.services.heading_detector import HeadingDetector


PDFS = [
    Path(r"C:\Users\hegde\Downloads\AMGN-135003565.pdf"),
    Path(r"C:\Users\hegde\Downloads\UNAM-135051123.pdf"),
    Path(r"C:\Users\hegde\Downloads\NYLM-134614243.pdf"),
]


reader = PyMuPDFReader()
builder = TextLineBuilder()
metadata_detector = PageMetadataDetector()
heading_detector = HeadingDetector()


for pdf in PDFS:
    print()
    print("=" * 70)
    print(pdf.name)
    print("=" * 70)

    document = reader.read(pdf.read_bytes())
    lines = builder.build(document.blocks)
    classified = metadata_detector.classify(lines)
    detected = heading_detector.detect(classified)

    headings = [item for item in detected if item.is_heading]

    print(f"Page count: {document.page_count}")
    print(f"Headings detected: {len(headings)}")
    print()

    for item in headings:
        print(
            f"P={item.line.page_number:>3} | "
            f"Size={item.line.font_size:>4.1f} | "
            f"{item.line.text}"
        )