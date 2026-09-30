from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import SessionLocal
from models import Feedback
from ai_engine import analyze_feedback


app = FastAPI(
    title="LOOP AI API",
    description="AI Customer Feedback Intelligence Platform",
    version="1.0.0"
)


# -----------------------------
# Database Connection
# -----------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# -----------------------------
# Feedback Input Model
# -----------------------------

class FeedbackCreate(BaseModel):
    customer_name: str
    feedback_text: str
    source: str | None = None
    rating: int | None = None


# -----------------------------
# Home
# -----------------------------

@app.get("/")
def home():

    return {
        "message": "LOOP AI Backend is running successfully!"
    }


# -----------------------------
# Get All Feedback
# -----------------------------

@app.get("/feedback")
def get_feedback(db: Session = Depends(get_db)):

    feedback = db.query(Feedback).all()

    return feedback


# -----------------------------
# Add Feedback + AI Analysis
# -----------------------------

@app.post("/feedback")
def create_feedback(
    feedback_data: FeedbackCreate,
    db: Session = Depends(get_db)
):

    # Run AI analysis
    analysis = analyze_feedback(
        feedback_data.feedback_text,
        feedback_data.rating
    )

    # Create database record
    new_feedback = Feedback(
        customer_name=feedback_data.customer_name,
        feedback_text=feedback_data.feedback_text,
        source=feedback_data.source,
        rating=feedback_data.rating,

        sentiment=analysis["sentiment"],
        sentiment_score=analysis["sentiment_score"],
        topic=analysis["topic"],
        issue=analysis["issue"],
        priority=analysis["priority"]
    )

    # Save to database
    db.add(new_feedback)

    db.commit()

    db.refresh(new_feedback)

    return {
        "message": "Feedback analyzed and added successfully!",
        "feedback_id": new_feedback.id,
        "ai_analysis": analysis
    }


# -----------------------------
# Dashboard Statistics
# -----------------------------

@app.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):

    total_feedback = db.query(Feedback).count()

    analyzed_feedback = db.query(Feedback).filter(
        Feedback.sentiment.isnot(None)
    ).count()

    positive_count = db.query(Feedback).filter(
        Feedback.sentiment == "Positive"
    ).count()

    negative_count = db.query(Feedback).filter(
        Feedback.sentiment == "Negative"
    ).count()

    neutral_count = db.query(Feedback).filter(
        Feedback.sentiment == "Neutral"
    ).count()

    critical_count = db.query(Feedback).filter(
        Feedback.priority == "Critical"
    ).count()

    # Calculate percentages only from analyzed feedback
    if analyzed_feedback > 0:

        positive_percentage = round(
            (positive_count / analyzed_feedback) * 100,
            2
        )

        negative_percentage = round(
            (negative_count / analyzed_feedback) * 100,
            2
        )

        neutral_percentage = round(
            (neutral_count / analyzed_feedback) * 100,
            2
        )

    else:

        positive_percentage = 0
        negative_percentage = 0
        neutral_percentage = 0

    return {
        "total_feedback": total_feedback,
        "analyzed_feedback": analyzed_feedback,

        "positive": positive_count,
        "negative": negative_count,
        "neutral": neutral_count,

        "positive_percentage": positive_percentage,
        "negative_percentage": negative_percentage,
        "neutral_percentage": neutral_percentage,

        "critical_issues": critical_count
    }