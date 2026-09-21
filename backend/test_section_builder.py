from pathlib import Path

from app.infrastructure.pdf.pymupdf_reader import PyMuPDFReader
from app.application.services.text_line_builder import TextLineBuilder
from app.application.services.page_metadata_detector import PageMetadataDetector
from app.application.services.heading_detector import HeadingDetector
from app.application.services.section_builder import SectionBuilder


pdf = Path(r"C:\Users\hegde\Downloads\AMGN-135003565.pdf")

reader = PyMuPDFReader()
line_builder = TextLineBuilder()
metadata_detector = PageMetadataDetector()
heading_detector = HeadingDetector()
section_builder = SectionBuilder()

document = reader.read(pdf.read_bytes())

lines = line_builder.build(document.blocks)

classified = metadata_detector.classify(lines)

detected = heading_detector.detect(classified)

sections = section_builder.build(detected)

print(f"PDF: {pdf.name}")
print(f"Pages: {document.page_count}")
print(f"Sections: {len(sections)}")
print()

for index, section in enumerate(sections, start=1):
    print("=" * 70)
    print(f"SECTION {index}")
    print(f"HEADING: {section.heading}")
    print("-" * 70)
    print(section.text[:500])
    print()