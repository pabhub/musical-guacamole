from fastapi import APIRouter, Depends

from app.api.dependencies import require_api_user
from app.api.routes.analysis import router as analysis_router
from app.api.routes.auth import router as auth_router
from app.api.routes.data import router as data_router
from app.api.routes.metadata import router as metadata_router
from app.api.routes.pages import router as pages_router

router = APIRouter()
router.include_router(pages_router)
router.include_router(auth_router)
router.include_router(metadata_router, dependencies=[Depends(require_api_user)])
router.include_router(analysis_router, dependencies=[Depends(require_api_user)])
router.include_router(data_router, dependencies=[Depends(require_api_user)])

__all__ = ["router"]
