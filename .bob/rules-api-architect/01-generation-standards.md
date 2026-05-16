# API Generation Standards for Api-Architect Mode

## Overview
This document defines the mandatory standards and best practices for generating REST API endpoints and backend code in Api-Architect mode. All code modifications through the MCP server must adhere to these rules.

## 🔒 Critical Requirements

### 1. Documentation Requirements (MANDATORY)
Every generated endpoint and function MUST include comprehensive docstrings with validation blocks.

#### Python Docstring Format (Google Style)
```python
@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: int) -> Dict[str, Any]:
    """
    Retrieve a single user by their unique identifier.
    
    This endpoint fetches user data from the database and returns
    a formatted response with user profile information.
    
    Args:
        user_id (int): The unique identifier of the user to retrieve.
                      Must be a positive integer.
    
    Returns:
        Dict[str, Any]: A dictionary containing:
            - user (Dict): User profile data including:
                - id (int): User identifier
                - username (str): User's username
                - email (str): User's email address
                - created_at (str): ISO 8601 timestamp
            - status (str): Response status ("success")
    
    Raises:
        HTTPException: 400 if user_id is invalid (non-positive)
        HTTPException: 404 if user with given ID does not exist
        HTTPException: 500 if database connection fails
    
    Example:
        >>> response = await get_user(123)
        >>> print(response)
        {
            "user": {
                "id": 123,
                "username": "john_doe",
                "email": "john@example.com",
                "created_at": "2024-01-15T10:30:00Z"
            },
            "status": "success"
        }
    
    Validation:
        - user_id must be positive integer
        - User must exist in database
        - User must not be soft-deleted
    
    Security:
        - No sensitive data (passwords, tokens) in response
        - Rate limited to 100 requests per minute per IP
        - Requires valid authentication token
    
    Performance:
        - Database query optimized with index on user_id
        - Response cached for 60 seconds
        - Average response time: <50ms
    """
    # Validate input
    if user_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="User ID must be a positive integer"
        )
    
    try:
        # Fetch user from database
        user = await user_service.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=404,
                detail=f"User with ID {user_id} not found"
            )
        
        # Return formatted response
        return {
            "user": user.to_dict(),
            "status": "success"
        }
    
    except DatabaseError as e:
        logger.error(f"Database error fetching user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Database connection error"
        )
```

### 2. Environment Variables (MANDATORY - NEVER HARDCODE)

❌ **FORBIDDEN - Never do this:**
```python
# WRONG - Hardcoded credentials
DATABASE_URL = "postgresql://user:password@localhost:5432/mydb"
API_KEY = "sk-1234567890abcdef"
SECRET_KEY = "my-secret-key-123"

@app.get("/api/data")
def get_data():
    conn = psycopg2.connect("postgresql://admin:pass123@db.example.com/prod")
```

✅ **REQUIRED - Always use environment variables:**
```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Access via os.environ with defaults
DATABASE_URL = os.environ.get("DATABASE_URL")
API_KEY = os.environ.get("API_KEY")
SECRET_KEY = os.environ.get("SECRET_KEY", "default-dev-key")

# Validate required variables at startup
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

@app.get("/api/data")
def get_data():
    """Fetch data using environment-configured database connection."""
    conn = psycopg2.connect(DATABASE_URL)
```

#### Environment Variable Checklist
- [ ] No hardcoded passwords, API keys, or secrets
- [ ] All sensitive config loaded from environment
- [ ] `.env.example` file provided with dummy values
- [ ] `.env` added to `.gitignore`
- [ ] Validation for required environment variables
- [ ] Default values only for non-sensitive config

### 3. Checkpoint Recovery System (MANDATORY)

Every code modification MUST create an automatic checkpoint before changes are applied.

#### Checkpoint Structure
```python
import json
import hashlib
from datetime import datetime
from pathlib import Path

def create_checkpoint(file_path: str, content: str, operation: str) -> str:
    """
    Create a recovery checkpoint before modifying code.
    
    Args:
        file_path: Path to file being modified
        content: Current file content before modification
        operation: Description of operation (e.g., "generate_endpoint", "refactor_function")
    
    Returns:
        Checkpoint ID for recovery reference
    """
    checkpoint_dir = Path(".bob/checkpoints")
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate checkpoint ID
    timestamp = datetime.utcnow().isoformat()
    content_hash = hashlib.sha256(content.encode()).hexdigest()[:8]
    checkpoint_id = f"{timestamp}_{content_hash}"
    
    # Save checkpoint
    checkpoint_data = {
        "id": checkpoint_id,
        "timestamp": timestamp,
        "file_path": file_path,
        "operation": operation,
        "content": content,
        "content_hash": hashlib.sha256(content.encode()).hexdigest(),
    }
    
    checkpoint_file = checkpoint_dir / f"{checkpoint_id}.json"
    with open(checkpoint_file, "w", encoding="utf-8") as f:
        json.dump(checkpoint_data, f, indent=2)
    
    return checkpoint_id
```

#### Checkpoint Usage in MCP Server
```python
@app.post("/mcp/generate-endpoint")
async def generate_endpoint(request: GenerateEndpointRequest):
    """Generate endpoint with automatic checkpoint."""
    target_file = Path(request.target_file)
    
    # Create checkpoint BEFORE modification
    if target_file.exists():
        current_content = target_file.read_text(encoding="utf-8")
        checkpoint_id = create_checkpoint(
            file_path=str(target_file),
            content=current_content,
            operation=f"generate_endpoint_{request.method}_{request.path}"
        )
        logger.info(f"Created checkpoint: {checkpoint_id}")
    
    # Generate and apply changes
    generated_code = await generate_code(request)
    
    # Save with checkpoint reference
    target_file.write_text(generated_code, encoding="utf-8")
    
    return {
        "success": True,
        "checkpoint_id": checkpoint_id,
        "message": "Endpoint generated with recovery checkpoint"
    }
```

