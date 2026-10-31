from fastapi import FastAPI, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.schemas.common import AppException
from app.routers.auth import router as auth_router
from app.routers.products import router as products_router
from app.routers.variants import router as variants_router
from app.routers.plans import router as plans_router
from app.routers.customers import router as customers_router
from app.routers.billing_router import router as billing_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Brightloop API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    content = {
        "error": {
            "code": exc.code,
            "message": exc.message,
        }
    }
    if exc.details is not None:
        content["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for err in exc.errors():
        field_loc = ".".join(str(x) for x in err.get("loc", []) if x not in ("body",))
        details.append({
            "field": field_loc or None,
            "message": err.get("msg", "Validation error"),
        })
    content = {
        "error": {
            "code": "VALIDATION_ERROR",
            "message": "Validation error",
            "details": details,
        }
    }
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=content,
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    default_codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        500: "INTERNAL_ERROR",
    }
    if isinstance(exc.detail, dict):
        code = exc.detail.get("code", default_codes.get(exc.status_code, "ERROR"))
        message = exc.detail.get("message", "An error occurred")
        details = exc.detail.get("details")
    else:
        code = default_codes.get(exc.status_code, "ERROR")
        message = str(exc.detail) if exc.detail else "An error occurred"
        details = None

    content = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if details is not None:
        content["error"]["details"] = details
    return JSONResponse(status_code=exc.status_code, content=content)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
            }
        },
    )


# Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


# Register domain routers under /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(variants_router, prefix="/api/v1")
app.include_router(plans_router, prefix="/api/v1")
app.include_router(customers_router, prefix="/api/v1")

# Pre-wired billing router stub for Person 2
app.include_router(billing_router, prefix="/api/v1")
