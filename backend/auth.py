from datetime import datetime, timedelta, timezone
from typing import Callable, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import SessionLocal

router = APIRouter(prefix="/auth", tags=["Authentication"])

# IMPORTANT: move this to an environment variable before production deployment.
SECRET_KEY = "LOOP_AI_CHANGE_THIS_SECRET_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8

password_hash = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)

ALLOWED_ROLES = {"Admin", "Manager", "Analyst", "Product Manager", "Support Agent", "Viewer"}


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = "Analyst"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RoleUpdateRequest(BaseModel):
    role: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, password_hash_value: str) -> bool:
    return password_hash.verify(password, password_hash_value)


def create_access_token(user_id: int, email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": expires,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.execute(
        text("""
            SELECT id, full_name, email, role, is_active, created_at
            FROM users
            WHERE id = :id
            LIMIT 1
        """),
        {"id": int(user_id)},
    ).mappings().first()

    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or does not exist.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return dict(user)


def require_roles(*allowed_roles: str) -> Callable:
    allowed = set(allowed_roles)

    def dependency(current_user=Depends(get_current_user)):
        if current_user.get("role") not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return dependency


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Public registration creates Analyst accounts only.
    # Admin can promote an account later through the protected user-management endpoint.
    requested_role = "Analyst"

    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email LIMIT 1"),
        {"email": request.email.lower()},
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    result = db.execute(
        text("""
            INSERT INTO users (full_name, email, password_hash, role, is_active)
            VALUES (:full_name, :email, :password_hash, :role, TRUE)
        """),
        {
            "full_name": request.full_name.strip(),
            "email": request.email.lower(),
            "password_hash": hash_password(request.password),
            "role": requested_role,
        },
    )
    db.commit()

    return {
        "message": "Registration successful.",
        "user": {
            "id": result.lastrowid,
            "full_name": request.full_name.strip(),
            "email": request.email.lower(),
            "role": requested_role,
            "is_active": True,
        },
    }


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("""
            SELECT id, full_name, email, password_hash, role, is_active, created_at
            FROM users
            WHERE email = :email
            LIMIT 1
        """),
        {"email": request.email.lower()},
    ).mappings().first()

    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive. Contact an administrator.",
        )

    token = create_access_token(user["id"], user["email"], user["role"])

    return {
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_HOURS * 60 * 60,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": user["is_active"],
            "created_at": user["created_at"],
        },
    }


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(current_user=Depends(get_current_user)):
    # JWT access tokens are stateless. The frontend removes the token on logout.
    return {"message": "Logout successful.", "user": current_user["email"]}


@router.get("/users")
def list_users(
    current_user=Depends(require_roles("Admin")),
    db: Session = Depends(get_db),
):
    users = db.execute(
        text("""
            SELECT id, full_name, email, role, is_active, created_at
            FROM users
            ORDER BY created_at DESC
        """)
    ).mappings().all()

    return [dict(user) for user in users]


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    current_user=Depends(require_roles("Admin")),
    db: Session = Depends(get_db),
):
    role = request.role.strip().title()

    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be Admin, Manager, Analyst, Product Manager, Support Agent or Viewer.",
        )

    if user_id == current_user["id"] and role != "Admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current Admin cannot remove their own Admin role.",
        )

    result = db.execute(
        text("UPDATE users SET role = :role WHERE id = :id"),
        {"role": role, "id": user_id},
    )

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    db.commit()
    return {"message": "User role updated successfully.", "user_id": user_id, "role": role}
