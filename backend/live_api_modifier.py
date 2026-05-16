"""
Live API Modifier - Real-time Function-Level Code Generation and Application

This module enables:
1. Function-level code generation (not entire file)
2. Real-time application of changes to running API
3. Hot-reload of modified functions
4. Plug-and-play router creation
5. Live graph updates via WebSocket
"""

import ast
import importlib
import inspect
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import asyncio

from fastapi import FastAPI
from fastapi.routing import APIRoute

logger = logging.getLogger(__name__)


class FunctionExtractor:
    """Extract and manipulate individual functions from Python files."""
    
    @staticmethod
    def extract_function_ast(source_code: str, function_name: str) -> Optional[ast.FunctionDef]:
        """
        Extract AST node for a specific function.
        
        Args:
            source_code: Complete source code
            function_name: Name of function to extract
            
        Returns:
            AST FunctionDef node or None if not found
        """
        try:
            tree = ast.parse(source_code)
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if node.name == function_name:
                        return node
            return None
        except SyntaxError as e:
            logger.error(f"Syntax error parsing source: {e}")
            return None
    
    @staticmethod
    def extract_function_source(source_code: str, function_name: str) -> Optional[str]:
        """
        Extract source code for a specific function including decorators.
        
        Args:
            source_code: Complete source code
            function_name: Name of function to extract
            
        Returns:
            Function source code or None if not found
        """
        lines = source_code.splitlines(keepends=True)
        function_node = FunctionExtractor.extract_function_ast(source_code, function_name)
        
        if not function_node:
            return None
        
        # Find start line (including decorators)
        start_line = function_node.lineno - 1
        for i in range(start_line - 1, -1, -1):
            stripped = lines[i].lstrip()
            if lines[i] != stripped:  # Has indentation
                break
            if stripped.startswith('@'):
                start_line = i
            elif stripped.strip() and not stripped.startswith('#'):
                break
        
        # Find end line
        end_line = function_node.end_lineno if hasattr(function_node, 'end_lineno') else start_line + 1
        
        return ''.join(lines[start_line:end_line])
    
    @staticmethod
    def replace_function_in_source(
        source_code: str,
        function_name: str,
        new_function_code: str
    ) -> str:
        """
        Replace a specific function in source code.
        
        Args:
            source_code: Original source code
            function_name: Function to replace
            new_function_code: New function implementation
            
        Returns:
            Modified source code
        """
        lines = source_code.splitlines(keepends=True)
        function_node = FunctionExtractor.extract_function_ast(source_code, function_name)
        
        if not function_node:
            # Function not found, append at end
            return source_code + '\n\n' + new_function_code
        
        # Find function boundaries
        start_line = function_node.lineno - 1
        for i in range(start_line - 1, -1, -1):
            stripped = lines[i].lstrip()
            if lines[i] != stripped:
                break
            if stripped.startswith('@'):
                start_line = i
            elif stripped.strip() and not stripped.startswith('#'):
                break
        
        end_line = function_node.end_lineno if hasattr(function_node, 'end_lineno') else start_line + 1
        
        # Replace function
        new_lines = lines[:start_line] + [new_function_code + '\n'] + lines[end_line:]
        return ''.join(new_lines)


