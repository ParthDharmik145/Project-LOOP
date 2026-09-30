import os
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


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================================================
# CONFIGURATION
# =========================================================

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "LOOP_AI_CHANGE_THIS_SECRET_IN_DEVELOPMENT"
)

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_HOURS = 8


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hash = PasswordHash.recommended()


# =========================================================
# AUTHENTICATION SCHEME
# =========================================================

security = HTTPBearer()


# =========================================================
# ALLOWED ROLES
# =========================================================

ALLOWED_ROLES = {
    "Admin",
    "Manager",
    "Analyst",
    "Product Manager",
    "Support Agent",
    "Viewer",
}


# =========================================================
# DATABASE DEPENDENCY
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# REQUEST / RESPONSE MODELS
# =========================================================

class RegisterRequest(BaseModel):
    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=8,
        max_length=128
    )


class LoginRequest(BaseModel):
    email: EmailStr

    password: str = Field(
        ...,
        min_length=1,
        max_length=128
    )


class RoleUpdateRequest(BaseModel):
    role: str


# =========================================================
# PASSWORD FUNCTIONS
# =========================================================

def hash_password(password: str) -> str:
    """
    Hash a plain-text password securely.
    """
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Verify a plain-text password against its stored hash.
    """
    try:
        return password_hash.verify(
            plain_password,
            hashed_password
        )
    except Exception:
        return False


# =========================================================
# JWT FUNCTIONS
# =========================================================

def create_access_token(
    user_id: int,
    email: str,
    role: str
) -> str:
    """
    Create a JWT access token.
    """

    expire = datetime.now(timezone.utc) + timedelta(
        hours=ACCESS_TOKEN_EXPIRE_HOURS
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return token


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    """

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired."
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )


# =========================================================
# CURRENT USER
# =========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Get the currently authenticated user.

    The frontend must send:

    Authorization: Bearer <JWT_TOKEN>
    """

    token = credentials.credentials

    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identity in token."
        )

    user = db.execute(
        text(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                is_active,
                created_at
            FROM users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {
            "user_id": user_id
        }
    ).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found."
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account is inactive."
        )

    return dict(user)


# =========================================================
# ROLE DEPENDENCY
# =========================================================

def require_roles(*allowed_roles: str) -> Callable:
    """
    Restrict an endpoint to specific roles.
    """

    def role_checker(
        current_user: dict = Depends(get_current_user)
    ):
        current_role = current_user.get("role")

        if current_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action."
            )

        return current_user

    return role_checker


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user.

    Public registration always creates an Analyst account.
    Admin can later change the role from Team & Access.
    """

    email = request.email.strip().lower()

    # -----------------------------------------------------
    # Validate email uniqueness
    # -----------------------------------------------------

    existing_user = db.execute(
        text(
            """
            SELECT id
            FROM users
            WHERE LOWER(email) = :email
            LIMIT 1
            """
        ),
        {
            "email": email
        }
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    # -----------------------------------------------------
    # Validate password length
    # -----------------------------------------------------

    if len(request.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 8 characters."
        )

    # -----------------------------------------------------
    # Hash password
    # -----------------------------------------------------

    hashed_password = hash_password(
        request.password
    )

    # -----------------------------------------------------
    # Public registration role
    # -----------------------------------------------------

    role = "Analyst"

    # -----------------------------------------------------
    # Insert user
    # -----------------------------------------------------

    result = db.execute(
        text(
            """
            INSERT INTO users
            (
                full_name,
                email,
                password_hash,
                role,
                is_active
            )
            VALUES
            (
                :full_name,
                :email,
                :password_hash,
                :role,
                TRUE
            )
            """
        ),
        {
            "full_name": request.full_name.strip(),
            "email": email,
            "password_hash": hashed_password,
            "role": role,
        }
    )

    db.commit()

    user_id = result.lastrowid

    return {
        "message": "User registered successfully.",
        "user": {
            "id": user_id,
            "full_name": request.full_name.strip(),
            "email": email,
            "role": role,
            "is_active": True,
        }
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate a user and return a JWT token.
    """

    email = request.email.strip().lower()

    user = db.execute(
        text(
            """
            SELECT
                id,
                full_name,
                email,
                password_hash,
                role,
                is_active,
                created_at
            FROM users
            WHERE LOWER(email) = :email
            LIMIT 1
            """
        ),
        {
            "email": email
        }
    ).mappings().first()

    # -----------------------------------------------------
    # User not found
    # -----------------------------------------------------

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # -----------------------------------------------------
    # Account disabled
    # -----------------------------------------------------

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account is inactive."
        )

    # -----------------------------------------------------
    # Verify password
    # -----------------------------------------------------

    if not verify_password(
        request.password,
        user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # -----------------------------------------------------
    # Create JWT
    # -----------------------------------------------------

    access_token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"]
    )

    # -----------------------------------------------------
    # Return authenticated user
    # -----------------------------------------------------

    return {
        "message": "Login successful.",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_hours": ACCESS_TOKEN_EXPIRE_HOURS,
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": bool(user["is_active"]),
            "created_at": user["created_at"],
        }
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user)
):
    """
    Return the currently authenticated user's information.
    """

    return current_user


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout(
    current_user: dict = Depends(get_current_user)
):
    """
    Logout endpoint.

    JWT tokens are stateless, so the frontend removes the
    token from localStorage after this request.

    A token naturally expires after ACCESS_TOKEN_EXPIRE_HOURS.
    """

    return {
        "message": "Logout successful.",
        "user_id": current_user["id"]
    }


# =========================================================
# GET ALL USERS
# =========================================================

@router.get("/users")
def get_users(
    current_user: dict = Depends(
        require_roles("Admin")
    ),
    db: Session = Depends(get_db)
):
    """
    Return all users.

    Admin only.
    """

    users = db.execute(
        text(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                is_active,
                created_at
            FROM users
            ORDER BY id ASC
            """
        )
    ).mappings().all()

    return [
        {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "is_active": bool(user["is_active"]),
            "created_at": user["created_at"],
        }
        for user in users
    ]


