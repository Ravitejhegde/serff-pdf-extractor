from app.application.services.text_line_builder import TextLineBuilder
from app.domain.ports.pdf_reader import TextBlock


def test_two_columns_on_same_y_are_separate_lines():
    blocks = (
        TextBlock(
            page_number=3,
            text="Submission Type: New Submission",
            x0=25.50,
            y0=186.75,
            x1=182.21,
            y1=198.75,
            font_size=10.0,
            font_name="Arial",
            is_bold=False,
        ),
        TextBlock(
            page_number=3,
            text="Group Market Size: Small and Large",
            x0=306.50,
            y0=186.75,
            x1=468.23,
            y1=198.75,
            font_size=10.0,
            font_name="Arial",
            is_bold=False,
        ),
    )

    lines = TextLineBuilder().build(blocks)

    assert len(lines) == 2

    assert lines[0].text == "Submission Type: New Submission"
    assert lines[1].text == "Group Market Size: Small and Large"