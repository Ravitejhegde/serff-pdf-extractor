from dataclasses import dataclass

from app.application.services.page_metadata_detector import ClassifiedLine
from app.application.services.text_line_builder import TextLine


@dataclass(frozen=True)
class HeadingCandidate:
    line: TextLine
    is_heading: bool
    is_page_metadata: bool


class HeadingDetector:
    MIN_HEADING_FONT_SIZE = 12.0

    ERROR_MARKERS = (
        "could not be reproduced",
        "pdf header signature not found",
        "following reason:",
    )

    def detect(
        self,
        lines: tuple[ClassifiedLine, ...],
    ) -> tuple[HeadingCandidate, ...]:
        return tuple(
            HeadingCandidate(
                line=item.line,
                is_heading=self._is_heading(item),
                is_page_metadata=item.is_page_metadata,
            )
            for item in lines
        )

    def _is_heading(self, item: ClassifiedLine) -> bool:
        line = item.line
        text = line.text.strip()

        if item.is_page_metadata:
            return False

        if line.font_size < self.MIN_HEADING_FONT_SIZE:
            return False

        if not line.is_bold:
            return False

        if self._looks_like_error_message(text):
            return False

        return True

    def _looks_like_error_message(self, text: str) -> bool:
        normalized = text.lower()

        return any(
            marker in normalized
            for marker in self.ERROR_MARKERS
        )