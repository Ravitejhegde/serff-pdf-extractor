from fastapi import APIRouter, File, HTTPException, UploadFile

from app.application.services.extraction_service import ExtractionService
from app.domain.models.extraction import ExtractionResult
from app.infrastructure.pdf.pymupdf_reader import PyMuPDFReader
from app.application.services.heading_detector import HeadingDetector
from app.application.services.page_metadata_detector import PageMetadataDetector
from app.application.services.section_builder import SectionBuilder
from app.application.services.text_line_builder import TextLineBuilder


router = APIRouter(
    prefix="/api",
    tags=["extraction"],
)


def create_extraction_service() -> ExtractionService:
    return ExtractionService(
        pdf_reader=PyMuPDFReader(),
        text_line_builder=TextLineBuilder(),
        page_metadata_detector=PageMetadataDetector(),
        heading_detector=HeadingDetector(),
        section_builder=SectionBuilder(),
    )


@router.post("/extract")
async def extract_pdf(
    file: UploadFile = File(...),
) -> dict:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is empty.",
        )

    service = create_extraction_service()

    result: ExtractionResult = service.extract(
        filename=file.filename or "uploaded.pdf",
        content=content,
    )

    return {
        "filename": result.filename,
        "page_count": result.page_count,
        "section_count": len(result.sections),
        "sections": [
            {
                "heading": section.heading,
                "text": section.text,
            }
            for section in result.sections
        ],
    }