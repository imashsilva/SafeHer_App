from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AppointmentCreate(BaseModel):
    service: str = Field(min_length=3, max_length=120)
    starts_at: datetime
    duration_minutes: int = Field(default=45, ge=15, le=120)
    format: Literal["online", "in_person", "phone"]

    @field_validator("starts_at")
    @classmethod
    def starts_at_must_be_timezone_aware_and_future(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("starts_at must include a timezone offset.")
        if value <= datetime.now(timezone.utc):
            raise ValueError("Choose a future date and time.")
        return value
