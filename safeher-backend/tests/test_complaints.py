from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from app.api.deps import CurrentUser
from app.api.routes.complaints import create_complaint, list_complaints
from app.schemas.complaints import ComplaintCreate

USER = CurrentUser(id="00000000-0000-4000-8000-000000000001", email="test@example.org")


def test_rejects_extra_sensitive_fields():
    with pytest.raises(ValidationError):
        ComplaintCreate(category="legal", description="private details")


@pytest.mark.asyncio
async def test_under_18_and_unconfirmed_accounts_cannot_submit():
    for age in ("under_18", "not_provided"):
        db = AsyncMock()
        db.request.return_value = [{"age_group": age}]
        with pytest.raises(HTTPException) as exc:
            await create_complaint(ComplaintCreate(category="legal"), USER, db)
        assert exc.value.status_code == 403
        assert db.request.await_count == 1


@pytest.mark.asyncio
async def test_adult_can_submit_with_empty_demo_note():
    db = AsyncMock()
    db.request.side_effect = [[{"age_group": "adult"}], [{"id": "complaint-id", "category": "legal", "status": "received"}]]
    result = await create_complaint(ComplaintCreate(category="legal"), USER, db)
    assert result["status"] == "received"
    assert db.request.await_args.kwargs["payload"] == {"user_id": USER.id, "category": "legal", "demo_note": "", "status": "received"}


@pytest.mark.asyncio
async def test_list_is_scoped_to_authenticated_user():
    db = AsyncMock()
    db.request.return_value = []
    await list_complaints(USER, db)
    assert db.request.await_args.kwargs["params"]["user_id"] == f"eq.{USER.id}"
