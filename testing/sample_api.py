from fastapi import FastAPI, HTTPException

app = FastAPI(title="Testing API")

USERS = [
    {"id": 1, "name": "Ada", "active": True},
    {"id": 2, "name": "Linus", "active": False},
    {"id": 3, "name": "Grace", "active": True},
]


def fetch_active_users():
    return [user for user in USERS if user["active"]]


def build_users_response(users):
    return {"count": len(users), "users": users}


@app.get("/api/v1/users")
def list_users():
    users = fetch_active_users()
    return build_users_response(users)


def validate_create_payload(payload):
    if "name" not in payload or not payload["name"]:
        raise HTTPException(status_code=400, detail="name is required")


def persist_user(payload):
    new_user = {"id": len(USERS) + 1, "name": payload["name"], "active": True}
    USERS.append(new_user)
    return new_user


@app.post("/api/v1/users")
def create_user(payload: dict):
    validate_create_payload(payload)
    created = persist_user(payload)
    return {"created": created}


def find_user_or_404(user_id):
    for user in USERS:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="user not found")


def archive_user(user):
    user["active"] = False
    return {"deleted": user["id"], "active": user["active"]}


@app.delete("/api/v1/users/{user_id}")
def delete_user(user_id: int):
    target = find_user_or_404(user_id)
    return archive_user(target)
