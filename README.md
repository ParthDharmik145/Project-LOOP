# LOOP AI -- AI Customer Feedback Intelligence Platform

> **Listen. Organize. Understand. Prioritize. Act.**

LOOP AI is an AI-powered customer feedback intelligence platform that
helps organizations collect, analyze, prioritize, and act on customer
feedback from a centralized SaaS-style dashboard.

🔗 **[Live Demo](https://project-loop-amber.vercel.app/)** ·
💻 **[GitHub Repository](https://github.com/ParthDharmik145/Project-LOOP)**

## 🚀 Project Overview

Customer feedback is often scattered across different channels and
difficult to analyze manually. LOOP AI provides a centralized platform
where teams can:

-   Collect customer feedback
-   Automatically analyze sentiment
-   Detect topics and recurring issues
-   Prioritize critical customer problems
-   Monitor trends and emerging concerns
-   Explore interactive analytics
-   Ask questions through an AI Copilot
-   Generate period-specific intelligence reports
-   Import feedback through CSV/Excel
-   Manage access with role-based permissions

## 🌐 Live Demo

🔗 **Live Application:** https://project-loop-amber.vercel.app/

The deployed application can be opened directly in a browser for demonstration and evaluation.

### 🔐 Demo Access

A dedicated **Viewer Demo Login** is available for evaluation.

- **Email:** `demo.viewer@loopai.com`
- **Role:** `Viewer`
- **Password:** Not required for the public Viewer demo
- **Access:** Read-only application access

> **Security note:** Administrative, Manager, Analyst, database, and production credentials are intentionally not published in this repository.

## 💡 Why LOOP?

**LOOP = Listen → Organize → Understand → Prioritize → Act**

  Stage            Meaning
  ---------------- ---------------------------------------
  **Listen**       Collect customer feedback
  **Organize**     Structure feedback and customer data
  **Understand**   Analyze sentiment, topics, and issues
  **Prioritize**   Identify critical problems
  **Act**          Turn insights into business actions

## ✨ Key Features

### 📥 Feedback Management

-   Add customer feedback manually
-   Store customer name, feedback, source, and rating
-   Search and filter feedback
-   Delete feedback for authorized roles
-   Bulk import CSV/Excel files
-   Reanalyze existing feedback

### 🤖 AI Feedback Analysis

LOOP AI analyzes feedback and generates:

-   Sentiment
-   Sentiment confidence score
-   Topic
-   Issue
-   Priority

Example:

``` text
Customer Feedback:
"The payment failed twice and my order was delayed."

AI Analysis:
Sentiment: Negative
Topic: Payment
Issue: Payment Failure
Priority: Critical
```

Supported intelligence patterns include payment failures, duplicate
payments, refund delays, delivery delays, application crashes,
authentication problems, support issues, product issues, pricing
concerns, and cancellation problems.

### 📊 Dashboard & Analytics

The platform provides:

-   Total feedback
-   Positive / negative / neutral feedback
-   Critical issues
-   Sentiment distribution
-   Topic distribution
-   Issue patterns
-   Feedback trends
-   Emerging concerns

Interactive charts make customer intelligence easier to understand.

### 🚨 Issue Command Center

LOOP AI converts individual feedback into identifiable business
problems.

Priority levels:

-   🔴 Critical
-   🟠 High
-   🟡 Medium
-   🟢 Low

Users can inspect issue details and understand which problems require
attention.

### 🎯 Action Center

LOOP AI converts detected issues into recommended actions.

Example:

``` text
Detected Issue:
Payment failures

Recommended Action:
Investigate payment gateway failures and review recent
transaction error logs.
```

The goal is:

**Feedback → Insight → Action**

### 🧠 AI Copilot

The AI Copilot allows users to ask questions about customer feedback.

Example questions:

``` text
What is the overall sentiment of customer feedback?

What are the most critical issues customers are facing?

What is the most common problem?

What problems are increasing recently?

What actions should the company take to improve customer satisfaction?
```

### 📄 Intelligence Reports

Reports support:

-   **Monthly Report**
-   **Custom Date Range**

Reports include:

-   Report period
-   Total feedback
-   Sentiment distribution
-   Critical issues
-   Previous-period feedback
-   Change compared with the previous period
-   Top issue
-   Recommended action

Reports can be downloaded as text files.

### 👥 Authentication & Role-Based Access

Supported roles:

  Role                  Access
  --------------------- ------------------------------------------
  **Admin**             Full platform and user-management access
  **Manager**           Management and data-operation access
  **Analyst**           Feedback analysis and analytics access
  **Product Manager**   Product-focused platform access
  **Support Agent**     Support-focused platform access
  **Viewer**            Read-only access

The public passwordless demo is restricted to **Viewer**. Privileged
roles use email/password authentication.

### 📁 Bulk Import

Feedback can be imported using:

-   CSV
-   Excel (`.xlsx`)

## 🏗️ System Architecture

``` text
                    ┌──────────────────────────┐
                    │        LOOP AI UI        │
                    │     React + Vite         │
                    └────────────┬─────────────┘
                                 │
                              Axios API
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      FastAPI Backend     │
                    │ Authentication / APIs    │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │    AI Engine     │      │  Business APIs   │
          │ Sentiment/Topic  │      │ Analytics/Issues │
          │ Issue/Priority   │      │ Reports/Copilot  │
          └────────┬─────────┘      └────────┬─────────┘
                   │                         │
                   └────────────┬────────────┘
                                ▼
                    ┌──────────────────────────┐
                    │       MySQL Database     │
                    │         loop_ai          │
                    └──────────────────────────┘
```

### Production Architecture

``` text
User Browser
     │
     ▼
Vercel
React / Vite Frontend
     │
     ▼
Render
FastAPI Backend
     │
     ▼
Aiven
MySQL Database
```

## 🛠️ Technology Stack

### Frontend

-   React
-   Vite
-   JavaScript
-   Axios
-   Recharts
-   Lucide React
-   CSS

### Backend

-   Python
-   FastAPI
-   Uvicorn
-   SQLAlchemy
-   Pydantic
-   PyMySQL
-   JWT authentication
-   Argon2 password hashing

### Database

-   MySQL

### Data Processing

-   Pandas
-   OpenPyXL

### Deployment

-   Vercel -- Frontend
-   Render -- Backend
-   Aiven -- MySQL Database
-   GitHub -- Source Control

## 📂 Project Structure

``` text
Project-LOOP/
│
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── ai_engine.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── requirements.txt
│   ├── ca.pem
│   └── ...
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

> Environment files and database backups are intentionally excluded from
> version control.

## ⚙️ Local Installation

### 1. Clone the repository

``` bash
git clone https://github.com/ParthDharmik145/Project-LOOP.git
cd Project-LOOP
```

### 2. Backend setup

``` bash
cd backend
python -m venv venv
```

Windows PowerShell:

``` powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

``` bash
pip install -r requirements.txt
```

Configure the required local environment variables, then start the
backend:

``` bash
uvicorn main:app --reload
```

Local API:

``` text
http://127.0.0.1:8000
```

### 3. Frontend setup

Open another terminal:

``` bash
cd frontend
npm install
npm run dev
```

The frontend normally runs on:

``` text
http://localhost:5173
```

## 🔐 Environment Variables

Do not commit production secrets to GitHub.

Backend:

``` env
DATABASE_URL=your_database_connection_string
SECRET_KEY=your_secret_key
FRONTEND_URL=http://localhost:5173
```

Frontend:

``` env
VITE_API_URL=http://127.0.0.1:8000
```

Use your own local or production values.

## 🔌 Main API Areas

The FastAPI backend provides API areas for:

-   Authentication
-   User management
-   Feedback
-   Bulk feedback import
-   Feedback reanalysis
-   Dashboard statistics
-   Analytics
-   Trends
-   Issues
-   AI Copilot
-   Reports

FastAPI interactive documentation is available at:

``` text
/docs
```

when the backend is running.

## 📈 Example Intelligence Flow

``` text
Customer Feedback
       │
       ▼
Text Analysis
       │
       ├── Sentiment
       ├── Confidence
       ├── Topic
       ├── Issue
       └── Priority
       │
       ▼
Analytics
       │
       ├── Trends
       ├── Recurring Issues
       └── Critical Problems
       │
       ▼
Action Center
       │
       ▼
Recommended Business Action
```

## 🎯 Example Use Cases

LOOP AI can support:

-   Product feedback analysis
-   Customer support monitoring
-   Payment issue detection
-   Delivery issue tracking
-   Refund monitoring
-   Application issue detection
-   Customer satisfaction analysis
-   Product improvement decisions
-   Management reporting

## 🌐 Deployment

``` text
Frontend  → Vercel
Backend   → Render
Database  → Aiven MySQL
Source    → GitHub
```

## 🔭 Future Enhancements

Potential future improvements include:

-   More advanced transformer-based NLP models
-   Semantic embeddings for deeper feedback similarity
-   Automated anomaly detection
-   Advanced forecasting
-   Email/Slack alerts for critical issues
-   Additional feedback-channel integrations
-   PDF report generation
-   More configurable business rules
-   Real-time notification systems

These are future ideas and are not represented as currently implemented
features.

## 📸 Screenshots

Screenshots can be added here to showcase:

1.  Landing page
2.  Sign-in page
3.  Dashboard
4.  Feedback management
5.  Analytics
6.  Issue Command Center
7.  Action Center
8.  AI Copilot
9.  Reports
10. Team & Access

Example:

``` markdown
![LOOP AI Dashboard](docs/screenshots/dashboard.png)
```

## 🎓 Project Context

**Project:** LOOP AI -- AI Customer Feedback Intelligence Platform

**Type:** Full-stack AI-enabled SaaS-style application

**Purpose:** Customer feedback intelligence, analysis, prioritization,
and actionable insights.

**Technology:** React + FastAPI + MySQL + Python AI analysis

## 👨‍💻 Author

**Parth Dharmik**

B.Tech Computer Science Engineering

GitHub:\
https://github.com/ParthDharmik145

## 📄 License

This project was developed as an internship/project implementation and
is intended for educational and demonstration purposes.

## ⭐ Project Summary

LOOP AI transforms raw customer feedback into structured intelligence:

**Collect → Analyze → Understand → Prioritize → Act**

The platform combines a modern React interface, FastAPI backend, MySQL
database, AI-assisted feedback analysis, analytics, issue intelligence,
role-based access, AI Copilot, and downloadable reports into one
centralized customer-feedback intelligence platform.
