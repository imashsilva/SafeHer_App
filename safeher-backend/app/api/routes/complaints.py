from uuid import UUID
from fastapi import APIRouter, HTTPException
from app.api.deps import AuthenticatedUser, Database
from app.schemas.complaints import ComplaintCreate, ComplaintUpdate

router = APIRouter(prefix="/complaints", tags=["complaints"])


async def require_verified_adult(user_id: str, db: Database) -> None:
    profile = await db.request("GET", "profiles", params={
        "select": "age_group", "id": f"eq.{user_id}", "limit": "1"
    })
    if not profile:
        raise HTTPException(status_code=404, detail="Your profile was not found.")
    if profile[0]["age_group"] != "adult":
        raise HTTPException(status_code=403, detail="Complaint submission is not available for this account. Please use the age-appropriate support information.")


@router.get("")
async def list_complaints(user: AuthenticatedUser, db: Database):
    return await db.request(
        "GET", "complaints",
        params={"select": "id,category,demo_note,status,created_at", "user_id": f"eq.{user.id}", "order": "created_at.desc"},
    )


@router.post("", status_code=201)
async def create_complaint(payload: ComplaintCreate, user: AuthenticatedUser, db: Database):
    await require_verified_adult(user.id, db)
    rows = await db.request("POST", "complaints", payload={
        "user_id": user.id, "category": payload.category,
        "demo_note": payload.demo_note.strip(), "status": "received",
    })
    if not rows:
        raise HTTPException(status_code=502, detail="The demo request could not be saved.")
    return rows[0]


@router.patch("/{complaint_id}")
async def update_complaint(complaint_id: UUID, payload: ComplaintUpdate, user: AuthenticatedUser, db: Database):
    await require_verified_adult(user.id, db)
    # Filter by both owner and status. RLS and column-specific GRANT are additional safeguards.
    rows = await db.request("PATCH", "complaints", params={
        "id": f"eq.{complaint_id}", "user_id": f"eq.{user.id}", "status": "eq.received",
    }, payload={"category": payload.category, "demo_note": payload.demo_note.strip()})
    if not rows:
        raise HTTPException(status_code=404, detail="Demo request not found or no longer editable.")
    return rows[0]
