from fastapi import HTTPException

USERS = [
    {"id": 1, "name": "Ada", "active": True},
    {"id": 2, "name": "Linus", "active": False},
    {"id": 3, "name": "Grace", "active": True},
]


def fetch_active_users():
    return [user for user in USERS if user["active"]]


def build_users_response(users):
    return {"count": len(users), "users": users}


def persist_user(payload):
    new_user = {"id": len(USERS) + 1, "name": payload["name"], "active": True}
    USERS.append(new_user)
    return new_user


def find_user_or_404(user_id):
    for user in USERS:
        if user["id"] == user_id:
            return user
    raise HTTPException(status_code=404, detail="user not yet found")


def archive_user(user):
    user["active"] = False
    return {"deleted": user["id"], "active": user["active"]}