## 🏗️ Core Principles

### 1. FastAPI Best Practices
- Always use proper HTTP method decorators (`@app.get`, `@app.post`, etc.)
- Define clear, RESTful endpoint paths following `/api/v{version}/{resource}` pattern
- Use Pydantic models for request/response validation
- Include proper HTTP status codes in responses

### 2. Type Safety (MANDATORY)
```python
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, validator

# ✅ GOOD: Full type annotations with Pydantic validation
class UserCreateRequest(BaseModel):
    """Request model for creating a new user."""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., regex=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    age: Optional[int] = Field(None, ge=0, le=150)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v

@app.post("/api/v1/users", status_code=201)
async def create_user(user: UserCreateRequest) -> Dict[str, Any]:
    """Create a new user with validated input."""
    created_user = await user_service.create(user)
    return {"user": created_user, "status": "created"}

# ❌ BAD: Missing type hints and validation
@app.post("/api/v1/users")
def create_user(user):
    return user_service.create(user)
```

### 3. Error Handling (MANDATORY)
Always use HTTPException with appropriate status codes:

```python
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

@app.get("/api/v1/users/{user_id}")
async def get_user(user_id: int) -> Dict[str, Any]:
    """
    Retrieve user with comprehensive error handling.
    
    Validation:
        - user_id must be positive
    
    Raises:
        HTTPException: 400, 404, 500 with detailed messages
    """
    # Input validation
    if user_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Invalid user ID",
                "message": "User ID must be a positive integer",
                "field": "user_id",
                "value": user_id
            }
        )
    
    try:
        # Business logic
        user = await user_service.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "error": "User not found",
                    "message": f"No user exists with ID {user_id}",
                    "user_id": user_id
                }
            )
        
        return {"user": user.to_dict(), "status": "success"}
    
    except DatabaseError as e:
        logger.error(f"Database error in get_user({user_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Database error",
                "message": "An error occurred while fetching user data",
                "request_id": generate_request_id()
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_user({user_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Internal server error",
                "message": "An unexpected error occurred",
                "request_id": generate_request_id()
            }
        )
```

### 4. Service Layer Pattern (MANDATORY)
Separate business logic from route handlers:

```python
# routes/user_routes.py
@app.get("/api/v1/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> Dict[str, Any]:
    """
    List all users with pagination.
    
    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
    
    Returns:
        Paginated list of users
    
    Validation:
        - skip must be non-negative
        - limit must be between 1 and 1000
    """
    users = await user_service.get_all_active_users(skip=skip, limit=limit)
    total = await user_service.count_active_users()
    
    return {
        "users": [user.to_dict() for user in users],
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
            "has_more": (skip + limit) < total
        },
        "status": "success"
    }

# services/user_service.py
async def get_all_active_users(skip: int = 0, limit: int = 100) -> List[User]:
    """
    Fetch active users from database with pagination.
    
    Business logic separated from route handler.
    """
    query = select(User).where(User.is_active == True).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
```

## 📋 Pre-Generation Checklist

Before generating any code, verify:

- [ ] **Documentation**: Comprehensive docstring with all sections
- [ ] **Validation Block**: Input validation rules documented
- [ ] **Security Block**: Security considerations documented
- [ ] **No Hardcoded Secrets**: All config from environment variables
- [ ] **Checkpoint Created**: Recovery checkpoint saved before modification
- [ ] **Type Hints**: Full type annotations on all functions
- [ ] **Error Handling**: HTTPException for all error cases
- [ ] **Pydantic Models**: Request/response validation models
- [ ] **Service Layer**: Business logic separated from routes
- [ ] **Logging**: Appropriate logging for errors and important events

## 🔍 Code Review Checklist

After generation, verify:

- [ ] All docstrings include Validation and Security sections
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] Environment variables used for all configuration
- [ ] Checkpoint created and logged
- [ ] Type hints on all parameters and returns
- [ ] HTTPException used for all error responses
- [ ] Pydantic models for complex data structures
- [ ] Service layer separation maintained
- [ ] Logging added for errors and key operations
- [ ] Tests included (if requested)

## 🚫 Forbidden Patterns

### Never Include:
1. Hardcoded passwords, API keys, tokens, or secrets
2. Database connection strings with credentials
3. Functions without docstrings
4. Missing type hints
5. Bare except clauses without logging
6. Direct database queries in route handlers
7. Sensitive data in logs or responses
8. Unvalidated user input
9. Missing error handling
10. Code modifications without checkpoints

## ✅ Required Patterns

### Always Include:
1. Comprehensive docstrings with Validation and Security sections
2. Environment variables for all configuration
3. Checkpoint creation before modifications
4. Full type annotations
5. Pydantic models for validation
6. HTTPException for errors
7. Service layer separation
8. Structured logging
9. Input validation
10. Security considerations

## 📚 References

- FastAPI Documentation: https://fastapi.tiangolo.com/
- Pydantic Documentation: https://docs.pydantic.dev/
- Python Type Hints: https://docs.python.org/3/library/typing.html
- Google Python Style Guide: https://google.github.io/styleguide/pyguide.html
- OWASP API Security: https://owasp.org/www-project-api-security/

---

**These standards are MANDATORY for all code generated through Api-Architect mode.**