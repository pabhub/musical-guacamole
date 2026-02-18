from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from app.aemet_client import AemetClient

UTC = ZoneInfo("UTC")


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeHttpClient:
    def __init__(self, responses):
        self._responses = responses
        self._idx = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, *_args, **_kwargs):
        response = self._responses[self._idx]
        self._idx += 1
        return response


def test_fetch_station_data_raises_clear_error_when_metadata_has_no_datos(monkeypatch):
    responses = [FakeResponse({"estado": 401, "descripcion": "API key no válida"})]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="bad-key")
    with pytest.raises(RuntimeError, match="missing 'datos' URL"):
        client.fetch_station_data(
            start_utc=datetime(2024, 1, 1, 0, 0, tzinfo=UTC),
            end_utc=datetime(2024, 1, 1, 1, 0, tzinfo=UTC),
            station_id="89064",
        )


def test_fetch_station_data_returns_empty_for_aemet_no_data_404(monkeypatch):
    responses = [FakeResponse({"estado": 404, "descripcion": "No hay datos que satisfagan esos criterios"})]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="ok-key")
    out = client.fetch_station_data(
        start_utc=datetime(2024, 1, 1, 0, 0, tzinfo=UTC),
        end_utc=datetime(2024, 1, 1, 1, 0, tzinfo=UTC),
        station_id="89064",
    )
    assert out == []


def test_fetch_station_inventory_parses_station_rows(monkeypatch):
    responses = [
        FakeResponse({"estado": 200, "datos": "https://example.test/data.json"}),
        FakeResponse(
            [
                {
                    "indicativo": "89064",
                    "nombre": "GABRIEL DE CASTILLA",
                    "provincia": "ANTARTIDA",
                    "latitud": "-62.97",
                    "longitud": "-60.68",
                    "altitud": "14",
                }
            ]
        ),
    ]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="ok-key")
    out = client.fetch_station_inventory()

    assert len(out) == 1
    assert out[0].station_id == "89064"
    assert out[0].station_name == "GABRIEL DE CASTILLA"
    assert out[0].province == "ANTARCTIC"


def test_fetch_station_inventory_parses_csv_payload(monkeypatch):
    csv_payload = (
        "indicativo;nombre;provincia;latitud;longitud;altitud\n"
        "89070;JUAN CARLOS I;ANTARTIDA;625640S;603524W;12\n"
    )
    responses = [
        FakeResponse({"estado": 200, "datos": "https://example.test/data.csv"}),
        FakeResponse(csv_payload),
    ]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="ok-key")
    out = client.fetch_station_inventory()

    assert len(out) == 1
    assert out[0].station_id == "89070"
    assert out[0].station_name == "JUAN CARLOS I"
    assert out[0].latitude is not None
    assert out[0].longitude is not None


def test_fetch_station_inventory_handles_uppercase_json_keys(monkeypatch):
    responses = [
        FakeResponse({"estado": 200, "datos": "https://example.test/data.json"}),
        FakeResponse(
            [
                {
                    "INDICATIVO": "89064",
                    "NOMBRE": "GABRIEL DE CASTILLA",
                    "PROVINCIA": "ANTARTIDA",
                    "LATITUD": "625826S",
                    "LONGITUD": "603936W",
                    "ALTITUD": "14",
                }
            ]
        ),
    ]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="ok-key")
    out = client.fetch_station_inventory()

    assert len(out) == 1
    assert out[0].station_id == "89064"
    assert out[0].station_name == "GABRIEL DE CASTILLA"


def test_fetch_station_inventory_supports_nested_properties_shape(monkeypatch):
    responses = [
        FakeResponse({"estado": 200, "datos": "https://example.test/geo.json"}),
        FakeResponse(
            [
                {
                    "type": "Feature",
                    "properties": {
                        "IDEMA": "1234A",
                        "NOMBRE": "ESTACION TEST",
                        "PROVINCIA": "MADRID",
                        "LATITUD": "402540N",
                        "LONGITUD": "003420W",
                        "ALTITUD": "670",
                    },
                }
            ]
        ),
    ]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="ok-key")
    out = client.fetch_station_inventory()

    assert len(out) == 1
    assert out[0].station_id == "1234A"
    assert out[0].station_name == "ESTACION TEST"


def test_fetch_station_inventory_parses_json_lines_payload(monkeypatch):
    json_lines_payload = (
        '{"indicativo":"0016A","nombre":"ESCORCA, LLUC","provincia":"ILLES BALEARS","latitud":"394924N","longitud":"025309E","altitud":"525"}\n'
        '{"indicativo":"0017A","nombre":"ANOTHER STATION","provincia":"ILLES BALEARS","latitud":"394500N","longitud":"025000E","altitud":"100"}\n'
    )
    responses = [
        FakeResponse({"estado": 200, "datos": "https://example.test/data.txt"}),
        FakeResponse(json_lines_payload),
    ]
    monkeypatch.setattr("app.aemet_client.httpx.Client", lambda timeout: FakeHttpClient(responses))

    client = AemetClient(api_key="ok-key")
    out = client.fetch_station_inventory()

    assert len(out) == 2
    assert out[0].station_id == "0016A"
    assert out[0].station_name == "ESCORCA, LLUC"
