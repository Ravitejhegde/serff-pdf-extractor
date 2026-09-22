from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.application.services.section_understanding_service import (
    SectionUnderstandingService,
)
from app.domain.models.understanding import SectionUnderstanding
from app.infrastructure.ai.openrouter_client import (
    OpenRouterError,
    create_ai_client,
)


router = APIRouter(
    prefix="/api",
    tags=["understanding"],
)


class SectionUnderstandingRequest(BaseModel):
    heading: str = Field(min_length=1)
    text: str


class KeyInformationResponse(BaseModel):
    label: str
    value: str


class SectionUnderstandingResponse(BaseModel):
    heading: str
    overview: str
    key_information: list[KeyInformationResponse]
    important_points: list[str]
    original_text: str


def create_understanding_service() -> SectionUnderstandingService:
    return SectionUnderstandingService(
        ai_client=create_ai_client(),
    )


def to_response(
    result: SectionUnderstanding,
) -> SectionUnderstandingResponse:
    return SectionUnderstandingResponse(
        heading=result.heading,
        overview=result.overview,
        key_information=[
            KeyInformationResponse(
                label=item.label,
                value=item.value,
            )
            for item in result.key_information
        ],
        important_points=list(result.important_points),
        original_text=result.original_text,
    )


@router.post(
    "/understand",
    response_model=SectionUnderstandingResponse,
)
async def understand_section(
    request: SectionUnderstandingRequest,
    service: SectionUnderstandingService = Depends(
        create_understanding_service
    ),
) -> SectionUnderstandingResponse:
    try:
        result = service.understand(
            heading=request.heading,
            text=request.text,
        )

    except OpenRouterError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    return to_response(result)