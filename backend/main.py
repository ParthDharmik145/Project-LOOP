from collections import Counter
from datetime import datetime, timedelta
from io import BytesIO
from typing import Optional

import pandas as pd

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    UploadFile,
    File
)

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Feedback
from ai_engine import analyze_feedback
from auth import router as auth_router, get_current_user, require_roles


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="LOOP AI API",
    description="AI Customer Feedback Intelligence Platform",
    version="3.3.0"
)

# Authentication routes
app.include_router(auth_router)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",

        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TREND CONFIGURATION
# ============================================================

# A change must be at least 20% to be considered
# a meaningful increase or decrease.
TREND_THRESHOLD = 20


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class FeedbackCreate(BaseModel):

    customer_name: str
    feedback_text: str
    source: Optional[str] = None
    rating: Optional[int] = None


class CopilotRequest(BaseModel):

    question: str


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "LOOP AI Backend is running successfully!",
        "version": "3.3.0",
        "platform": "Customer Feedback Intelligence"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "LOOP AI Backend",
        "database": "connected"
    }


# ============================================================
# GET ALL FEEDBACK
# ============================================================

@app.get("/feedback", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def get_feedback(
    db: Session = Depends(get_db)
):

    feedback_list = (
        db.query(Feedback)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "customer_name": item.customer_name,
            "feedback_text": item.feedback_text,
            "source": item.source,
            "rating": item.rating,

            "sentiment": item.sentiment,

            "sentiment_score": (
                float(item.sentiment_score)
                if item.sentiment_score is not None
                else None
            ),

            "topic": item.topic,
            "issue": item.issue,
            "priority": item.priority,
            "created_at": item.created_at,
        }

        for item in feedback_list
    ]


# ============================================================
# ADD SINGLE FEEDBACK + AI ANALYSIS
# ============================================================

@app.post("/feedback", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def create_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db)
):

    text = feedback.feedback_text.strip()

    if not text:

        raise HTTPException(
            status_code=400,
            detail="Feedback text cannot be empty."
        )

    if len(text) < 5:

        raise HTTPException(
            status_code=400,
            detail="Please enter meaningful customer feedback."
        )

    if feedback.rating is not None:

        if feedback.rating < 1 or feedback.rating > 5:

            raise HTTPException(
                status_code=400,
                detail="Rating must be between 1 and 5."
            )

    # --------------------------------------------------------
    # AI ANALYSIS
    # --------------------------------------------------------

    try:

        analysis = analyze_feedback(
            text,
            feedback.rating
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(error)}"
        )

    # --------------------------------------------------------
    # CREATE DATABASE RECORD
    # --------------------------------------------------------

    new_feedback = Feedback(

        customer_name=(
            feedback.customer_name.strip()
            if feedback.customer_name
            else "Anonymous"
        ),

        feedback_text=text,

        source=(
            feedback.source.strip()
            if feedback.source
            else "Manual"
        ),

        rating=feedback.rating,

        sentiment=analysis.get("sentiment"),

        sentiment_score=analysis.get(
            "sentiment_score"
        ),

        topic=analysis.get("topic"),

        issue=analysis.get("issue"),

        priority=analysis.get("priority"),
    )

    try:

        db.add(new_feedback)

        db.commit()

        db.refresh(new_feedback)

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Database error while saving feedback: "
                f"{str(error)}"
            )
        )

    return {

        "message": (
            "Feedback added and analyzed successfully."
        ),

        "feedback": {

            "id": new_feedback.id,

            "customer_name": (
                new_feedback.customer_name
            ),

            "feedback_text": (
                new_feedback.feedback_text
            ),

            "source": new_feedback.source,

            "rating": new_feedback.rating,

            "sentiment": new_feedback.sentiment,

            "sentiment_score": (
                float(new_feedback.sentiment_score)
                if new_feedback.sentiment_score is not None
                else None
            ),

            "topic": new_feedback.topic,

            "issue": new_feedback.issue,

            "priority": new_feedback.priority,

            "created_at": new_feedback.created_at,
        }
    }


# ============================================================
# BULK CSV / EXCEL IMPORT
# ============================================================

