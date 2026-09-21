from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


PDF_CASES = [
    (
        Path(r"C:\Users\hegde\Downloads\AMGN-135003565.pdf"),
        15,
    ),
    (
        Path(r"C:\Users\hegde\Downloads\UNAM-135051123.pdf"),
        17,
    ),
    (
        Path(r"C:\Users\hegde\Downloads\NYLM-134614243.pdf"),
        114,
    ),
]


def test_extract_real_serff_pdfs():
    for pdf_path, expected_page_count in PDF_CASES:
        response = client.post(
            "/api/extract",
            files={
                "file": (
                    pdf_path.name,
                    pdf_path.read_bytes(),
                    "application/pdf",
                )
            },
        )

        assert response.status_code == 200

        data = response.json()

        assert data["filename"] == pdf_path.name
        assert data["page_count"] == expected_page_count

        assert data["section_count"] > 0
        assert len(data["sections"]) == data["section_count"]

        for section in data["sections"]:
            assert "heading" in section
            assert "text" in section

            assert isinstance(section["heading"], str)
            assert isinstance(section["text"], str)


def test_amgn_extracts_expected_initial_sections():
    pdf_path = Path(
        r"C:\Users\hegde\Downloads\AMGN-135003565.pdf"
    )

    response = client.post(
        "/api/extract",
        files={
            "file": (
                pdf_path.name,
                pdf_path.read_bytes(),
                "application/pdf",
            )
        },
    )

    assert response.status_code == 200

    data = response.json()

    headings = [
        section["heading"]
        for section in data["sections"]
    ]

    assert headings[0] == "Table of Contents"
    assert headings[1] == "Filing at a Glance"
    assert "General Information" in headings
    assert "Company and Contact" in headings


def test_extract_rejects_non_pdf():
    response = client.post(
        "/api/extract",
        files={
            "file": (
                "example.txt",
                b"This is not a PDF.",
                "text/plain",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "Only PDF files are supported."
    )


def test_extract_rejects_empty_file():
    response = client.post(
        "/api/extract",
        files={
            "file": (
                "empty.pdf",
                b"",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400

    assert response.json()["detail"] == (
        "The uploaded PDF is empty."
    )