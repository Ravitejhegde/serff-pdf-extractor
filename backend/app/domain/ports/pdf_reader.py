from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class TextBlock:
    page_number: int
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    font_size: float
    font_name: str
    is_bold: bool


@dataclass(frozen=True)
class PdfDocument:
    page_count: int
    blocks: tuple[TextBlock, ...]


class PdfReader(Protocol):
    def read(self, content: bytes) -> PdfDocument:
        ...