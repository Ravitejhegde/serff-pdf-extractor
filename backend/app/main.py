from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.extract import router as extract_router
from app.api.routes.understand import router as understand_router


app = FastAPI(
    title="SERFF PDF Extractor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract_router)
app.include_router(understand_router)