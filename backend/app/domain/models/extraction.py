from dataclasses import dataclass


@dataclass(frozen=True)
class Section:
    heading: str
    text: str


@dataclass(frozen=True)
class ExtractionResult:
    filename: str
    sections: tuple[Section, ...]
    page_count: int