import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# DATABASE CONFIGURATION
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not configured. "
        "Please create backend/.env and add DATABASE_URL."
    )


# =========================================================
# SSL CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

CA_CERT_PATH = BASE_DIR / "ca.pem"


# =========================================================
# SQLAlchemy CONNECTION
# =========================================================

connect_args = {}


if CA_CERT_PATH.exists():

    connect_args = {
        "ssl_ca": str(CA_CERT_PATH),
        "ssl_verify_cert": True,
        "ssl_verify_identity": True,
    }


# =========================================================
# ENGINE
# =========================================================

engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args=connect_args,
)


# =========================================================
# SESSION
# =========================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# =========================================================
# BASE MODEL
# =========================================================

Base = declarative_base()