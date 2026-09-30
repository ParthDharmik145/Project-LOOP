import re


def analyze_feedback(text: str, rating: int | None = None):
    """
    LOOP AI - Customer Feedback Intelligence Engine

    Performs:
    1. Sentiment analysis
    2. Topic detection
    3. Specific issue detection
    4. Priority calculation
    5. Confidence scoring

    Lightweight local NLP/rule-based engine.
    """

    # ---------------------------------------------------------
    # INPUT CLEANING
    # ---------------------------------------------------------

    text = text.strip()

    if not text:
        return {
            "sentiment": "Neutral",
            "sentiment_score": 0.60,
            "topic": "General",
            "issue": "General Feedback",
            "priority": "Medium"
        }

    text_lower = text.lower()
    text_lower = re.sub(r"\s+", " ", text_lower)

    # ---------------------------------------------------------
    # SENTIMENT ANALYSIS
    # ---------------------------------------------------------

    negative_words = [
        "bad",
        "poor",
        "worst",
        "terrible",
        "horrible",
        "awful",
        "disappointed",
        "disappointing",
        "frustrated",
        "frustrating",
        "angry",
        "unhappy",
        "fail",
        "fails",
        "failed",
        "failure",
        "problem",
        "problems",
        "issue",
        "issues",
        "error",
        "errors",
        "bug",
        "bugs",
        "broken",
        "slow",
        "delay",
        "delayed",
        "late",
        "stuck",
        "crash",
        "crashes",
        "crashed",
        "not working",
        "doesn't work",
        "does not work",
        "can't",
        "cannot",
        "unable",
        "never received",
        "missing"
    ]

    positive_words = [
        "good",
        "great",
        "excellent",
        "amazing",
        "awesome",
        "love",
        "loved",
        "happy",
        "satisfied",
        "helpful",
        "fast",
        "quick",
        "easy",
        "simple",
        "smooth",
        "perfect",
        "fantastic",
        "wonderful",
        "reliable",
        "useful"
    ]

    negative_count = sum(
        1 for word in negative_words
        if word in text_lower
    )

    positive_count = sum(
        1 for word in positive_words
        if word in text_lower
    )

    if rating is not None:

        if rating <= 2:
            negative_count += 2

        elif rating >= 4:
            positive_count += 2

    if negative_count > positive_count:

        sentiment = "Negative"

        if negative_count >= 4:
            sentiment_score = 0.98
        elif negative_count >= 2:
            sentiment_score = 0.95
        else:
            sentiment_score = 0.90

    elif positive_count > negative_count:

        sentiment = "Positive"

        if positive_count >= 4:
            sentiment_score = 0.97
        elif positive_count >= 2:
            sentiment_score = 0.93
        else:
            sentiment_score = 0.90

    else:

        sentiment = "Neutral"
        sentiment_score = 0.60

    # ---------------------------------------------------------
    # TOPIC + ISSUE DETECTION
    # ---------------------------------------------------------
    #
    # IMPORTANT:
    # More specific topics are checked first.
    # This prevents words such as "arrived" inside a
    # refund complaint from incorrectly becoming Delivery.
    # ---------------------------------------------------------

    topic = "General"
    issue = "General Feedback"

    # =========================================================
    # PAYMENT
    # =========================================================

    if any(word in text_lower for word in [
        "payment",
        "pay",
        "transaction",
        "card",
        "upi",
        "bank",
        "checkout",
        "charged",
        "debit",
        "credit"
    ]):

        topic = "Payment"

        if any(word in text_lower for word in [
            "charged twice",
            "double charged",
            "duplicate",
            "two times"
        ]):
            issue = "Duplicate Payment"

        elif any(word in text_lower for word in [
            "fail",
            "failed",
            "failure",
            "declined",
            "rejected",
            "cannot pay",
            "can't pay",
            "not going through",
            "not working"
        ]):
            issue = "Payment Failure"

        elif any(word in text_lower for word in [
            "money deducted",
            "amount deducted",
            "debited"
        ]):
            issue = "Payment Deduction Issue"

        elif "checkout" in text_lower:
            issue = "Checkout Payment Issue"

        else:
            issue = "Payment Issue"

    # =========================================================
    # REFUND
    # =========================================================

    elif any(word in text_lower for word in [
        "refund",
        "money back",
        "reimbursement"
    ]):

        topic = "Refund"

        if any(word in text_lower for word in [
            "delay",
            "delayed",
            "waiting",
            "not received",
            "haven't received",
            "have not received",
            "not credited",
            "not arrived",
            "has not arrived",
            "hasn't arrived"
        ]):
            issue = "Refund Delay"

        elif any(word in text_lower for word in [
            "denied",
            "rejected",
            "refused"
        ]):
            issue = "Refund Rejected"

        else:
            issue = "Refund Issue"

    # =========================================================
    # AUTHENTICATION
    # =========================================================

    elif any(word in text_lower for word in [
        "login",
        "log in",
        "sign in",
        "signin",
        "password",
        "account access",
        "authentication",
        "otp",
        "verification"
    ]):

        topic = "Authentication"

        if any(word in text_lower for word in [
            "forgot password",
            "reset password"
        ]):
            issue = "Password Issue"

        elif any(word in text_lower for word in [
            "otp",
            "verification",
            "code"
        ]):
            issue = "OTP / Verification Issue"

        elif any(word in text_lower for word in [
            "blocked",
            "locked"
        ]):
            issue = "Account Access Issue"

        elif any(word in text_lower for word in [
            "fail",
            "failed",
            "cannot",
            "can't",
            "not working"
        ]):
            issue = "Login Failure"

        else:
            issue = "Login Issue"

    # =========================================================
    # DELIVERY
    # =========================================================

    elif any(word in text_lower for word in [
        "delivery",
        "deliver",
        "shipping",
        "shipment",
        "order arrived",
        "courier",
        "package"
    ]):

        topic = "Delivery"

        if any(word in text_lower for word in [
            "late",
            "delay",
            "delayed",
            "slow",
            "days late",
            "not arrived",
            "haven't arrived",
            "never arrived"
        ]):
            issue = "Delivery Delay"

        elif any(word in text_lower for word in [
            "damaged",
            "broken package",
            "damaged package"
        ]):
            issue = "Damaged Delivery"

        elif any(word in text_lower for word in [
            "wrong address",
            "wrong location"
        ]):
            issue = "Delivery Address Issue"

        elif any(word in text_lower for word in [
            "missing",
            "lost",
            "not received"
        ]):
            issue = "Missing Delivery"

        else:
            issue = "Delivery Issue"

    # =========================================================
    # TECHNICAL
    # =========================================================

    elif any(word in text_lower for word in [
        "app crash",
        "application crash",
        "website crash",
        "software crash",
        "crashes",
        "crashed",
        "bug",
        "bugs",
        "system error",
        "technical error"
    ]):

        topic = "Technical"

        if any(word in text_lower for word in [
            "crash",
            "crashes",
            "crashed"
        ]):
            issue = "Application Crash"

        else:
            issue = "Technical Error"

    elif any(word in text_lower for word in [
        "app is slow",
        "application is slow",
        "website is slow",
        "app lag",
        "lagging",
        "performance issue"
    ]):

        topic = "Technical"
        issue = "Performance Issue"

    # =========================================================
    # CUSTOMER SUPPORT
    # =========================================================

    elif any(word in text_lower for word in [
        "support",
        "customer service",
        "customer care",
        "agent",
        "representative",
        "help desk"
    ]):

        topic = "Customer Support"

        if any(word in text_lower for word in [
            "no response",
            "no reply",
            "didn't respond",
            "did not respond",
            "waiting"
        ]):
            issue = "Support Response Delay"

        elif any(word in text_lower for word in [
            "rude",
            "unhelpful",
            "bad service",
            "poor service"
        ]):
            issue = "Poor Customer Support"

        else:
            issue = "Customer Support Issue"

    # =========================================================
    # PRODUCT
    # =========================================================

    elif any(word in text_lower for word in [
        "product quality",
        "poor quality",
        "low quality",
        "defective",
        "defect",
        "damaged product",
        "broken item",
        "wrong item"
    ]):

        topic = "Product"

        if any(word in text_lower for word in [
            "quality",
            "poor quality",
            "low quality"
        ]):
            issue = "Product Quality"

        elif any(word in text_lower for word in [
            "defective",
            "defect",
            "broken"
        ]):
            issue = "Defective Product"

        elif any(word in text_lower for word in [
            "wrong item",
            "incorrect item"
        ]):
            issue = "Wrong Product"

        else:
            issue = "Product Issue"

    # =========================================================
    # PRICING
    # =========================================================

    elif any(word in text_lower for word in [
        "pricing",
        "expensive",
        "too costly",
        "high price",
        "overpriced",
        "discount",
        "coupon",
        "promo",
        "hidden charge"
    ]):

        topic = "Pricing"

        if any(word in text_lower for word in [
            "expensive",
            "too costly",
            "high price",
            "overpriced"
        ]):
            issue = "High Pricing"

        elif any(word in text_lower for word in [
            "discount",
            "coupon",
            "promo"
        ]):
            issue = "Discount / Offer Issue"

        elif any(word in text_lower for word in [
            "fee",
            "extra charge",
            "hidden charge"
        ]):
            issue = "Unexpected Charge"

        else:
            issue = "Pricing Issue"

    # =========================================================
    # CANCELLATION
    # =========================================================

    elif any(word in text_lower for word in [
        "cancel",
        "cancellation",
        "cancelled",
        "canceled"
    ]):

        topic = "Cancellation"

        if any(word in text_lower for word in [
            "cannot cancel",
            "can't cancel",
            "unable to cancel"
        ]):
            issue = "Cancellation Failure"

        else:
            issue = "Cancellation Issue"

    # =========================================================
    # POSITIVE GENERAL FEEDBACK
    # =========================================================

    elif sentiment == "Positive":

        topic = "General"
        issue = "Positive Feedback"

    # ---------------------------------------------------------
    # PRIORITY DETECTION
    # ---------------------------------------------------------

    critical_keywords = [
        "fraud",
        "hacked",
        "security",
        "stolen",
        "data breach",
        "charged twice",
        "double charged",
        "money deducted",
        "account blocked",
        "cannot login",
        "payment failed",
        "payment failure",
        "system down",
        "crash",
        "not working"
    ]

    high_keywords = [
        "failed",
        "failure",
        "error",
        "broken",
        "refund delay",
        "delivery delay",
        "very slow",
        "unable",
        "cannot",
        "can't",
        "complaint",
        "disappointed",
        "angry"
    ]

    critical_signal = any(
        word in text_lower
        for word in critical_keywords
    )

    high_signal = any(
        word in text_lower
        for word in high_keywords
    )

    if rating is not None and rating <= 2:
        priority = "Critical"

    elif critical_signal:
        priority = "Critical"

    elif rating == 3:
        priority = "Medium"

    elif sentiment == "Negative" and high_signal:
        priority = "High"

    elif sentiment == "Negative":
        priority = "High"

    elif sentiment == "Positive":
        priority = "Low"

    else:
        priority = "Medium"

    # ---------------------------------------------------------
    # RETURN ANALYSIS
    # ---------------------------------------------------------

    return {
        "sentiment": sentiment,
        "sentiment_score": sentiment_score,
        "topic": topic,
        "issue": issue,
        "priority": priority
    }