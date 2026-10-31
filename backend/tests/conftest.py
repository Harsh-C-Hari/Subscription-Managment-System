import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.db.base import Base
from app.core.deps import get_db
from app.core.security import get_password_hash, create_access_token
from app.models.user import User
import app.models  # ensure models are loaded
from app.main import app as fastapi_app

# Test database engine
test_engine = create_engine(
    settings.TEST_DATABASE_URL,
    pool_pre_ping=True,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Ensure all tables exist in test database
    for table in Base.metadata.tables.values():
        seen = set()
        to_remove = []
        for idx in list(table.indexes):
            if idx.name in seen:
                to_remove.append(idx)
            else:
                seen.add(idx.name)
        for idx in to_remove:
            table.indexes.remove(idx)

    Base.metadata.create_all(bind=test_engine)
    yield

    # We can leave or drop, leaving is fine for local inspecting


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as test_client:
        yield test_client
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def admin_user(db_session: Session) -> User:
    user = User(
        email="test_admin@brightloop.com",
        password_hash=get_password_hash("Admin@12345"),
        full_name="Test Admin",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_headers(admin_user: User) -> dict[str, str]:
    token = create_access_token(subject=str(admin_user.id), role=admin_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def staff_user(db_session: Session) -> User:
    user = User(
        email="test_staff@brightloop.com",
        password_hash=get_password_hash("Staff@12345"),
        full_name="Test Staff",
        role="staff",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def staff_headers(staff_user: User) -> dict[str, str]:
    token = create_access_token(subject=str(staff_user.id), role=staff_user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_a(db_session: Session) -> User:
    user = User(
        email="customer_a@example.com",
        password_hash=get_password_hash("Secret123!"),
        full_name="Customer Alice",
        company_name="Alice Corp",
        role="customer",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_a_headers(customer_a: User) -> dict[str, str]:
    token = create_access_token(subject=str(customer_a.id), role=customer_a.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def customer_b(db_session: Session) -> User:
    user = User(
        email="customer_b@example.com",
        password_hash=get_password_hash("Secret123!"),
        full_name="Customer Bob",
        company_name="Bob LLC",
        role="customer",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def customer_b_headers(customer_b: User) -> dict[str, str]:
    token = create_access_token(subject=str(customer_b.id), role=customer_b.role)
    return {"Authorization": f"Bearer {token}"}
