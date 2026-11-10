from unittest.mock import AsyncMock
from uuid import UUID
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.api.deps import CurrentUser
from app.api.routes.complaints import create_complaint, list_complaints, update_complaint
from app.schemas.complaints import ComplaintCreate, ComplaintUpdate

USER = CurrentUser(id="00000000-0000-4000-8000-000000000001", email="test@example.org")
CID = UUID("00000000-0000-4000-8000-000000000002")


def test_rejects_unexpected_fields_and_long_demo_notes():
    with pytest.raises(ValidationError):
        ComplaintCreate(category="legal", incident_details="private details")
    with pytest.raises(ValidationError):
        ComplaintCreate(category="legal", demo_note="x" * 501)


@pytest.mark.asyncio
async def test_adult_create_demo_note():
    db = AsyncMock()
    db.request.side_effect = [[{"age_group": "adult"}], [{"id": str(CID), "category": "legal", "demo_note": "example"}]]
    result = await create_complaint(ComplaintCreate(category="legal", demo_note=" example "), USER, db)
    assert result["demo_note"] == "example"
    assert db.request.await_args.kwargs["payload"]["demo_note"] == "example"


@pytest.mark.asyncio
async def test_update_is_scoped_to_owner_and_received():
    db = AsyncMock()
    db.request.side_effect = [[{"age_group": "adult"}], [{"id": str(CID), "category": "community", "demo_note": "sample"}]]
    await update_complaint(CID, ComplaintUpdate(category="community", demo_note="sample"), USER, db)
    params = db.request.await_args.kwargs["params"]
    assert params["id"] == f"eq.{CID}"
    assert params["user_id"] == f"eq.{USER.id}"
    assert params["status"] == "eq.received"
    assert set(db.request.await_args.kwargs["payload"]) == {"category", "demo_note"}


@pytest.mark.asyncio
async def test_unverified_cannot_edit():
    db = AsyncMock()
    db.request.return_value = [{"age_group": "under_18"}]
    with pytest.raises(HTTPException) as exc:
        await update_complaint(CID, ComplaintUpdate(category="legal"), USER, db)
    assert exc.value.status_code == 403
    assert db.request.await_count == 1


@pytest.mark.asyncio
async def test_missing_or_closed_request_is_not_editable():
    db = AsyncMock()
    db.request.side_effect = [[{"age_group": "adult"}], []]
    with pytest.raises(HTTPException) as exc:
        await update_complaint(CID, ComplaintUpdate(category="legal"), USER, db)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_list_is_owner_scoped():
    db = AsyncMock()
    db.request.return_value = []
    await list_complaints(USER, db)
    assert db.request.await_args.kwargs["params"]["user_id"] == f"eq.{USER.id}"
