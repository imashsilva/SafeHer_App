from fastapi import APIRouter, HTTPException

from app.api.deps import AuthenticatedUser, Database
from app.schemas.appointments import AppointmentCreate

router = APIRouter(prefix="/appointments", tags=["appointments"])


async def _profile_age_group(user_id: str, db: Database) -> str:
    rows = await db.request(
        "GET",
        "profiles",
        params={"select": "age_group", "id": f"eq.{user_id}", "limit": "1"},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Your profile was not found.")
    return rows[0]["age_group"]


@router.get("")
async def list_appointments(user: AuthenticatedUser, db: Database):
    return await db.request(
        "GET",
        "appointments",
        params={
            "select": "id,user_id,service,professional,starts_at,duration_minutes,format,status,created_at,cancelled_at",
            "user_id": f"eq.{user.id}",
            "order": "starts_at.asc",
        },
    )


@router.post("", status_code=201)
async def create_appointment(payload: AppointmentCreate, user: AuthenticatedUser, db: Database):
    age_group = await _profile_age_group(user.id, db)
    # The initial release deliberately does not accept appointment requests
    # from under-18 or age-unconfirmed accounts.
    if age_group != "adult":
        raise HTTPException(
            status_code=403,
            detail="Appointment requests are not available for this account. Please use the age-appropriate support information.",
        )

    rows = await db.request(
        "POST",
        "appointments",
        payload={
            "user_id": user.id,
            "service": payload.service,
            "professional": "Pending assignment",
            "starts_at": payload.starts_at.isoformat(),
            "duration_minutes": payload.duration_minutes,
            "format": payload.format,
            "status": "requested",
        },
    )
    return rows[0] if rows else {"message": "Appointment request submitted."}


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, user: AuthenticatedUser, db: Database):
    rows = await db.request(
        "PATCH",
        "appointments",
        params={
            "id": f"eq.{appointment_id}",
            "user_id": f"eq.{user.id}",
            "status": "in.(requested,confirmed)",
        },
        payload={"status": "cancelled"},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Appointment not found or it can no longer be cancelled.")
    return rows[0]
