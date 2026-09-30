from pydantic import BaseModel
from typing import Optional


class FeedbackCreate(BaseModel):
    customer_name: str
    feedback_text: str
    source: Optional[str] = None
    rating: Optional[int] = None