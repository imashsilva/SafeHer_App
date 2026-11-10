from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

ComplaintCategory = Literal["legal", "psychosocial", "community", "other"]


class ComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category: ComplaintCategory
    # Fictional demonstration notes only. Never collect real case details in this prototype.
    demo_note: str = Field(default="", max_length=500)


class ComplaintUpdate(ComplaintCreate):
    pass
