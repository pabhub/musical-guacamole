import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_service
from app.models import LatestAvailabilityResponse
from app.services import AntarcticService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Metadata"])


@router.get(
    "/api/metadata/latest-availability/station/{identificacion}",
    response_model=LatestAvailabilityResponse,
    summary="Resolve latest available observation for one Antarctic station",
    description=(
        "Returns the latest known observation timestamp for a station, preferring cached data and falling back to "
        "AEMET month-window probing when required."
    ),
)
def latest_availability(
    identificacion: str,
    service: AntarcticService = Depends(get_service),
) -> LatestAvailabilityResponse:
    try:
        return service.get_latest_availability(identificacion)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.warning(
            "Upstream AEMET failure on availability endpoint: station=%s detail=%s",
            identificacion,
            str(exc),
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc
