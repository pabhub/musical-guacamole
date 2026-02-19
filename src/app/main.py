from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import get_service, router
from app.api.dependencies import frontend_dist
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(title="AEMET Antarctic API", version="1.0.0")
app.include_router(router)

if frontend_dist.exists():
    app.mount("/static", StaticFiles(directory=frontend_dist), name="static")

__all__ = ["app", "get_service"]
