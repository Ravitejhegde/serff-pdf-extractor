from typing import Protocol


class AIClient(Protocol):
    def understand_section(
        self,
        heading: str,
        text: str,
    ) -> dict:
        ...