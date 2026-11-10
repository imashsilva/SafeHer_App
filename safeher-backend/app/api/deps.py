from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.supabase_rest import SupabaseREST

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str | None


def get_http_client(request: Request) -> httpx.AsyncClient:
    return request.app.state.http_client


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.")

    settings = get_settings()
    try:
        response = await client.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {credentials.credentials}",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail="Authentication service is temporarily unavailable.") from exc

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Your session is invalid or has expired.")

    data = response.json()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Your session could not be verified.")

    return CurrentUser(id=user_id, email=data.get("email"))


async def get_supabase(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
) -> SupabaseREST:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    settings = get_settings()
    return SupabaseREST(
        client=client,
        project_url=settings.supabase_url,
        anon_key=settings.supabase_anon_key,
        access_token=credentials.credentials,
    )


AuthenticatedUser = Annotated[CurrentUser, Depends(get_current_user)]
Database = Annotated[SupabaseREST, Depends(get_supabase)]
