from fastapi import APIRouter

from app.data.catalog import RESOURCES, SUPPORT_SERVICES

router = APIRouter(tags=["catalog"])


@router.get("/support-services")
async def support_services():
    return SUPPORT_SERVICES


@router.get("/resources")
async def resources():
    return RESOURCES
