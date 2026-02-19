from app.core.config import Settings
from app.services.aemet_client import AemetClient
from app.services.antarctic import AnalysisMixin, DataMixin, PlaybackAnalyticsMixin, StationCatalogMixin
from app.services.repository import SQLiteRepository


class AntarcticService(StationCatalogMixin, DataMixin, AnalysisMixin, PlaybackAnalyticsMixin):
    def __init__(self, settings: Settings, repository: SQLiteRepository, aemet_client: AemetClient) -> None:
        self.settings = settings
        self.repository = repository
        self.aemet_client = aemet_client
