from dataclasses import dataclass

from app.domain.ports.pdf_reader import TextBlock


@dataclass(frozen=True)
class TextLine:
    page_number: int
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    font_size: float
    is_bold: bool


class TextLineBuilder:
    Y_TOLERANCE = 2.0
    WORD_GAP_THRESHOLD = 3.0
    COLUMN_GAP_THRESHOLD = 80.0

    def build(
        self,
        blocks: tuple[TextBlock, ...],
    ) -> tuple[TextLine, ...]:
        lines: list[TextLine] = []

        current: list[TextBlock] = []
        current_page: int | None = None
        current_y: float | None = None

        for block in blocks:
            same_line = (
                bool(current)
                and block.page_number == current_page
                and current_y is not None
                and abs(block.y0 - current_y) <= self.Y_TOLERANCE
                and self._belongs_to_same_line(block, current)
            )

            if current and not same_line:
                lines.append(self._merge(current))
                current = []

            if not current:
                current_page = block.page_number
                current_y = block.y0

            current.append(block)

        if current:
            lines.append(self._merge(current))

        return tuple(lines)

    def _belongs_to_same_line(
        self,
        block: TextBlock,
        current: list[TextBlock],
    ) -> bool:
        current_x1 = max(
            item.x1
            for item in current
        )

        gap = block.x0 - current_x1

        return gap <= self.COLUMN_GAP_THRESHOLD

    def _merge(
        self,
        blocks: list[TextBlock],
    ) -> TextLine:
        blocks = sorted(
            blocks,
            key=lambda block: block.x0,
        )

        text_parts: list[str] = []

        for index, block in enumerate(blocks):
            if index == 0:
                text_parts.append(block.text)
                continue

            previous = blocks[index - 1]

            gap = block.x0 - previous.x1

            if gap > self.WORD_GAP_THRESHOLD:
                text_parts.append(" ")

            text_parts.append(block.text)

        return TextLine(
            page_number=blocks[0].page_number,
            text="".join(text_parts),
            x0=min(block.x0 for block in blocks),
            y0=min(block.y0 for block in blocks),
            x1=max(block.x1 for block in blocks),
            y1=max(block.y1 for block in blocks),
            font_size=max(
                block.font_size
                for block in blocks
            ),
            is_bold=any(
                block.is_bold
                for block in blocks
            ),
        )