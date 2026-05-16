"""
Real-Time MCP Server with Live API Modifications

Features:
1. Function-level code generation (not entire files)
2. Real-time application to running API
3. WebSocket for live graph updates
4. Plug-and-play router creation
5. Hot-reload without server restart
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load variables from the .env file into the environment
load_dotenv(Path(__file__).with_name(".env"))
# Import watsonx and live modification modules
try:
    from watsonx_integration import get_watsonx_client, get_checkpoint_manager, get_orchestrate
    from live_api_modifier import get_live_modifier, get_graph_notifier, FunctionExtractor
    ENHANCED_MODE = True
except ImportError:
    ENHANCED_MODE = False
    logging.warning("Enhanced mode not available - some features disabled")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Real-Time API Architect MCP Server",
    description="Live API modifications with function-level code generation",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
import os
WORKSPACE_PATH = os.getenv("WORKSPACE_PATH", "d:/projects/IBM")
TARGET_API_MODULE = os.getenv("TARGET_API_MODULE", "backend.main")


# ============================================================================
# Request/Response Models
# ============================================================================

class GenerateFunctionRequest(BaseModel):
    """Request to generate a single function."""
    file_path: str = Field(..., description="Target file path")
    function_name: str = Field(..., description="Function name to generate/update")
    description: str = Field(..., description="What the function should do")
    method: Optional[str] = Field(None, description="HTTP method if endpoint")
    route_path: Optional[str] = Field(None, description="Route path if endpoint")
    apply_immediately: bool = Field(True, description="Apply to running API immediately")


class CreateRouterRequest(BaseModel):
    """Request to create a plug-and-play router."""
    router_name: str = Field(..., description="Router name")
    prefix: str = Field(..., description="URL prefix (e.g., /api/v1)")
    routes: List[Dict[str, Any]] = Field(..., description="List of routes to add")
    apply_immediately: bool = Field(True, description="Apply to running API immediately")


class LiveModificationResponse(BaseModel):
    """Response for live modifications."""
    success: bool
    function_name: Optional[str] = None
    generated_code: Optional[str] = None
    file_path: Optional[str] = None
    applied_to_api: bool = False
    checkpoint_id: Optional[str] = None
    graph_updated: bool = False
    message: str


# ============================================================================
# Helper Functions
# ============================================================================

def _build_function_generation_prompt(request: GenerateFunctionRequest) -> str:
    """Build prompt for generating a single function."""
    
    is_endpoint = request.method and request.route_path
    
    if is_endpoint:
        prompt = f"""Generate a SINGLE FastAPI endpoint function with these specifications:

**Function Details:**
- Function Name: {request.function_name}
- HTTP Method: {request.method}
- Route Path: {request.route_path}
- Description: {request.description}

**CRITICAL Requirements:**
1. Generate ONLY the function code (including decorators)
2. Do NOT include imports or other code
3. Include comprehensive docstring with all sections:
   - Description
   - Args (with types)
   - Returns (with structure)
   - Raises (all HTTPException cases)
   - Validation rules
   - Security considerations
4. Use environment variables (NO hardcoded secrets)
5. Full type annotations
6. HTTPException for errors
7. Pydantic models for validation

**Output Format:**
Return ONLY the function code starting with @app decorator:

```python
@app.{request.method.lower()}("{request.route_path}")
async def {request.function_name}(...) -> Dict[str, Any]:
    \"\"\"
    [Complete docstring here]
    \"\"\"
    # Implementation
    pass
```

Generate the function:"""
    else:
        prompt = f"""Generate a SINGLE Python function with these specifications:

**Function Details:**
- Function Name: {request.function_name}
- Description: {request.description}

**Requirements:**
1. Generate ONLY the function code
2. Do NOT include imports
3. Include comprehensive docstring
4. Full type annotations
5. Error handling
6. Input validation

