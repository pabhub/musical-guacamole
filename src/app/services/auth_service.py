from __future__ import annotations

import hmac
import time
from dataclasses import dataclass

from app.core.auth import JwtError, decode_hs256, encode_hs256, validate_standard_claims
from app.core.config import Settings


@dataclass(frozen=True)
class AuthUser:
    username: str


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def auth_enabled(self) -> bool:
        return self._settings.api_auth_enabled

    @property
    def token_ttl_seconds(self) -> int:
        return self._settings.jwt_access_token_ttl_seconds

    def issue_access_token(self, username: str, password: str) -> str:
        expected_username = self._settings.api_auth_username
        expected_password = self._settings.api_auth_password
        valid_username = hmac.compare_digest(username, expected_username)
        valid_password = hmac.compare_digest(password, expected_password)
        if not (valid_username and valid_password):
            raise PermissionError("Invalid username or password.")
        return self.issue_access_token_for_subject(expected_username)

    def issue_access_token_for_subject(self, subject: str) -> str:
        expected_username = self._settings.api_auth_username
        if not hmac.compare_digest(subject, expected_username):
            raise PermissionError("Invalid token subject.")
        now = int(time.time())
        claims = {
            "sub": expected_username,
            "iat": now,
            "exp": now + self.token_ttl_seconds,
            "iss": self._settings.jwt_issuer,
        }
        return encode_hs256(claims, self._settings.jwt_secret_key)

    def validate_access_token(self, token: str) -> AuthUser:
        try:
            payload = decode_hs256(token, self._settings.jwt_secret_key)
            claims = validate_standard_claims(payload, issuer=self._settings.jwt_issuer)
        except JwtError as exc:
            raise PermissionError(str(exc)) from exc
        return AuthUser(username=claims.subject)
