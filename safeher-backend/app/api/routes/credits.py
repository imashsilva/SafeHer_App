from fastapi import APIRouter

from app.api.deps import AuthenticatedUser, Database

router = APIRouter(prefix="/credits", tags=["sponsored credits"])


@router.get("")
async def list_credits(user: AuthenticatedUser, db: Database):
    return await db.request(
        "GET",
        "credits",
        params={
            "select": "id,user_id,sponsor,amount,remaining,currency,purpose,expires_at,created_at",
            "user_id": f"eq.{user.id}",
            "order": "created_at.desc",
        },
    )


@router.get("/transactions")
async def list_credit_transactions(user: AuthenticatedUser, db: Database):
    return await db.request(
        "GET",
        "credit_transactions",
        params={
            "select": "id,credit_id,user_id,transaction_type,amount,currency,description,created_at",
            "user_id": f"eq.{user.id}",
            "order": "created_at.desc",
        },
    )
