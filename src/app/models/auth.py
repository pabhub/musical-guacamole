from __future__ import annotations

from pydantic import BaseModel, Field


class AuthTokenRequest(BaseModel):
    username: str
    password: str


class AuthTokenResponse(BaseModel):
    access_token: str = Field(alias="accessToken")
    token_type: str = Field(default="bearer", alias="tokenType")
    expires_in_seconds: int = Field(alias="expiresInSeconds")
