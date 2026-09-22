from dataclasses import dataclass


@dataclass(frozen=True)
class KeyInformation:
    label: str
    value: str


@dataclass(frozen=True)
class SectionUnderstanding:
    heading: str
    overview: str
    key_information: tuple[KeyInformation, ...]
    important_points: tuple[str, ...]
    original_text: str