@app.post("/feedback/import", dependencies=[Depends(require_roles("Admin", "Manager"))])
async def import_feedback_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="Please select a file."
        )

    filename = file.filename.lower()

    allowed_extensions = (
        ".csv",
        ".xlsx",
        ".xls"
    )

    if not filename.endswith(allowed_extensions):

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file format. "
                "Please upload CSV or Excel (.xlsx/.xls)."
            )
        )

    # --------------------------------------------------------
    # READ FILE
    # --------------------------------------------------------

    try:

        file_content = await file.read()

        if not file_content:

            raise HTTPException(
                status_code=400,
                detail="The uploaded file is empty."
            )

        if filename.endswith(".csv"):

            dataframe = pd.read_csv(
                BytesIO(file_content)
            )

        else:

            dataframe = pd.read_excel(
                BytesIO(file_content)
            )

    except HTTPException:

        raise

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Unable to read the uploaded file: {str(error)}"
            )
        )

    # --------------------------------------------------------
    # CHECK DATA
    # --------------------------------------------------------

    if dataframe.empty:

        raise HTTPException(
            status_code=400,
            detail="The uploaded file contains no records."
        )

    dataframe.columns = [
        str(column).strip().lower().replace(" ", "_")
        for column in dataframe.columns
    ]

    # --------------------------------------------------------
    # REQUIRED COLUMNS
    # --------------------------------------------------------

    required_columns = [
        "customer_name",
        "feedback_text"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in dataframe.columns
    ]

    if missing_columns:

        raise HTTPException(
            status_code=400,
            detail=(
                "Missing required column(s): "
                + ", ".join(missing_columns)
                + ". Required columns are "
                "customer_name and feedback_text."
            )
        )

    # --------------------------------------------------------
    # IMPORT COUNTERS
    # --------------------------------------------------------

    total_rows = len(dataframe)

    imported = 0
    skipped = 0
    failed = 0

    results = []

    # --------------------------------------------------------
    # PROCESS EACH ROW
    # --------------------------------------------------------

    for index, row in dataframe.iterrows():

        row_number = index + 2

        try:

            # CUSTOMER NAME

            customer_name = row.get(
                "customer_name"
            )

            if pd.isna(customer_name):

                customer_name = "Anonymous"

            else:

                customer_name = str(
                    customer_name
                ).strip()

                if not customer_name:

                    customer_name = "Anonymous"

            # FEEDBACK TEXT

            feedback_text = row.get(
                "feedback_text"
            )

            if pd.isna(feedback_text):

                skipped += 1

                results.append(
                    {
                        "row": row_number,
                        "status": "skipped",
                        "reason": "Feedback text is empty."
                    }
                )

                continue

            feedback_text = str(
                feedback_text
            ).strip()

            if not feedback_text:

                skipped += 1

                results.append(
                    {
                        "row": row_number,
                        "status": "skipped",
                        "reason": "Feedback text is empty."
                    }
                )

                continue

            if len(feedback_text) < 5:

                skipped += 1

                results.append(
                    {
                        "row": row_number,
                        "status": "skipped",
                        "reason": "Feedback text is too short."
                    }
                )

                continue

            # SOURCE

            source = row.get(
                "source",
                "CSV/Excel Import"
            )

            if pd.isna(source):

                source = "CSV/Excel Import"

            else:

                source = str(
                    source
                ).strip()

                if not source:

                    source = "CSV/Excel Import"

            # RATING

            rating = row.get(
                "rating"
            )

            if pd.isna(rating):

                rating = None

            else:

                try:

                    rating = int(
                        float(rating)
                    )

                except Exception:

                    rating = None

            if rating is not None:

                if rating < 1 or rating > 5:

                    skipped += 1

                    results.append(
                        {
                            "row": row_number,
                            "status": "skipped",
                            "reason": (
                                "Rating must be between 1 and 5."
                            )
                        }
                    )

                    continue

            # AI ANALYSIS

            analysis = analyze_feedback(
                feedback_text,
                rating
            )

            # DATABASE RECORD

            new_feedback = Feedback(

                customer_name=customer_name,

                feedback_text=feedback_text,

                source=source,

                rating=rating,

                sentiment=analysis.get(
                    "sentiment"
                ),

                sentiment_score=analysis.get(
                    "sentiment_score"
                ),

                topic=analysis.get(
                    "topic"
                ),

                issue=analysis.get(
                    "issue"
                ),

                priority=analysis.get(
                    "priority"
                ),
            )

            db.add(new_feedback)

            imported += 1

            results.append(
                {
                    "row": row_number,
                    "status": "imported",
                    "customer_name": customer_name,
                    "sentiment": analysis.get(
                        "sentiment"
                    ),
                    "topic": analysis.get(
                        "topic"
                    ),
                    "issue": analysis.get(
                        "issue"
                    ),
                    "priority": analysis.get(
                        "priority"
                    )
                }
            )

        except Exception as error:

            failed += 1

            results.append(
                {
                    "row": row_number,
                    "status": "failed",
                    "error": str(error)
                }
            )

    # --------------------------------------------------------
    # SAVE IMPORTED RECORDS
    # --------------------------------------------------------

    try:

        db.commit()

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Database error while importing "
                f"feedback: {str(error)}"
            )
        )

    return {

        "message": (
            "Feedback file processed successfully."
        ),

        "filename": file.filename,

        "total_rows": total_rows,

        "imported": imported,

        "skipped": skipped,

        "failed": failed,

        "results": results
    }


# ============================================================
# RE-ANALYZE ALL EXISTING FEEDBACK
# ============================================================

@app.post("/feedback/reanalyze", dependencies=[Depends(require_roles("Admin", "Manager"))])
def reanalyze_feedback(
    db: Session = Depends(get_db)
):

    feedback_list = (
        db.query(Feedback)
        .order_by(Feedback.id.asc())
        .all()
    )

    if not feedback_list:

        return {
            "message": "No feedback records found.",
            "total_records": 0,
            "reanalyzed": 0,
            "failed": 0,
            "results": []
        }

    reanalyzed = 0
    failed = 0
    results = []

    try:

        for item in feedback_list:

            try:

                analysis = analyze_feedback(
                    item.feedback_text,
                    item.rating
                )

                item.sentiment = analysis.get(
                    "sentiment"
                )

                item.sentiment_score = analysis.get(
                    "sentiment_score"
                )

                item.topic = analysis.get(
                    "topic"
                )

                item.issue = analysis.get(
                    "issue"
                )

                item.priority = analysis.get(
                    "priority"
                )

                reanalyzed += 1

                results.append(
                    {
                        "id": item.id,
                        "status": "success",
                        "sentiment": item.sentiment,
                        "sentiment_score": (
                            float(item.sentiment_score)
                            if item.sentiment_score is not None
                            else None
                        ),
                        "topic": item.topic,
                        "issue": item.issue,
                        "priority": item.priority
                    }
                )

            except Exception as error:

                failed += 1

                results.append(
                    {
                        "id": item.id,
                        "status": "failed",
                        "error": str(error)
                    }
                )

        db.commit()

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Re-analysis failed: {str(error)}"
            )
        )

    return {

        "message": (
            "All existing feedback has been "
            "re-analyzed successfully."
        ),

        "total_records": len(feedback_list),

        "reanalyzed": reanalyzed,

        "failed": failed,

        "results": results
    }


# ============================================================
# DASHBOARD STATISTICS
# ============================================================

