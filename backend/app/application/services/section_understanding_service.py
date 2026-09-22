from app.domain.models.understanding import (
    KeyInformation,
    SectionUnderstanding,
)
from app.domain.ports.ai_client import AIClient


class SectionUnderstandingService:
    def __init__(
        self,
        ai_client: AIClient,
    ) -> None:
        self.ai_client = ai_client

    def understand(
        self,
        heading: str,
        text: str,
    ) -> SectionUnderstanding:

        if not heading.strip():
            raise ValueError(
                "Section heading is required."
            )

        if not text.strip():
            return SectionUnderstanding(
                heading=heading,
                overview=(
                    "No extracted text is available "
                    "for this section."
                ),
                key_information=(),
                important_points=(),
                original_text=text,
            )

        result = self.ai_client.understand_section(
            heading=heading,
            text=text,
        )

        key_information = tuple(
            KeyInformation(
                label=str(
                    item.get("label", "")
                ).strip(),
                value=str(
                    item.get("value", "")
                ).strip(),
            )
            for item in result.get(
                "key_information",
                [],
            )
            if item.get("label")
        )

        important_points = tuple(
            str(point).strip()
            for point in result.get(
                "important_points",
                [],
            )
            if str(point).strip()
        )

        overview = str(
            result.get(
                "overview",
                "",
            )
        ).strip()

        return SectionUnderstanding(
            heading=heading,
            overview=overview,
            key_information=key_information,
            important_points=important_points,
            original_text=text,
        )