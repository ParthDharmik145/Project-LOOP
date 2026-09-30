from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime
from sqlalchemy.sql import func

from database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    customer_name = Column(String(100), nullable=False)

    feedback_text = Column(Text, nullable=False)

    source = Column(String(50))

    rating = Column(Integer)

    sentiment = Column(String(20))

    sentiment_score = Column(Numeric(5, 2))

    topic = Column(String(100))

    issue = Column(String(255))

    priority = Column(String(20))

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp()
    )