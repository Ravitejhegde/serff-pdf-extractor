from dataclasses import dataclass

from app.application.services.text_line_builder import TextLine


@dataclass(frozen=True)
class ClassifiedLine:
    line: TextLine
    is_page_metadata: bool


class PageMetadataDetector:
    HEADER_Y_LIMIT = 90.0
    FOOTER_Y_LIMIT = 720.0

    HEADER_MARKERS = (
        "SERFF Tracking #:",
        "State Tracking #:",
        "Company Tracking #:",
        "State:",
        "Filing Company:",
        "TOI/Sub-TOI:",
        "Product Name:",
        "Project Name/Number:",
    )

    FOOTER_MARKERS = (
        "PDF Pipeline for SERFF Tracking Number",
    )

    def classify(
        self,
        lines: tuple[TextLine, ...],
    ) -> tuple[ClassifiedLine, ...]:
        return tuple(
            ClassifiedLine(
                line=line,
                is_page_metadata=self._is_metadata(line),
            )
            for line in lines
        )

    def _is_metadata(self, line: TextLine) -> bool:
        text = line.text.strip()

        if line.y0 <= self.HEADER_Y_LIMIT:
            if any(marker in text for marker in self.HEADER_MARKERS):
                return True

        if line.y0 >= self.FOOTER_Y_LIMIT:
            if any(marker in text for marker in self.FOOTER_MARKERS):
                return True

        return False