# =========================================================
# UPDATE USER ROLE
# =========================================================

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    current_user: dict = Depends(
        require_roles("Admin")
    ),
    db: Session = Depends(get_db)
):
    """
    Change another user's role.

    Admin only.

    The currently logged-in Admin cannot change their own
    role through this endpoint.
    """

    new_role = request.role.strip()

    # -----------------------------------------------------
    # Validate role
    # -----------------------------------------------------

    if new_role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid role. Allowed roles are: "
                + ", ".join(sorted(ALLOWED_ROLES))
            )
        )

    # -----------------------------------------------------
    # Prevent Admin from changing their own role
    # -----------------------------------------------------

    if int(current_user["id"]) == int(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role."
        )

    # -----------------------------------------------------
    # Check target user
    # -----------------------------------------------------

    target_user = db.execute(
        text(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                is_active
            FROM users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {
            "user_id": user_id
        }
    ).mappings().first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # -----------------------------------------------------
    # Update role
    # -----------------------------------------------------

    db.execute(
        text(
            """
            UPDATE users
            SET role = :role
            WHERE id = :user_id
            """
        ),
        {
            "role": new_role,
            "user_id": user_id
        }
    )

    db.commit()

    return {
        "message": "User role updated successfully.",
        "user": {
            "id": target_user["id"],
            "full_name": target_user["full_name"],
            "email": target_user["email"],
            "previous_role": target_user["role"],
            "role": new_role,
            "is_active": bool(target_user["is_active"]),
        }
    }


# =========================================================
# ACTIVATE / DEACTIVATE USER
# =========================================================

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    current_user: dict = Depends(
        require_roles("Admin")
    ),
    db: Session = Depends(get_db)
):
    """
    Toggle another user's active/inactive status.

    Admin only.
    """

    # -----------------------------------------------------
    # Prevent Admin from disabling themselves
    # -----------------------------------------------------

    if int(current_user["id"]) == int(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own account status."
        )

    # -----------------------------------------------------
    # Get target user
    # -----------------------------------------------------

    target_user = db.execute(
        text(
            """
            SELECT
                id,
                full_name,
                email,
                role,
                is_active
            FROM users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {
            "user_id": user_id
        }
    ).mappings().first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    new_status = not bool(
        target_user["is_active"]
    )

    # -----------------------------------------------------
    # Update status
    # -----------------------------------------------------

    db.execute(
        text(
            """
            UPDATE users
            SET is_active = :is_active
            WHERE id = :user_id
            """
        ),
        {
            "is_active": new_status,
            "user_id": user_id
        }
    )

    db.commit()

    return {
        "message": "User status updated successfully.",
        "user": {
            "id": target_user["id"],
            "full_name": target_user["full_name"],
            "email": target_user["email"],
            "role": target_user["role"],
            "is_active": new_status,
        }
    }