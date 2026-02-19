from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any


class JwtError(ValueError):
    """Raised when a JWT token is invalid or expired."""


@dataclass(frozen=True)
class JwtPayload:
    subject: str
    issued_at: int
    expires_at: int
    issuer: str


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + padding)


def _json_compact(data: dict[str, Any]) -> bytes:
    return json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")


def encode_hs256(payload: dict[str, Any], secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = _b64url_encode(_json_compact(header))
    payload_b64 = _b64url_encode(_json_compact(payload))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_hs256(token: str, secret: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError as exc:
        raise JwtError("Malformed token.") from exc

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    provided_signature = _b64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, provided_signature):
        raise JwtError("Invalid token signature.")

    try:
        header = json.loads(_b64url_decode(header_b64))
        payload = json.loads(_b64url_decode(payload_b64))
    except (json.JSONDecodeError, ValueError) as exc:
        raise JwtError("Malformed token payload.") from exc

    if not isinstance(header, dict) or header.get("alg") != "HS256":
        raise JwtError("Unsupported token algorithm.")
    if not isinstance(payload, dict):
        raise JwtError("Malformed token payload.")
    return payload


def validate_standard_claims(payload: dict[str, Any], issuer: str, now_utc: int | None = None) -> JwtPayload:
    now = int(time.time()) if now_utc is None else int(now_utc)
    subject = payload.get("sub")
    issued_at = payload.get("iat")
    expires_at = payload.get("exp")
    token_issuer = payload.get("iss")

    if not isinstance(subject, str) or not subject:
        raise JwtError("Token is missing subject.")
    if not isinstance(issued_at, int):
        raise JwtError("Token is missing iat.")
    if not isinstance(expires_at, int):
        raise JwtError("Token is missing exp.")
    if not isinstance(token_issuer, str) or token_issuer != issuer:
        raise JwtError("Token issuer mismatch.")
    if expires_at <= now:
        raise JwtError("Token has expired.")

    return JwtPayload(subject=subject, issued_at=issued_at, expires_at=expires_at, issuer=token_issuer)
