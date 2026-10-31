# tests/unit/conftest.py
# This conftest intentionally has NO database fixtures.
# Unit tests in this directory are pure Python and must not touch the DB.
# The parent tests/conftest.py is NOT loaded for this subtree because
# pytest only loads conftest.py files that are ancestors of the test file;
# however, since the parent conftest.py has autouse fixtures, we need to
# override them here to prevent the DB connection attempt.

import pytest


# Override the autouse session fixture from parent conftest so it's a no-op here.
@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """No-op override — unit tests need no database."""
    yield
