from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_auth_service, require_api_user
from app.models import AuthTokenRequest, AuthTokenResponse
from app.services import AuthService
from app.services.auth_service import AuthUser

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Authentication"])


@router.post(
    "/api/auth/token",
    response_model=AuthTokenResponse,
    summary="Issue JWT access token",
    description="Authenticates API user credentials and returns a short-lived bearer token.",
    responses={401: {"description": "Invalid credentials."}},
)
def issue_access_token(
    payload: AuthTokenRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthTokenResponse:
    try:
        token = auth_service.issue_access_token(payload.username, payload.password)
    except PermissionError as exc:
        logger.warning("Authentication failed for username=%s", payload.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        ) from exc

    logger.info("Issued access token for username=%s", payload.username)
    return AuthTokenResponse(
        accessToken=token,
        tokenType="bearer",
        expiresInSeconds=auth_service.token_ttl_seconds,
    )


@router.post(
    "/api/auth/refresh",
    response_model=AuthTokenResponse,
    summary="Refresh JWT access token",
    description="Rotates bearer token expiry for active authenticated sessions.",
    responses={401: {"description": "Invalid or expired bearer token."}},
)
def refresh_access_token(
    auth_user: AuthUser = Depends(require_api_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthTokenResponse:
    try:
        token = auth_service.issue_access_token_for_subject(auth_user.username)
    except PermissionError as exc:
        logger.warning("Token refresh denied for username=%s", auth_user.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    logger.info("Refreshed access token for username=%s", auth_user.username)
    return AuthTokenResponse(
        accessToken=token,
        tokenType="bearer",
        expiresInSeconds=auth_service.token_ttl_seconds,
    )
