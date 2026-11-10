from fastapi import APIRouter, HTTPException

from app.api.deps import AuthenticatedUser, Database
from app.schemas.privacy import PrivacyUpdate

router = APIRouter(tags=["profile"])


@router.get("/me")
async def get_me(user: AuthenticatedUser, db: Database):
    rows = await db.request(
        "GET",
        "profiles",
        params={
            "select": "id,email,age_group,created_at",
            "id": f"eq.{user.id}",
            "limit": "1",
        },
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Your profile has not been created yet.")
    return rows[0]


@router.get("/preferences")
async def get_preferences(user: AuthenticatedUser, db: Database):
    rows = await db.request(
        "GET",
        "privacy_settings",
        params={
            "select": "user_id,share_anonymous_insights,email_updates,created_at",
            "user_id": f"eq.{user.id}",
            "limit": "1",
        },
    )
    if not rows:
        # The signup trigger should create this row. Do not silently create data
        # from a read request; surface a clear setup issue instead.
        raise HTTPException(status_code=404, detail="Privacy preferences are not configured.")
    return rows[0]


@router.patch("/preferences")
async def update_preferences(payload: PrivacyUpdate, user: AuthenticatedUser, db: Database):
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Provide at least one preference to update.")

    rows = await db.request(
        "PATCH",
        "privacy_settings",
        params={"user_id": f"eq.{user.id}"},
        payload=changes,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Privacy preferences were not found.")
    return rows[0]
