from typing import Generator, List, Callable
import uuid
from fastapi import Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db, SessionLocal
from app.core.security import decode_access_token
from app.models.user import User
from app.schemas.common import AppException

http_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> User:
    if auth is None or not auth.credentials:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message="Not authenticated",
        )

    try:
        payload = decode_access_token(auth.credentials)
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise AppException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="UNAUTHORIZED",
                message="Invalid token",
            )
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message="User not found",
        )

    if not user.is_active:
        raise AppException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="UNAUTHORIZED",
            message="User account is inactive",
        )

    return user


def require_roles(*allowed_roles: str) -> Callable[[User], User]:
    def role_verifier(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise AppException(
                status_code=status.HTTP_403_FORBIDDEN,
                code="FORBIDDEN",
                message=f"Access denied for role '{current_user.role}'",
            )
        return current_user

    return role_verifier
