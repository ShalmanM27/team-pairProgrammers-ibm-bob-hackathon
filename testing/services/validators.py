from fastapi import HTTPException

def validate_create_payload(payload):
    if "name" not in payload or not payload["name"]:
        raise HTTPException(status_code=400, detail="name is required to proceed")
