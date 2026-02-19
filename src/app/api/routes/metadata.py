import logging

from fastapi import APIRouter, Depends

from app.api.dependencies import get_service
from app.api.route_utils import SERVICE_ERROR_RESPONSES, call_service_or_http
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
    responses=SERVICE_ERROR_RESPONSES,
)
def latest_availability(
    identificacion: str,
    service: AntarcticService = Depends(get_service),
) -> LatestAvailabilityResponse:
    logger.info("Handling latest availability request station=%s", identificacion)
    return call_service_or_http(
        lambda: service.get_latest_availability(identificacion),
        logger=logger,
        endpoint="metadata/latest-availability",
        context={"station": identificacion},
    )
