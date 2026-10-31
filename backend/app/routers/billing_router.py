from fastapi import APIRouter

from app.routers.billing.taxes import router as taxes_router
from app.routers.billing.discounts import router as discounts_router
from app.routers.billing.quotations import router as quotations_router
from app.routers.billing.subscriptions import router as subscriptions_router
from app.routers.billing.invoices import router as invoices_router
from app.routers.billing.payments import router as payments_router
from app.routers.billing.dashboard import router as dashboard_router

router = APIRouter(prefix="")

router.include_router(taxes_router)
router.include_router(discounts_router)
router.include_router(quotations_router)
router.include_router(subscriptions_router)
router.include_router(invoices_router)
router.include_router(payments_router)
router.include_router(dashboard_router)
