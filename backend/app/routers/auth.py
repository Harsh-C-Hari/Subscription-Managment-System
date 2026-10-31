import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_current_user, require_roles
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.common import AppException
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    StaffCreateRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
)
from app.schemas.user import UserBriefResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserBriefResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message="Email is already registered",
        )

    user = User(
        email=email_clean,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        company_name=payload.company_name,
        address=payload.address,
        role="customer",  # Role in body is strictly ignored for public registration
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message="Invalid email or password",
        )

    if not user.is_active:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message="User account is inactive",
        )

    token = create_access_token(subject=str(user.id), role=user.role)
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        user=UserBriefResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: StaffCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles("admin")),
):
    email_clean = payload.email.lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise AppException(
            status_code=status.HTTP_409_CONFLICT,
            code="CONFLICT",
            message="Email is already registered",
        )

    user = User(
        email=email_clean,
        password_hash=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        company_name=payload.company_name,
        address=payload.address,
        role="staff",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.lower()
    user = db.query(User).filter(User.email == email_clean).first()

    reset_token_raw = None
    if user and user.is_active:
        reset_token_raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(reset_token_raw.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        prt = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(prt)
        db.commit()

    # Always 200 to prevent email enumeration
    # In development, return the raw token for testing
    token_to_return = reset_token_raw if settings.APP_ENV == "development" else None
    return ForgotPasswordResponse(
        message="If that email is registered, reset instructions have been sent",
        reset_token=token_to_return,
    )


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    prt = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
    ).first()

    now_utc = datetime.now(timezone.utc)
    if not prt or prt.expires_at < now_utc:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="BAD_REQUEST",
            message="Invalid or expired reset token",
        )

    user = db.query(User).filter(User.id == prt.user_id).first()
    if not user or not user.is_active:
        raise AppException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="BAD_REQUEST",
            message="User not found or inactive",
        )

    user.password_hash = get_password_hash(payload.new_password)
    prt.used_at = now_utc
    db.commit()

    return {"message": "Password reset successfully"}