@app.get("/dashboard/stats", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def dashboard_stats(
    db: Session = Depends(get_db)
):

    feedback_list = db.query(Feedback).all()

    total = len(feedback_list)

    analyzed = [
        item
        for item in feedback_list
        if item.sentiment is not None
    ]

    total_analyzed = len(analyzed)

    positive = sum(
        1
        for item in analyzed
        if item.sentiment == "Positive"
    )

    negative = sum(
        1
        for item in analyzed
        if item.sentiment == "Negative"
    )

    neutral = sum(
        1
        for item in analyzed
        if item.sentiment == "Neutral"
    )

    critical = sum(
        1
        for item in analyzed
        if item.priority == "Critical"
    )

    high = sum(
        1
        for item in analyzed
        if item.priority == "High"
    )

    medium = sum(
        1
        for item in analyzed
        if item.priority == "Medium"
    )

    low = sum(
        1
        for item in analyzed
        if item.priority == "Low"
    )

    def percentage(value):

        if total_analyzed == 0:

            return 0

        return round(
            (
                value
                / total_analyzed
            ) * 100,
            1
        )

    return {

        "total_feedback": total,

        "total_analyzed": total_analyzed,

        "positive": positive,

        "negative": negative,

        "neutral": neutral,

        "positive_percentage": percentage(
            positive
        ),

        "negative_percentage": percentage(
            negative
        ),

        "neutral_percentage": percentage(
            neutral
        ),

        "critical_issues": critical,

        "high_issues": high,

        "medium_issues": medium,

        "low_issues": low,
    }


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/analytics", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def analytics(
    db: Session = Depends(get_db)
):

    feedback_list = db.query(Feedback).all()

    analyzed = [
        item
        for item in feedback_list
        if item.sentiment is not None
    ]

    sentiment_counter = Counter(
        item.sentiment
        for item in analyzed
        if item.sentiment
    )

    topic_counter = Counter(
        item.topic
        for item in analyzed
        if item.topic
    )

    priority_counter = Counter(
        item.priority
        for item in analyzed
        if item.priority
    )

    issue_counter = Counter(
        item.issue
        for item in analyzed
        if item.issue
    )

    source_counter = Counter(
        item.source or "Unknown"
        for item in feedback_list
    )

    topics = [
        {
            "topic": topic,
            "count": count
        }

        for topic, count
        in topic_counter.most_common()
    ]

    issues = [
        {
            "issue": issue,
            "count": count
        }

        for issue, count
        in issue_counter.most_common()
    ]

    sources = [
        {
            "source": source,
            "count": count
        }

        for source, count
        in source_counter.most_common()
    ]

    positive = sentiment_counter.get(
        "Positive",
        0
    )

    negative = sentiment_counter.get(
        "Negative",
        0
    )

    neutral = sentiment_counter.get(
        "Neutral",
        0
    )

    total_analyzed = len(analyzed)

    top_topic = (
        topics[0]["topic"]
        if topics
        else "No topic detected"
    )

    top_issue = (
        issues[0]["issue"]
        if issues
        else "No issue detected"
    )

    critical_count = priority_counter.get(
        "Critical",
        0
    )

    high_count = priority_counter.get(
        "High",
        0
    )

    summary = (
        f"The platform has analyzed "
        f"{total_analyzed} feedback entries. "
        f"There are {positive} positive, "
        f"{negative} negative and "
        f"{neutral} neutral responses. "
        f"The most discussed topic is "
        f"{top_topic}. "
        f"The most common issue is "
        f"{top_issue}. "
        f"There are currently "
        f"{critical_count} critical and "
        f"{high_count} high priority issues "
        f"requiring attention."
    )

    return {

        "sentiment": {

            "Positive": positive,

            "Negative": negative,

            "Neutral": neutral
        },

        "topics": topics,

        "priority": {

            "Critical": priority_counter.get(
                "Critical",
                0
            ),

            "High": priority_counter.get(
                "High",
                0
            ),

            "Medium": priority_counter.get(
                "Medium",
                0
            ),

            "Low": priority_counter.get(
                "Low",
                0
            )
        },

        "issues": issues,

        "sources": sources,

        "total_analyzed": total_analyzed,

        "summary": summary
    }


# ============================================================
# TREND & EMERGING ISSUE DETECTION
# ============================================================

def calculate_percentage_change(
    previous_count,
    recent_count
):

    # --------------------------------------------------------
    # NO PREVIOUS DATA
    # --------------------------------------------------------

    if previous_count == 0:

        if recent_count > 0:

            return None

        return 0

    return round(
        (
            (
                recent_count
                - previous_count
            )
            / previous_count
        )
        * 100,
        1
    )


def build_trend_item(
    name,
    recent_count,
    previous_count
):

    change = calculate_percentage_change(
        previous_count,
        recent_count
    )

    # --------------------------------------------------------
    # NEW
    # --------------------------------------------------------

    if previous_count == 0 and recent_count > 0:

        status = "New"

        direction = "new"

    # --------------------------------------------------------
    # DISAPPEARED / DECREASING TO ZERO
    # --------------------------------------------------------

    elif previous_count > 0 and recent_count == 0:

        status = "Decreasing"

        direction = "down"

    # --------------------------------------------------------
    # SIGNIFICANT INCREASE
    # --------------------------------------------------------

    elif (
        change is not None
        and change >= TREND_THRESHOLD
    ):

        status = "Increasing"

        direction = "up"

    # --------------------------------------------------------
    # SIGNIFICANT DECREASE
    # --------------------------------------------------------

    elif (
        change is not None
        and change <= -TREND_THRESHOLD
    ):

        status = "Decreasing"

        direction = "down"

    # --------------------------------------------------------
    # SMALL CHANGE / STABLE
    # --------------------------------------------------------

    else:

        status = "Stable"

        direction = "stable"

    return {

        "name": name,

        "recent_count": recent_count,

        "previous_count": previous_count,

        "change_percentage": change,

        "status": status,

        "direction": direction
    }