class LiveAPIModifier:
    """
    Modify running FastAPI application in real-time.
    
    Enables hot-reload of individual functions without restarting server.
    """
    
    def __init__(self, app: FastAPI, workspace_path: str):
        """
        Initialize live API modifier.
        
        Args:
            app: FastAPI application instance
            workspace_path: Path to workspace root
        """
        self.app = app
        self.workspace_path = Path(workspace_path)
        self.module_cache: Dict[str, Any] = {}
        logger.info(f"LiveAPIModifier initialized for workspace: {workspace_path}")
    
    def reload_module(self, module_path: str) -> Any:
        """
        Reload a Python module.
        
        Args:
            module_path: Path to module file
            
        Returns:
            Reloaded module
        """
        try:
            # Convert file path to module name
            rel_path = Path(module_path).relative_to(self.workspace_path)
            module_name = str(rel_path.with_suffix('')).replace('/', '.').replace('\\', '.')
            
            # Reload module
            if module_name in sys.modules:
                module = importlib.reload(sys.modules[module_name])
            else:
                module = importlib.import_module(module_name)
            
            self.module_cache[module_path] = module
            logger.info(f"✅ Reloaded module: {module_name}")
            return module
        
        except Exception as e:
            logger.error(f"❌ Failed to reload module {module_path}: {e}")
            raise
    
    def update_function_in_file(
        self,
        file_path: str,
        function_name: str,
        new_function_code: str
    ) -> Dict[str, Any]:
        """
        Update a specific function in a file and reload it.
        
        Args:
            file_path: Path to Python file
            function_name: Function to update
            new_function_code: New function implementation
            
        Returns:
            Update result with status
        """
        try:
            full_path = self.workspace_path / file_path
            
            # Read current source
            current_source = full_path.read_text(encoding='utf-8')
            
            # Replace function
            new_source = FunctionExtractor.replace_function_in_source(
                current_source,
                function_name,
                new_function_code
            )
            
            # Write updated source
            full_path.write_text(new_source, encoding='utf-8')
            
            # Reload module
            module = self.reload_module(str(full_path))
            
            logger.info(f"✅ Updated function {function_name} in {file_path}")
            
            return {
                "success": True,
                "file_path": file_path,
                "function_name": function_name,
                "module_reloaded": True,
                "message": f"Function {function_name} updated and reloaded"
            }
        
        except Exception as e:
            logger.error(f"❌ Failed to update function: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to update function {function_name}"
            }
    
    def add_route_dynamically(
        self,
        path: str,
        method: str,
        handler_function: Any,
        **route_kwargs
    ) -> Dict[str, Any]:
        """
        Add a new route to the running FastAPI application.
        
        Args:
            path: Route path
            method: HTTP method
            handler_function: Route handler function
            **route_kwargs: Additional route parameters
            
        Returns:
            Route addition result
        """
        try:
            # Remove existing route if present
            self.remove_route(path, method)
            
            # Add new route
            route = APIRoute(
                path=path,
                endpoint=handler_function,
                methods=[method.upper()],
                **route_kwargs
            )
            
            self.app.routes.append(route)
            
            logger.info(f"✅ Added route: {method} {path}")
            
            return {
                "success": True,
                "path": path,
                "method": method,
                "message": f"Route {method} {path} added successfully"
            }
        
        except Exception as e:
            logger.error(f"❌ Failed to add route: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to add route {method} {path}"
            }
    
    def remove_route(self, path: str, method: str) -> bool:
        """
        Remove a route from the application.
        
        Args:
            path: Route path
            method: HTTP method
            
        Returns:
            True if route was removed
        """
        method = method.upper()
        routes_to_remove = []
        
        for route in self.app.routes:
            if isinstance(route, APIRoute):
                if route.path == path and method in route.methods:
                    routes_to_remove.append(route)
        
        for route in routes_to_remove:
            self.app.routes.remove(route)
            logger.info(f"Removed route: {method} {path}")
        
        return len(routes_to_remove) > 0
    
    def create_plug_and_play_router(
        self,
        router_name: str,
        routes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Create a plug-and-play router with multiple routes.
        
        Args:
            router_name: Name for the router
            routes: List of route definitions
            
        Returns:
            Router creation result
        """
        try:
            from fastapi import APIRouter
            
            router = APIRouter(prefix=f"/{router_name}", tags=[router_name])
            added_routes = []
            
            for route_def in routes:
                path = route_def.get('path', '/')
                method = route_def.get('method', 'GET')
                handler_code = route_def.get('handler_code', '')
                
                # Create handler function dynamically
                exec_globals = {'APIRouter': APIRouter, 'Dict': Dict, 'Any': Any}
                exec(handler_code, exec_globals)
                
                # Find the handler function
                handler_func = None
                for name, obj in exec_globals.items():
                    if callable(obj) and not name.startswith('_'):
                        handler_func = obj
                        break
                
                if handler_func:
                    # Add route to router
                    router.add_api_route(
                        path=path,
                        endpoint=handler_func,
                        methods=[method.upper()]
                    )
                    added_routes.append(f"{method} {path}")
            
            # Include router in main app
            self.app.include_router(router)
            
            logger.info(f"✅ Created plug-and-play router: {router_name}")
            
            return {
                "success": True,
                "router_name": router_name,
                "routes_added": added_routes,
                "message": f"Router {router_name} created with {len(added_routes)} routes"
            }
        
        except Exception as e:
            logger.error(f"❌ Failed to create router: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to create router {router_name}"
            }


class GraphUpdateNotifier:
    """
    WebSocket-based real-time graph update notifier.
    
    Notifies frontend when API structure changes.
    """
    
    def __init__(self):
        """Initialize graph update notifier."""
        self.connections: List[Any] = []
        logger.info("GraphUpdateNotifier initialized")
    
    async def connect(self, websocket: Any):
        """Add a WebSocket connection."""
        self.connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.connections)}")
    
    async def disconnect(self, websocket: Any):
        """Remove a WebSocket connection."""
        if websocket in self.connections:
            self.connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.connections)}")
    
    async def notify_graph_update(self, update_data: Dict[str, Any]):
        """
        Notify all connected clients of graph update.
        
        Args:
            update_data: Update information to send
        """
        if not self.connections:
            return
        
        message = {
            "type": "graph_update",
            "data": update_data,
            "timestamp": asyncio.get_event_loop().time()
        }
        
        # Send to all connections
        disconnected = []
        for websocket in self.connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send update to client: {e}")
                disconnected.append(websocket)
        
        # Remove disconnected clients
        for ws in disconnected:
            await self.disconnect(ws)
        
        logger.info(f"Notified {len(self.connections)} clients of graph update")


# Global instances
_live_modifier: Optional[LiveAPIModifier] = None
_graph_notifier: Optional[GraphUpdateNotifier] = None


def get_live_modifier(app: FastAPI = None, workspace_path: str = None) -> LiveAPIModifier:
    """Get or create LiveAPIModifier instance."""
    global _live_modifier
    if _live_modifier is None and app and workspace_path:
        _live_modifier = LiveAPIModifier(app, workspace_path)
    return _live_modifier


def get_graph_notifier() -> GraphUpdateNotifier:
    """Get or create GraphUpdateNotifier instance."""
    global _graph_notifier
    if _graph_notifier is None:
        _graph_notifier = GraphUpdateNotifier()
    return _graph_notifier

# Made with Bob
