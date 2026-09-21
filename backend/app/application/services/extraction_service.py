from app.application.services.heading_detector import HeadingDetector
from app.application.services.page_metadata_detector import PageMetadataDetector
from app.application.services.section_builder import SectionBuilder
from app.application.services.text_line_builder import TextLineBuilder
from app.domain.models.extraction import ExtractionResult
from app.domain.ports.pdf_reader import PdfReader


class ExtractionService:
    def __init__(
        self,
        pdf_reader: PdfReader,
        text_line_builder: TextLineBuilder,
        page_metadata_detector: PageMetadataDetector,
        heading_detector: HeadingDetector,
        section_builder: SectionBuilder,
    ) -> None:
        self.pdf_reader = pdf_reader
        self.text_line_builder = text_line_builder
        self.page_metadata_detector = page_metadata_detector
        self.heading_detector = heading_detector
        self.section_builder = section_builder

    def extract(
        self,
        filename: str,
        content: bytes,
    ) -> ExtractionResult:
        document = self.pdf_reader.read(content)

        lines = self.text_line_builder.build(
            document.blocks
        )

        classified_lines = self.page_metadata_detector.classify(
            lines
        )

        detected_lines = self.heading_detector.detect(
            classified_lines
        )

        sections = self.section_builder.build(
            detected_lines
        )

        return ExtractionResult(
            filename=filename,
            sections=sections,
            page_count=document.page_count,
        )