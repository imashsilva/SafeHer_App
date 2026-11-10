from pydantic import BaseModel


class PrivacyUpdate(BaseModel):
    share_anonymous_insights: bool | None = None
    email_updates: bool | None = None