def calculate_counter_trends(
    recent_items,
    previous_items,
    attribute
):

    recent_counter = Counter(

        getattr(item, attribute)

        for item in recent_items

        if getattr(item, attribute)
    )

    previous_counter = Counter(

        getattr(item, attribute)

        for item in previous_items

        if getattr(item, attribute)
    )

    names = set(
        recent_counter.keys()
    ).union(
        previous_counter.keys()
    )

    trends = []

    for name in names:

        recent_count = recent_counter.get(
            name,
            0
        )

        previous_count = previous_counter.get(
            name,
            0
        )

        trends.append(
            build_trend_item(
                name,
                recent_count,
                previous_count
            )
        )

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------
    # Priority:
    # 1. New issues
    # 2. Increasing issues
    # 3. Stable
    # 4. Decreasing
    #
    # Within each group, recent volume matters.
    # --------------------------------------------------------

    status_priority = {

        "New": 1,

        "Increasing": 2,

        "Stable": 3,

        "Decreasing": 4
    }

    trends.sort(

        key=lambda item: (

            status_priority.get(
                item["status"],
                5
            ),

            -item["recent_count"],

            -(
                item["change_percentage"]
                if item["change_percentage"] is not None
                else 0
            )
        )
    )

    return trends


def get_most_important_trend(
    trends
):

    if not trends:

        return None

    # --------------------------------------------------------
    # NEW ISSUES HAVE FIRST PRIORITY
    # --------------------------------------------------------

    new_items = [

        item

        for item in trends

        if item["status"] == "New"
    ]

    if new_items:

        new_items.sort(

            key=lambda item: (
                item["recent_count"],
                item["name"]
            ),

            reverse=True
        )

        return new_items[0]

    # --------------------------------------------------------
    # SIGNIFICANT INCREASES
    # --------------------------------------------------------

    increasing_items = [

        item

        for item in trends

        if (
            item["status"] == "Increasing"
            and item["change_percentage"] is not None
        )
    ]

    if increasing_items:

        increasing_items.sort(

            key=lambda item: (
                item["change_percentage"],
                item["recent_count"]
            ),

            reverse=True
        )

        return increasing_items[0]

    return None


def build_count_trend(
    name,
    recent_count,
    previous_count
):

    return build_trend_item(
        name,
        recent_count,
        previous_count
    )


