# API Generation Standards for Api-Architect Mode

## Overview
This document defines the standards and best practices for generating REST API endpoints and backend code in Api-Architect mode.

## Core Principles

### 1. FastAPI Best Practices
- Always use proper HTTP method decorators (`@app.get`, `@app.post`, etc.)
- Define clear, RESTful endpoint paths following `/api/v{version}/{resource}` pattern
- Use Pydantic models for request/response validation
- Include proper HTTP status codes in responses

### 2. Type Safety
```python
# ✅ GOOD: Full type annotations
@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: int) -> Dict[str, Any]:
    user = fetch_user(user_id)
    return {"user": user}

# ❌ BAD: Missing type hints
@app.get("/api/v1/users/{user_id}")
def get_user(user_id):
    return fetch_user(user_id)
```

### 3. Error Handling
Always use HTTPException with appropriate status codes:

```python
from fastapi import HTTPException

@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: int) -> Dict[str, Any]:
    user = fetch_user(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"User with ID {user_id} not found"
        )
    return {"user": user}
```

### 4. Service Layer Pattern
Separate business logic from route handlers:

```python
# routes/user_routes.py
@app.get("/api/v1/users")
async def list_users():
    users = user_service.get_all_active_users()
    return {"users": users}

# services/user_service.py
def get_all_active_users() -> List[User]:
    # Business logic here
    return fetch_active_users_from_db()
```

## Endpoint Generation Template

When generating new endpoints, follow this structure:

```python
from typing import Dict, Any, List
from fastapi import HTTPException
from pydantic import BaseModel

# Request/Response Models
class CreateResourceRequest(BaseModel):
    name: str
    description: str
    # Add fields as needed

class ResourceResponse(BaseModel):
    id: int
    name: str
    description: str
    created_at: str

# Endpoint Implementation
@app.post("/api/v1/resources", status_code=201)
async def create_resource(
    payload: CreateResourceRequest
) -> ResourceResponse:
    """
    Create a new resource.
    
    Args:
        payload: Resource creation data
        
    Returns:
        Created resource with ID
        
    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 409 if resource already exists
    """
    try:
        # Validate input
        validate_resource_data(payload)
        
        # Business logic
        resource = resource_service.create(payload)
        
        # Return response
        return ResourceResponse(
            id=resource.id,
            name=resource.name,
            description=resource.description,
            created_at=resource.created_at.isoformat()
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except DuplicateError as e:
        raise HTTPException(status_code=409, detail=str(e))
```

## Code Quality Requirements

### Documentation
- Every endpoint must have a docstring
- Include Args, Returns, and Raises sections
- Document query parameters and path parameters

### Validation
- Use Pydantic models for all request bodies
- Validate path parameters with proper types
- Add custom validators for complex business rules

### Security
- Never expose sensitive data in responses
- Validate and sanitize all user inputs
- Use proper authentication/authorization (when applicable)
- Implement rate limiting for public endpoints

### Performance
- Use async/await for I/O operations
- Avoid N+1 queries
- Implement pagination for list endpoints
- Cache frequently accessed data

## Testing Requirements

Every generated endpoint should include:

1. **Unit Tests**: Test business logic in isolation
2. **Integration Tests**: Test endpoint with real requests
3. **Edge Cases**: Test error conditions and boundary values

Example test structure:
```python
def test_create_resource_success():
    response = client.post("/api/v1/resources", json={
        "name": "Test Resource",
        "description": "Test Description"
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Test Resource"

def test_create_resource_validation_error():
    response = client.post("/api/v1/resources", json={
        "name": "",  # Invalid: empty name
        "description": "Test"
    })
    assert response.status_code == 400
```

## Common Patterns

### List Endpoints with Pagination
```python
@app.get("/api/v1/resources")
async def list_resources(
    skip: int = 0,
    limit: int = 100,
    filter_by: Optional[str] = None
) -> Dict[str, Any]:
    resources = resource_service.get_paginated(skip, limit, filter_by)
    total = resource_service.count(filter_by)
    
    return {
        "resources": resources,
        "total": total,
        "skip": skip,
        "limit": limit
    }
```

### CRUD Operations
Follow RESTful conventions:
- `GET /api/v1/resources` - List all
- `GET /api/v1/resources/{id}` - Get one
- `POST /api/v1/resources` - Create
- `PUT /api/v1/resources/{id}` - Update (full)
- `PATCH /api/v1/resources/{id}` - Update (partial)
- `DELETE /api/v1/resources/{id}` - Delete

## Checklist for Generated Code

Before finalizing generated code, verify:

- [ ] Proper type annotations on all functions
- [ ] Pydantic models for request/response
- [ ] HTTPException for error cases
- [ ] Comprehensive docstrings
- [ ] Service layer separation
- [ ] Input validation
- [ ] Appropriate HTTP status codes
- [ ] Security considerations addressed
- [ ] Performance optimizations applied
- [ ] Tests included (if requested)

## Integration with Existing Code

When adding to existing files:
1. Match the existing code style and patterns
2. Import from existing service modules
3. Reuse existing Pydantic models when possible
4. Follow the project's naming conventions
5. Add to the appropriate router/blueprint

## References

- FastAPI Documentation: https://fastapi.tiangolo.com/
- Pydantic Documentation: https://docs.pydantic.dev/
- REST API Best Practices: https://restfulapi.net/
- Python Type Hints: https://docs.python.org/3/library/typing.html