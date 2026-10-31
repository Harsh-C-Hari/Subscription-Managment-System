from decimal import Decimal
import math
from typing import Generic, List, Optional, TypeVar, Any
from pydantic import BaseModel, PlainSerializer, BeforeValidator
from typing_extensions import Annotated
from fastapi import HTTPException

T = TypeVar("T")


def parse_decimal_2dp(v: Any) -> Decimal:
    if v is None:
        return Decimal("0.00")
    if isinstance(v, Decimal):
        return v
    try:
        return Decimal(str(v))
    except Exception:
        raise ValueError(f"Invalid decimal value: {v}")


def serialize_decimal_2dp(v: Any) -> str:
    if v is None:
        return "0.00"
    d = Decimal(str(v))
    return f"{d:.2f}"


# Decimal field that serializes to 2-decimal string in JSON
Decimal2Str = Annotated[
    Decimal,
    BeforeValidator(parse_decimal_2dp),
    PlainSerializer(serialize_decimal_2dp, return_type=str, when_used="json-unless-none"),
]


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str


class ErrorPayload(BaseModel):
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None


class ErrorEnvelope(BaseModel):
    error: ErrorPayload


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class AppException(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[List[dict]] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message, "details": details},
        )
        self.code = code
        self.message = message
        self.details = details


def paginate_list(
    items: List[Any],
    total: int,
    page: int,
    page_size: int,
) -> dict:
    pages = math.ceil(total / page_size) if total > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
