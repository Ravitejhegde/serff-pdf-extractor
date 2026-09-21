from app.application.services.heading_detector import HeadingCandidate
from app.domain.models.extraction import Section


class SectionBuilder:
    def build(
        self,
        lines: tuple[HeadingCandidate, ...],
    ) -> tuple[Section, ...]:
        sections: list[Section] = []

        current_heading: str | None = None
        current_content: list[str] = []

        for item in lines:
            # Ignore repeated SERFF page header/footer metadata.
            if item.is_page_metadata:
                continue

            text = item.line.text.strip()

            if not text:
                continue

            if item.is_heading:
                # Save the previous section before starting a new one.
                if current_heading is not None:
                    sections.append(
                        Section(
                            heading=current_heading,
                            text="\n".join(current_content).strip(),
                        )
                    )

                current_heading = text
                current_content = []
                continue

            # Add normal content to the current section.
            if current_heading is not None:
                current_content.append(text)

        # Save the final section.
        if current_heading is not None:
            sections.append(
                Section(
                    heading=current_heading,
                    text="\n".join(current_content).strip(),
                )
            )

        return tuple(sections)