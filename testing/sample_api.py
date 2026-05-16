from fastapi import FastAPI

from services.user_service import (
    archive_user,
    build_users_response,
    fetch_active_users,
    find_user_or_404,
    persist_user,
)
from services.validators import validate_create_payload

app = FastAPI(title="Testing API")


@app.get("/api/v1/users")
def list_users():
    users = fetch_active_users()

    return build_users_response(users)


@app.post("/api/v1/users")
def create_user(payload: dict):
    validate_create_payload(payload)
    created = persist_user(payload)
    return {"created": created}


@app.delete("/api/v1/users/{user_id}")
def delete_user(user_id: int):
    target = find_user_or_404(user_id)
    return archive_user(target)
