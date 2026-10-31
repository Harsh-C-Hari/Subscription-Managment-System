import sys
import logging
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


def seed_admin() -> None:
    db = SessionLocal()
    try:
        admin_email = settings.ADMIN_EMAIL.lower()
        admin_user = db.query(User).filter(User.email == admin_email).first()

        if admin_user:
            logger.info("Admin user '%s' exists, updating password and ensuring active...", admin_email)
            admin_user.password_hash = get_password_hash(settings.ADMIN_PASSWORD)
            admin_user.full_name = settings.ADMIN_FULL_NAME
            admin_user.role = "admin"
            admin_user.is_active = True
            db.commit()
            logger.info("Admin user '%s' updated successfully.", admin_email)
        else:
            logger.info("Creating admin user '%s'...", admin_email)
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash(settings.ADMIN_PASSWORD),
                full_name=settings.ADMIN_FULL_NAME,
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info("Admin user '%s' created successfully.", admin_email)
    except Exception as e:
        db.rollback()
        logger.error("Failed to seed admin: %s", e)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
