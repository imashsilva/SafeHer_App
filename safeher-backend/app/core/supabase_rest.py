from typing import Any

import httpx
from fastapi import HTTPException


class SupabaseREST:
    """
    Calls Supabase Auth/PostgREST using the signed-in user's access token.
    This means Postgres RLS policies apply to these requests.
    Never replace the user's token with a service-role key in this class.
    """

    def __init__(self, client: httpx.AsyncClient, project_url: str, anon_key: str, access_token: str):
        self.client = client
        self.base_url = project_url.rstrip("/")
        self.anon_key = anon_key
        self.access_token = access_token

    async def request(
        self,
        method: str,
        table: str,
        *,
        params: dict[str, str] | None = None,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        headers = {
            "apikey": self.anon_key,
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if method.upper() in {"POST", "PATCH", "PUT"}:
            headers["Prefer"] = "return=representation"

        try:
            response = await self.client.request(
                method=method,
                url=f"{self.base_url}/rest/v1/{table}",
                params=params,
                json=payload,
                headers=headers,
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail="Database service is temporarily unavailable.") from exc

        if not response.is_success:
            # Keep internal database details out of public error responses.
            if response.status_code in (401, 403):
                raise HTTPException(status_code=403, detail="You are not allowed to perform this action.")
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="The requested record was not found.")
            if response.status_code in (400, 409, 422):
                raise HTTPException(status_code=400, detail="The submitted information could not be saved.")
            raise HTTPException(status_code=502, detail="The database request failed.")

        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            return None