Generate the function:"""
    
    return prompt


async def _apply_function_to_live_api(
    file_path: str,
    function_name: str,
    function_code: str
) -> Dict[str, Any]:
    """Apply generated function to the running API."""
    
    if not ENHANCED_MODE:
        return {
            "applied": False,
            "message": "Enhanced mode not available"
        }
    
    try:
        # Get live modifier
        live_modifier = get_live_modifier()
        
        if not live_modifier:
            return {
                "applied": False,
                "message": "Live modifier not initialized"
            }
        
        # Update function in file and reload
        result = live_modifier.update_function_in_file(
            file_path=file_path,
            function_name=function_name,
            new_function_code=function_code
        )
        
        if result["success"]:
            # Notify graph update
            notifier = get_graph_notifier()
            await notifier.notify_graph_update({
                "action": "function_updated",
                "file_path": file_path,
                "function_name": function_name,
                "timestamp": "now"
            })
            
            return {
                "applied": True,
                "message": f"Function {function_name} applied to live API",
                "module_reloaded": result.get("module_reloaded", False)
            }
        else:
            return {
                "applied": False,
                "message": result.get("message", "Failed to apply function"),
                "error": result.get("error")
            }
    
    except Exception as e:
        logger.error(f"Failed to apply function to live API: {e}")
        return {
            "applied": False,
            "message": str(e)
        }


# ============================================================================
# WebSocket Endpoint for Real-Time Updates
# ============================================================================

@app.websocket("/ws/graph-updates")
async def websocket_graph_updates(websocket: WebSocket):
    """
    WebSocket endpoint for real-time graph updates.
    
    Clients connect here to receive live notifications when API structure changes.
    """
    await websocket.accept()
    
    if ENHANCED_MODE:
        notifier = get_graph_notifier()
        await notifier.connect(websocket)
    
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            
            # Echo back for heartbeat
            await websocket.send_json({
                "type": "heartbeat",
                "status": "connected"
            })
    
    except WebSocketDisconnect:
        if ENHANCED_MODE:
            notifier = get_graph_notifier()
            await notifier.disconnect(websocket)
        logger.info("WebSocket disconnected")


# ============================================================================
# Real-Time API Endpoints
# ============================================================================

@app.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """Health check with feature status."""
    return {
        "status": "healthy",
        "version": "3.0.0",
        "features": {
            "enhanced_mode": ENHANCED_MODE,
            "live_modifications": ENHANCED_MODE,
            "websocket_updates": True,
            "function_level_generation": True,
            "plug_and_play_routers": ENHANCED_MODE
        }
    }


@app.post("/api/generate-function", response_model=LiveModificationResponse)
async def generate_function(
    request: GenerateFunctionRequest,
    background_tasks: BackgroundTasks
) -> LiveModificationResponse:
    """
    Generate a single function and optionally apply it to the running API.
    
    This endpoint:
    1. Creates checkpoint of target file
    2. Generates ONLY the requested function (not entire file)
    3. Applies function to running API if requested
    4. Notifies connected clients via WebSocket
    5. Returns generated code with application status
    """
    try:
        target_file = Path(WORKSPACE_PATH) / request.file_path
        
        # Step 1: Create checkpoint
        checkpoint_id = None
        if ENHANCED_MODE and target_file.exists():
            checkpoint_mgr = get_checkpoint_manager()
            current_content = target_file.read_text(encoding='utf-8')
            checkpoint_id = checkpoint_mgr.create_checkpoint(
                file_path=str(target_file),
                content=current_content,
                operation=f"generate_function_{request.function_name}",
                metadata={
                    "function_name": request.function_name,
                    "description": request.description
                }
            )
            logger.info(f"✅ Created checkpoint: {checkpoint_id}")
        
        # Step 2: Generate function code using watsonx
        if ENHANCED_MODE:
            watsonx_client = get_watsonx_client()
            prompt = _build_function_generation_prompt(request)
            
            generated_code = watsonx_client.generate_code(
                prompt=prompt,
                max_tokens=1500,
                temperature=0.2  # Lower temperature for more consistent code
            )
            
            # Clean up code (remove markdown if present)
            if "```python" in generated_code:
                generated_code = generated_code.split("```python")[1].split("```")[0].strip()
            elif "```" in generated_code:
                generated_code = generated_code.split("```")[1].split("```")[0].strip()
            
            logger.info(f"✅ Generated function {request.function_name} using IBM Granite")
        else:
            # Fallback generation
            if request.method and request.route_path:
                generated_code = f'''@app.{request.method.lower()}("{request.route_path}")
async def {request.function_name}() -> Dict[str, Any]:
    """
    {request.description}
    
    Generated by Real-Time API Architect (Fallback Mode).
    """
    return {{"message": "Generated function", "status": "success"}}
'''
            else:
                generated_code = f'''def {request.function_name}():
    """
    {request.description}
    
    Generated by Real-Time API Architect (Fallback Mode).
    """
    pass
'''
            logger.warning("⚠️  Using fallback generation")
        
        # Step 3: Apply to running API if requested
        applied_to_api = False
        graph_updated = False
        
        if request.apply_immediately and ENHANCED_MODE:
            apply_result = await _apply_function_to_live_api(
                file_path=request.file_path,
                function_name=request.function_name,
                function_code=generated_code
            )
            
            applied_to_api = apply_result.get("applied", False)
            graph_updated = applied_to_api
            
            if applied_to_api:
                logger.info(f"✅ Function {request.function_name} applied to live API")
            else:
                logger.warning(f"⚠️  Function generated but not applied: {apply_result.get('message')}")
        
        return LiveModificationResponse(
            success=True,
            function_name=request.function_name,
            generated_code=generated_code,
            file_path=request.file_path,
            applied_to_api=applied_to_api,
            checkpoint_id=checkpoint_id,
            graph_updated=graph_updated,
            message=f"Function {request.function_name} generated" + 
                   (" and applied to live API" if applied_to_api else "")
        )
    
    except Exception as e:
        logger.error(f"❌ Function generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/create-router", response_model=LiveModificationResponse)
async def create_plug_and_play_router(
    request: CreateRouterRequest,
    background_tasks: BackgroundTasks
) -> LiveModificationResponse:
    """
    Create a plug-and-play router with multiple routes.
    
    The router is immediately added to the running API without restart.
    """
    try:
        if not ENHANCED_MODE:
            raise HTTPException(
                status_code=503,
                detail="Enhanced mode required for plug-and-play routers"
            )
        
        live_modifier = get_live_modifier()
        
        if not live_modifier:
            raise HTTPException(
                status_code=503,
                detail="Live modifier not initialized"
            )
        
        # Create router
        result = live_modifier.create_plug_and_play_router(
            router_name=request.router_name,
            routes=request.routes
        )
        
        if result["success"]:
            # Notify graph update
            notifier = get_graph_notifier()
            await notifier.notify_graph_update({
                "action": "router_created",
                "router_name": request.router_name,
                "routes": result.get("routes_added", []),
                "timestamp": "now"
            })
            
            logger.info(f"✅ Created plug-and-play router: {request.router_name}")
            
            return LiveModificationResponse(
                success=True,
                function_name=request.router_name,
                generated_code=None,
                file_path=None,
                applied_to_api=True,
                checkpoint_id=None,
                graph_updated=True,
                message=result.get("message", "Router created successfully")
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("message", "Failed to create router")
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Router creation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/apply-function")
async def apply_function_to_api(
    file_path: str,
    function_name: str,
    function_code: str
) -> Dict[str, Any]:
    """
    Apply a function to the running API without generating it.
    
    Useful for applying manually edited or pre-generated functions.
    """
    try:
        result = await _apply_function_to_live_api(
            file_path=file_path,
            function_name=function_name,
            function_code=function_code
        )
        
        return {
            "success": result.get("applied", False),
            "message": result.get("message"),
            "details": result
        }
    
    except Exception as e:
        logger.error(f"❌ Failed to apply function: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting Real-Time API Architect MCP Server")
    logger.info(f"   Enhanced Mode: {'✅ Enabled' if ENHANCED_MODE else '⚠️  Disabled'}")
    logger.info(f"   Live Modifications: {'✅ Enabled' if ENHANCED_MODE else '⚠️  Disabled'}")
    logger.info(f"   WebSocket Updates: ✅ Enabled")
    logger.info(f"   Workspace: {WORKSPACE_PATH}")
    
    # Initialize live modifier if enhanced mode is available
    if ENHANCED_MODE:
        try:
            # This will be initialized when first API modification is requested
            logger.info("   Live API Modifier: Ready to initialize on first use")
        except Exception as e:
            logger.error(f"   Failed to initialize live modifier: {e}")
    
    uvicorn.run("mcp_service:app", host="127.0.0.1", port=5001, reload=False)

# Made with Bob