@app.get("/trends", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def trends(
    db: Session = Depends(get_db)
):

    # ========================================================
    # LOAD FEEDBACK
    # ========================================================

    feedback_list = (
        db.query(Feedback)
        .order_by(
            Feedback.created_at.desc()
        )
        .all()
    )

    now = datetime.now()

    recent_start = (
        now - timedelta(days=7)
    )

    previous_start = (
        now - timedelta(days=14)
    )

    # ========================================================
    # SPLIT INTO TWO TIME PERIODS
    # ========================================================

    recent_feedback = []

    previous_feedback = []

    for item in feedback_list:

        if not item.created_at:

            continue

        created_at = item.created_at

        if created_at >= recent_start:

            recent_feedback.append(item)

        elif (
            created_at >= previous_start
            and created_at < recent_start
        ):

            previous_feedback.append(item)

    # ========================================================
    # ISSUE TRENDS
    # ========================================================

    issue_trends = calculate_counter_trends(
        recent_feedback,
        previous_feedback,
        "issue"
    )

    # ========================================================
    # TOPIC TRENDS
    # ========================================================

    topic_trends = calculate_counter_trends(
        recent_feedback,
        previous_feedback,
        "topic"
    )

    # ========================================================
    # NEGATIVE FEEDBACK COUNTS
    # ========================================================

    recent_negative = sum(

        1
        for item in recent_feedback
        if item.sentiment == "Negative"
    )

    previous_negative = sum(

        1
        for item in previous_feedback
        if item.sentiment == "Negative"
    )

    negative_trend = build_count_trend(
        "Negative Feedback",
        recent_negative,
        previous_negative
    )

    # ========================================================
    # CRITICAL FEEDBACK COUNTS
    # ========================================================

    recent_critical = sum(

        1
        for item in recent_feedback
        if item.priority == "Critical"
    )

    previous_critical = sum(

        1
        for item in previous_feedback
        if item.priority == "Critical"
    )

    critical_trend = build_count_trend(
        "Critical Feedback",
        recent_critical,
        previous_critical
    )

    # ========================================================
    # TRENDING UP
    # ========================================================

    trending_up = [

        item

        for item in issue_trends

        if item["direction"] == "up"
    ]

    # ========================================================
    # TRENDING DOWN
    # ========================================================

    trending_down = [

        item

        for item in issue_trends

        if item["direction"] == "down"
    ]

    # ========================================================
    # NEW ISSUES
    # ========================================================

    new_issues = [

        item

        for item in issue_trends

        if item["status"] == "New"
    ]

    # ========================================================
    # SIGNIFICANT TRENDS
    # ========================================================

    significant_trends = [

        item

        for item in issue_trends

        if (
            item["status"] == "New"

            or (

                item["status"] == "Increasing"

                and item["change_percentage"] is not None

                and item["change_percentage"]
                >= TREND_THRESHOLD
            )
        )
    ]

    # ========================================================
    # MOST IMPORTANT EMERGING ISSUE
    # ========================================================

    emerging_issue = get_most_important_trend(
        issue_trends
    )

    # ========================================================
    # SENTIMENT TREND STATUS
    # ========================================================

    negative_status = (
        negative_trend["status"]
    )

    # ========================================================
    # CRITICAL STATUS
    # ========================================================

    critical_status = (
        critical_trend["status"]
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    if emerging_issue:

        if emerging_issue["status"] == "New":

            summary = (

                f"LOOP AI detected a new emerging issue: "
                f"'{emerging_issue['name']}' with "
                f"{emerging_issue['recent_count']} "
                f"recent occurrence(s)."
            )

        else:

            summary = (

                f"LOOP AI detected an increasing issue: "
                f"'{emerging_issue['name']}' increased "
                f"from {emerging_issue['previous_count']} "
                f"to {emerging_issue['recent_count']} "
                f"recent occurrence(s), a "
                f"{emerging_issue['change_percentage']}% "
                f"increase."
            )

    elif recent_feedback:

        summary = (

            "LOOP AI has recent feedback available, "
            "but no significant issue increase was "
            "detected yet."
        )

    else:

        summary = (

            "There is not enough recent feedback "
            "to calculate meaningful trends yet."
        )

    # ========================================================
    # RETURN TREND INTELLIGENCE
    # ========================================================

    return {

        "analysis_period": {

            "recent_days": 7,

            "previous_days": 7,

            "recent_start": recent_start,

            "previous_start": previous_start,

            "recent_feedback_count": (
                len(recent_feedback)
            ),

            "previous_feedback_count": (
                len(previous_feedback)
            )
        },

        "trend_threshold_percentage": (
            TREND_THRESHOLD
        ),

        "trending_up": trending_up,

        "trending_down": trending_down,

        "new_issues": new_issues,

        "significant_trends": significant_trends,

        "emerging_issue": emerging_issue,

        "issue_trends": issue_trends,

        "topic_trends": topic_trends,

        "negative_feedback": {

            "recent": recent_negative,

            "previous": previous_negative,

            "change_percentage": (
                negative_trend["change_percentage"]
            ),

            "status": negative_status,

            "direction": (
                negative_trend["direction"]
            )
        },

        "critical_feedback": {

            "recent": recent_critical,

            "previous": previous_critical,

            "change_percentage": (
                critical_trend["change_percentage"]
            ),

            "status": critical_status,

            "direction": (
                critical_trend["direction"]
            )
        },

        "summary": summary
    }


# ============================================================
# ISSUE COMMAND CENTER
# ============================================================

@app.get("/issues", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def get_issues(
    db: Session = Depends(get_db)
):

    feedback_list = (
        db.query(Feedback)
        .filter(
            Feedback.issue.isnot(None),
            Feedback.issue != ""
        )
        .order_by(
            Feedback.created_at.desc()
        )
        .all()
    )

    issue_map = {}

    for feedback in feedback_list:

        issue_name = feedback.issue

        if issue_name not in issue_map:

            issue_map[issue_name] = {

                "issue": issue_name,

                "topic": (
                    feedback.topic
                    or "General"
                ),

                "priority": (
                    feedback.priority
                    or "Medium"
                ),

                "count": 0,

                "feedback": []
            }

        issue_map[issue_name]["count"] += 1

        issue_map[issue_name]["feedback"].append(

            {
                "id": feedback.id,

                "customer_name": (
                    feedback.customer_name
                ),

                "feedback_text": (
                    feedback.feedback_text
                ),

                "source": feedback.source,

                "rating": feedback.rating,

                "sentiment": feedback.sentiment,

                "priority": feedback.priority,

                "created_at": feedback.created_at,
            }
        )

    issues = list(
        issue_map.values()
    )

    priority_order = {

        "Critical": 1,

        "High": 2,

        "Medium": 3,

        "Low": 4
    }

    issues.sort(

        key=lambda item: (

            priority_order.get(
                item["priority"],
                5
            ),

            -item["count"]
        )
    )

    return {

        "total_issues": len(issues),

        "issues": issues
    }


# ============================================================
# COPILOT HELPERS
# ============================================================

def get_negative_feedback(
    feedback_list
):

    return [

        item

        for item in feedback_list

        if item.sentiment == "Negative"
    ]


def get_positive_feedback(
    feedback_list
):

    return [

        item

        for item in feedback_list

        if item.sentiment == "Positive"
    ]


def get_critical_feedback(
    feedback_list
):

    return [

        item

        for item in feedback_list

        if item.priority == "Critical"
    ]


def get_top_counter_value(
    items,
    attribute
):

    values = [

        getattr(item, attribute)

        for item in items

        if getattr(item, attribute)
    ]

    if not values:

        return None, 0

    counter = Counter(values)

    return counter.most_common(1)[0]


def build_evidence(
    items,
    limit=3
):

    evidence = []

    for item in items[:limit]:

        evidence.append(

            {
                "id": item.id,

                "customer_name": (
                    item.customer_name
                ),

                "feedback": (
                    item.feedback_text
                ),

                "source": item.source,

                "rating": item.rating,

                "sentiment": item.sentiment,

                "priority": item.priority,

                "issue": item.issue,

                "topic": item.topic
            }
        )

    return evidence


# ============================================================
# COPILOT TOPIC DETECTION
# ============================================================

def detect_topic_from_question(
    question
):

    topic_keywords = {

        "Payment": [
            "payment",
            "payments",
            "paid",
            "pay",
            "charged",
            "transaction"
        ],

        "Refund": [
            "refund",
            "refunded",
            "money back",
            "reimbursement"
        ],

        "Delivery": [
            "delivery",
            "deliver",
            "shipping",
            "shipment",
            "late order",
            "order delay"
        ],

        "Authentication": [
            "login",
            "log in",
            "sign in",
            "password",
            "authentication",
            "otp",
            "account access"
        ],

        "Technical": [
            "crash",
            "bug",
            "technical",
            "error",
            "application",
            "app",
            "website",
            "system"
        ],

        "Customer Support": [
            "support",
            "agent",
            "service",
            "customer service"
        ],

        "Pricing": [
            "price",
            "pricing",
            "cost",
            "expensive",
            "subscription"
        ],

        "Cancellation": [
            "cancel",
            "cancellation"
        ],

        "Product": [
            "product",
            "feature",
            "quality"
        ]
    }

    for topic, keywords in topic_keywords.items():

        for keyword in keywords:

            if keyword in question:

                return topic

    return None


def get_topic_feedback(
    feedback_list,
    topic
):

    return [

        item

        for item in feedback_list

        if item.topic

        and item.topic.lower()
        == topic.lower()
    ]


def get_issue_summary(
    items
):

    counter = Counter(

        item.issue

        for item in items

        if item.issue
    )

    return counter


def build_topic_insight(
    topic,
    items
):

    if not items:

        return (

            f"There is currently no feedback "
            f"specifically classified under "
            f"the {topic} topic."
        )

    negative = [

        item

        for item in items

        if item.sentiment == "Negative"
    ]

    positive = [

        item

        for item in items

        if item.sentiment == "Positive"
    ]

    critical = [

        item

        for item in items

        if item.priority == "Critical"
    ]

    issue_counter = get_issue_summary(
        items
    )

    top_issue = (

        issue_counter.most_common(1)[0]

        if issue_counter

        else None
    )

    answer = (

        f"LOOP AI found {len(items)} "
        f"feedback entries related to {topic}. "
        f"{len(negative)} are negative, "
        f"{len(positive)} are positive, and "
        f"{len(critical)} are marked critical."
    )

    if top_issue:

        answer += (

            f" The most frequently detected "
            f"issue is '{top_issue[0]}', "
            f"appearing {top_issue[1]} time(s)."
        )

    return answer


def build_topic_recommendations(
    topic,
    items
):

    recommendations = []

    negative = [

        item

        for item in items

        if item.sentiment == "Negative"
    ]

    critical = [

        item

        for item in items

        if item.priority == "Critical"
    ]

    issue_counter = get_issue_summary(
        negative
    )

    if issue_counter:

        top_issue, count = (
            issue_counter.most_common(1)[0]
        )

        recommendations.append(

            f"Investigate '{top_issue}' "
            f"because it appears {count} "
            f"time(s) in negative "
            f"{topic.lower()} feedback."
        )

    if critical:

        recommendations.append(

            f"Review {len(critical)} critical "
            f"{topic.lower()} feedback entries "
            f"immediately."
        )

    recommendations.append(

        f"Monitor {topic.lower()} feedback "
        f"after corrective changes."
    )

    recommendations.append(

        "Measure whether customer complaints "
        "decrease after the fix."
    )

    return recommendations


# ============================================================
# AI COPILOT
# ============================================================

@app.post("/copilot", dependencies=[Depends(require_roles("Admin", "Manager", "Analyst"))])
def copilot(
    request: CopilotRequest,
    db: Session = Depends(get_db)
):

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    feedback_list = (
        db.query(Feedback)
        .order_by(
            Feedback.created_at.desc()
        )
        .all()
    )

    analyzed = [

        item

        for item in feedback_list

        if item.sentiment
    ]

    negative = get_negative_feedback(
        feedback_list
    )

    positive = get_positive_feedback(
        feedback_list
    )

    critical = get_critical_feedback(
        feedback_list
    )

    question_lower = question.lower()

    # ========================================================
    # TOPIC-SPECIFIC INTELLIGENCE
    # ========================================================

    detected_topic = detect_topic_from_question(
        question_lower
    )

    topic_question_words = [

        "about",

        "regarding",

        "related to",

        "saying about",

        "problem with",

        "issue with",

        "feedback on",

        "feedback about"
    ]

    if (
        detected_topic

        and any(
            phrase in question_lower
            for phrase in topic_question_words
        )
    ):

        topic_feedback = get_topic_feedback(
            feedback_list,
            detected_topic
        )

        answer = build_topic_insight(
            detected_topic,
            topic_feedback
        )

        recommendations = build_topic_recommendations(
            detected_topic,
            topic_feedback
        )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "topic_analysis",

            "metrics": {

                "topic": detected_topic,

                "total": len(topic_feedback),

                "negative": sum(
                    1
                    for item in topic_feedback
                    if item.sentiment == "Negative"
                ),

                "positive": sum(
                    1
                    for item in topic_feedback
                    if item.sentiment == "Positive"
                ),

                "critical": sum(
                    1
                    for item in topic_feedback
                    if item.priority == "Critical"
                )
            },

            "evidence": build_evidence(
                topic_feedback,
                5
            ),

            "recommendations": recommendations
        }

    # ========================================================
    # TOTAL FEEDBACK
    # ========================================================

    if (
        "how many feedback"
        in question_lower

        or "total feedback"
        in question_lower

        or "how much feedback"
        in question_lower
    ):

        total = len(
            feedback_list
        )

        answer = (

            f"LOOP AI currently has {total} "
            f"customer feedback entries in the "
            f"database. {len(analyzed)} of them "
            f"have been analyzed."
        )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "total_feedback",

            "metrics": {

                "total": total,

                "analyzed": len(analyzed)
            },

            "evidence": build_evidence(
                feedback_list,
                3
            ),

            "recommendations": []
        }

    # ========================================================
    # COMPLAINTS
    # ========================================================

    if (
        "how many customers complained"
        in question_lower

        or "how many complaints"
        in question_lower

        or "complaints"
        in question_lower
    ):

        complaint_count = len(
            negative
        )

        percentage = 0

        if len(analyzed) > 0:

            percentage = round(

                (
                    complaint_count
                    / len(analyzed)
                ) * 100,

                1
            )

        answer = (

            f"There are {complaint_count} "
            f"negative feedback entries in "
            f"the current dataset. They represent "
            f"{percentage}% of analyzed feedback."
        )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "complaints",

            "metrics": {

                "complaints": complaint_count,

                "percentage": percentage
            },

            "evidence": build_evidence(
                negative,
                3
            ),

            "recommendations": [

                "Review recurring negative issues.",

                "Prioritize critical customer complaints.",

                "Track whether complaint volume "
                "changes over time."
            ]
        }

    # ========================================================
    # SENTIMENT
    # ========================================================

    if (
        "sentiment"
        in question_lower

        or "customers happy"
        in question_lower

        or "customers unhappy"
        in question_lower

        or "how are customers feeling"
        in question_lower
    ):

        sentiment_counter = Counter(

            item.sentiment

            for item in analyzed

            if item.sentiment
        )

        positive_count = (
            sentiment_counter.get(
                "Positive",
                0
            )
        )

        negative_count = (
            sentiment_counter.get(
                "Negative",
                0
            )
        )

        neutral_count = (
            sentiment_counter.get(
                "Neutral",
                0
            )
        )

        answer = (

            f"Customer sentiment currently "
            f"contains {positive_count} positive, "
            f"{negative_count} negative and "
            f"{neutral_count} neutral responses."
        )

        if negative_count > positive_count:

            answer += (

                " Negative feedback currently "
                "represents the larger share of "
                "analyzed responses."
            )

        elif positive_count > negative_count:

            answer += (

                " Positive feedback currently "
                "represents the larger share of "
                "analyzed responses."
            )

        else:

            answer += (

                " Positive and negative feedback "
                "are currently balanced in the "
                "available dataset."
            )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "sentiment_analysis",

            "metrics": {

                "positive": positive_count,

                "negative": negative_count,

                "neutral": neutral_count
            },

            "evidence": build_evidence(
                negative + positive,
                4
            ),

            "recommendations": [

                "Monitor negative sentiment regularly.",

                "Investigate repeated negative themes.",

                "Identify positive experiences "
                "that can be preserved."
            ]
        }

    # ========================================================
    # BIGGEST ISSUE
    # ========================================================

    if (
        "biggest issue"
        in question_lower

        or "main issue"
        in question_lower

        or "top issue"
        in question_lower

        or "most common issue"
        in question_lower

        or "customers unhappy about"
        in question_lower
    ):

        issue_name, issue_count = (
            get_top_counter_value(
                analyzed,
                "issue"
            )
        )

        if issue_name:

            related = [

                item

                for item in analyzed

                if item.issue == issue_name
            ]

            answer = (

                f"The most frequently reported "
                f"issue is '{issue_name}', appearing "
                f"{issue_count} times in the "
                f"analyzed feedback."
            )

            return {

                "question": question,

                "answer": answer,

                "source": "LOOP AI database",

                "intent": "top_issue",

                "metrics": {

                    "issue": issue_name,

                    "count": issue_count
                },

                "evidence": build_evidence(
                    related,
                    4
                ),

                "recommendations": [

                    f"Investigate the recurring "
                    f"'{issue_name}' issue.",

                    "Review the customer journey "
                    "around this problem.",

                    "Track this issue after the "
                    "next product release."
                ]
            }

        return {

            "question": question,

            "answer": (
                "There is not enough analyzed "
                "feedback to identify a dominant "
                "issue yet."
            ),

            "source": "LOOP AI database",

            "intent": "top_issue",

            "metrics": {},

            "evidence": [],

            "recommendations": [

                "Add more customer feedback.",

                "Run analysis on the new feedback."
            ]
        }

    # ========================================================
    # CRITICAL ISSUES
    # ========================================================

    if (
        "critical"
        in question_lower

        or "urgent"
        in question_lower

        or "highest priority"
        in question_lower

        or "needs attention first"
        in question_lower
    ):

        critical_count = len(
            critical
        )

        issue_counter = Counter(

            item.issue

            for item in critical

            if item.issue
        )

        top_critical_issue = (

            issue_counter.most_common(1)[0]

            if issue_counter

            else None
        )

        if top_critical_issue:

            issue_name, count = (
                top_critical_issue
            )

            answer = (

                f"There are {critical_count} "
                f"critical feedback entries. "
                f"The most repeated critical issue "
                f"is '{issue_name}', with {count} "
                f"occurrence(s)."
            )

        else:

            answer = (

                f"There are {critical_count} "
                f"critical feedback entries in "
                f"the current dataset."
            )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "critical_issues",

            "metrics": {

                "critical": critical_count
            },

            "evidence": build_evidence(
                critical,
                4
            ),

            "recommendations": [

                "Review critical feedback immediately.",

                "Assign ownership to the relevant "
                "product team.",

                "Monitor the issue until its "
                "occurrence decreases."
            ]
        }

    # ========================================================
    # SOURCES / CHANNELS
    # ========================================================

    if (
        "channel"
        in question_lower

        or "source"
        in question_lower

        or "platform"
        in question_lower

        or "where are complaints coming"
        in question_lower
    ):

        source_counter = Counter(

            item.source or "Unknown"

            for item in feedback_list
        )

        if source_counter:

            top_source, count = (
                source_counter.most_common(1)[0]
            )

            answer = (

                f"The channel with the most "
                f"feedback is '{top_source}', "
                f"with {count} entries."
            )

        else:

            answer = (
                "There is currently no "
                "source/channel information available."
            )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "source_analysis",

            "metrics": dict(
                source_counter
            ),

            "evidence": build_evidence(
                feedback_list,
                4
            ),

            "recommendations": [

                "Compare complaint volume "
                "across channels.",

                "Investigate channels producing "
                "repeated negative feedback."
            ]
        }

    # ========================================================
    # POSITIVE FEEDBACK
    # ========================================================

    if (
        "what do customers like"
        in question_lower

        or "positive feedback"
        in question_lower

        or "what customers like"
        in question_lower

        or "what customers love"
        in question_lower
    ):

        topic_counter = Counter(

            item.topic

            for item in positive

            if item.topic
        )

        answer = (

            f"There are {len(positive)} "
            f"positive feedback entries in "
            f"the current dataset."
        )

        if topic_counter:

            topic, count = (
                topic_counter.most_common(1)[0]
            )

            answer += (

                f" The most represented "
                f"positive topic is '{topic}', "
                f"with {count} response(s)."
            )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "positive_feedback",

            "metrics": {

                "positive": len(positive)
            },

            "evidence": build_evidence(
                positive,
                4
            ),

            "recommendations": [

                "Identify successful product experiences.",

                "Preserve features associated "
                "with positive feedback.",

                "Use positive feedback to identify "
                "product strengths."
            ]
        }

    # ========================================================
    # RECOMMENDATIONS / ACTIONS
    # ========================================================

    if (
        "recommend"
        in question_lower

        or "what should we do"
        in question_lower

        or "what should we fix"
        in question_lower

        or "what actions"
        in question_lower

        or "action should"
        in question_lower

        or "improve"
        in question_lower
    ):

        issue_counter = Counter(

            item.issue

            for item in negative

            if item.issue
        )

        recommendations = []

        if issue_counter:

            top_issue, count = (
                issue_counter.most_common(1)[0]
            )

            recommendations.append(

                f"Prioritize investigation of "
                f"{top_issue} ({count} occurrences)."
            )

        if critical:

            recommendations.append(

                f"Review {len(critical)} critical "
                f"feedback entries immediately."
            )

        if negative:

            recommendations.append(

                "Review negative feedback for "
                "recurring patterns."
            )

        recommendations.append(

            "Track the impact of fixes through "
            "future feedback."
        )

        answer = (

            "Based on the current LOOP AI dataset, "
            "the main recommended actions are "
            "focused on recurring customer problems "
            "and high-priority feedback."
        )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "recommendations",

            "metrics": {

                "negative": len(negative),

                "critical": len(critical)
            },

            "evidence": build_evidence(
                negative,
                4
            ),

            "recommendations": recommendations
        }

    # ========================================================
    # RECENT / TODAY
    # ========================================================

    if (
        "today"
        in question_lower

        or "recent"
        in question_lower

        or "latest"
        in question_lower
    ):

        today = datetime.now().date()

        recent = []

        for item in feedback_list:

            if item.created_at:

                if (
                    item.created_at.date()
                    == today
                ):

                    recent.append(item)

        answer = (

            f"There are {len(recent)} "
            f"feedback entries from today "
            f"in the available database."
        )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "recent_feedback",

            "metrics": {

                "today": len(recent)
            },

            "evidence": build_evidence(
                recent,
                5
            ),

            "recommendations": []
        }

    # ========================================================
    # EXECUTIVE SUMMARY
    # ========================================================

    if (
        "summary"
        in question_lower

        or "overview"
        in question_lower

        or "executive"
        in question_lower
    ):

        total = len(
            feedback_list
        )

        sentiment_counter = Counter(

            item.sentiment

            for item in analyzed

            if item.sentiment
        )

        issue_counter = Counter(

            item.issue

            for item in analyzed

            if item.issue
        )

        top_issue = (

            issue_counter.most_common(1)[0]

            if issue_counter

            else None
        )

        answer = (

            f"LOOP AI has {total} feedback "
            f"entries, with {len(analyzed)} "
            f"analyzed. There are {len(negative)} "
            f"negative and {len(positive)} positive "
            f"responses, with {len(critical)} "
            f"critical issues."
        )

        if top_issue:

            answer += (

                f" The most recurring issue is "
                f"'{top_issue[0]}' with "
                f"{top_issue[1]} occurrence(s)."
            )

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI database",

            "intent": "executive_summary",

            "metrics": {

                "total": total,

                "analyzed": len(analyzed),

                "positive": sentiment_counter.get(
                    "Positive",
                    0
                ),

                "negative": sentiment_counter.get(
                    "Negative",
                    0
                ),

                "neutral": sentiment_counter.get(
                    "Neutral",
                    0
                ),

                "critical": len(critical)
            },

            "evidence": build_evidence(
                negative + critical,
                4
            ),

            "recommendations": [

                "Prioritize recurring critical issues.",

                "Monitor negative sentiment trends.",

                "Measure whether corrective actions "
                "reduce complaints."
            ]
        }

    # ========================================================
    # TREND QUESTIONS IN COPILOT
    # ========================================================

    if (
        "trend"
        in question_lower

        or "trending"
        in question_lower

        or "emerging issue"
        in question_lower

        or "increasing issue"
        in question_lower

        or "increased recently"
        in question_lower
    ):

        trend_data = trends(db)

        emerging = trend_data.get(
            "emerging_issue"
        )

        if emerging:

            if emerging["status"] == "New":

                answer = (

                    f"LOOP AI detected a new emerging "
                    f"issue: '{emerging['name']}' with "
                    f"{emerging['recent_count']} recent "
                    f"occurrence(s)."
                )

            else:

                answer = (

                    f"LOOP AI detected an increasing "
                    f"issue: '{emerging['name']}'. "
                    f"It increased from "
                    f"{emerging['previous_count']} "
                    f"to {emerging['recent_count']} "
                    f"occurrence(s) in the recent period."
                )

        else:

            answer = trend_data["summary"]

        return {

            "question": question,

            "answer": answer,

            "source": "LOOP AI trend engine",

            "intent": "trend_analysis",

            "metrics": {

                "recent_feedback": (
                    trend_data[
                        "analysis_period"
                    ][
                        "recent_feedback_count"
                    ]
                ),

                "previous_feedback": (
                    trend_data[
                        "analysis_period"
                    ][
                        "previous_feedback_count"
                    ]
                ),

                "trend_threshold_percentage": (
                    trend_data[
                        "trend_threshold_percentage"
                    ]
                ),

                "emerging_issue": (
                    emerging["name"]
                    if emerging
                    else None
                )
            },

            "evidence": [],

            "recommendations": [

                "Monitor increasing issues regularly.",

                "Investigate newly emerging complaints.",

                "Compare issue frequency after "
                "corrective actions."
            ]
        }

    # ========================================================
    # FALLBACK
    # ========================================================

    return {

        "question": question,

        "answer": (

            "I can analyze your LOOP AI customer data. "
            "You can ask me about feedback volume, "
            "sentiment, complaints, payment, refunds, "
            "delivery, authentication, technical problems, "
            "top issues, critical issues, channels, "
            "positive feedback, recommendations, "
            "recent feedback, trends, emerging issues, "
            "or an executive summary."
        ),

        "source": "LOOP AI database",

        "intent": "help",

        "metrics": {},

        "evidence": [],

        "recommendations": []
    }