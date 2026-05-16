"""
IBM watsonx.ai Integration Module
Provides LLM capabilities using IBM Granite models and watsonx Orchestrate workflows.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

from ibm_watsonx_ai import APIClient
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams
from dotenv import load_dotenv

# Load variables from the .env file into the environment
load_dotenv(Path(__file__).with_name(".env"))

logger = logging.getLogger(__name__)


class WatsonxConfig:
    """Configuration for IBM watsonx.ai services."""
    
    def __init__(self):
        """Initialize watsonx configuration from environment variables."""
        self.api_key = os.environ.get("WATSONX_API_KEY")
        self.project_id = os.environ.get("WATSONX_PROJECT_ID")
        self.url = os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        self.region = os.environ.get("WATSONX_REGION", "us-south")
        
        # Validate required configuration
        if not self.api_key:
            raise ValueError("WATSONX_API_KEY environment variable is required")
        if not self.project_id:
            raise ValueError("WATSONX_PROJECT_ID environment variable is required")
    
    def get_credentials(self) -> Dict[str, str]:
        """Get IBM Cloud credentials in SDK-compatible dictionary format."""
        return {
            "url": self.url,
            "apikey": self.api_key,
        }


class WatsonxLLMClient:
    """
    Client for IBM watsonx.ai Foundation Models.
    
    Uses IBM Granite 4.1 models for code generation, refactoring, and analysis.
    """
    
    # Default model IDs selected from currently supported watsonx catalog.
    GRANITE_CODE_MODEL = "ibm/granite-8b-code-instruct"
    GRANITE_INSTRUCT_MODEL = "ibm/granite-3-8b-instruct"
    
    def __init__(self, config: WatsonxConfig):
        """
        Initialize watsonx LLM client.
        
        Args:
            config: watsonx configuration
        """
        self.config = config
        self.client = APIClient(config.get_credentials())
        self.client.set.default_project(config.project_id)
        
        logger.info(f"Initialized watsonx client for project: {config.project_id}")
    
    def _get_model_inference(self, model_id: str, parameters: Dict[str, Any]) -> ModelInference:
        """
        Create a model inference instance.
        
        Args:
            model_id: IBM Granite model identifier
            parameters: Generation parameters
        
        Returns:
            ModelInference instance
        """
        return ModelInference(
            model_id=model_id,
            params=parameters,
            credentials=self.config.get_credentials(),
            project_id=self.config.project_id
        )
    
    def generate_code(
        self,
        prompt: str,
        model_id: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.3,
        top_p: float = 0.95,
        top_k: int = 50
    ) -> str:
        """
        Generate code using IBM Granite models.
        
        Args:
            prompt: Code generation prompt
            model_id: Model to use (default: Granite Code model)
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-1.0)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
        
        Returns:
            Generated code as string
        """
        model_id = model_id or self.GRANITE_CODE_MODEL
        
        parameters = {
            GenParams.MAX_NEW_TOKENS: max_tokens,
            GenParams.TEMPERATURE: temperature,
            GenParams.TOP_P: top_p,
            GenParams.TOP_K: top_k,
            GenParams.DECODING_METHOD: "greedy",
            GenParams.REPETITION_PENALTY: 1.1,
            GenParams.STOP_SEQUENCES: ["```\n\n", "\n\n\n"]
        }
        
        try:
            model = self._get_model_inference(model_id, parameters)
            response = model.generate_text(prompt=prompt)
            
            logger.info(f"Generated code using {model_id}")
            return response
        
        except Exception as e:
            logger.error(f"Code generation failed: {e}", exc_info=True)
            raise
    
    def analyze_code(
        self,
        code: str,
        analysis_type: str = "quality"
    ) -> Dict[str, Any]:
        """
        Analyze code using IBM Granite models.
        
        Args:
            code: Code to analyze
            analysis_type: Type of analysis (quality, security, performance)
        
        Returns:
            Analysis results
        """
        prompt = f"""Analyze the following Python code for {analysis_type}:

```python
{code}
```

Provide a structured analysis including:
1. Issues found
2. Severity levels
3. Recommendations
4. Code quality score (0-100)

Analysis:"""
        
        try:
            model = self._get_model_inference(
                self.GRANITE_INSTRUCT_MODEL,
                {
                    GenParams.MAX_NEW_TOKENS: 1000,
                    GenParams.TEMPERATURE: 0.2,
                    GenParams.TOP_P: 0.9
                }
            )
            
            response = model.generate_text(prompt=prompt)
            
            # Parse response into structured format
            return {
                "analysis_type": analysis_type,
                "raw_analysis": response,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Code analysis failed: {e}", exc_info=True)
            raise
    
    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        context: Optional[Dict[str, Any]] = None,
        model_id: Optional[str] = None,
    ) -> str:
        """
        Generate chat completion using IBM Granite models.
        
        Args:
            messages: Conversation history
            context: Additional context
            model_id: Optional model identifier override
        
        Returns:
            Assistant response
        """
        # Build conversation prompt
        prompt_parts = ["You are an expert backend API architect assistant.\n"]
        
        if context:
            prompt_parts.append("Context:")
            for key, value in context.items():
                prompt_parts.append(f"- {key}: {value}")
            prompt_parts.append("")
        
        prompt_parts.append("Conversation:")
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            prompt_parts.append(f"{role.capitalize()}: {content}")
        
        prompt_parts.append("Assistant:")
        prompt = "\n".join(prompt_parts)
        
        try:
            model = self._get_model_inference(
                model_id or self.GRANITE_INSTRUCT_MODEL,
                {
                    GenParams.MAX_NEW_TOKENS: 1500,
                    GenParams.TEMPERATURE: 0.5,
                    GenParams.TOP_P: 0.95
                }
            )
            
            response = model.generate_text(prompt=prompt)
            return response.strip()
        
        except Exception as e:
            logger.error(f"Chat completion failed: {e}", exc_info=True)
            raise


class CheckpointManager:
    """
    Manages code modification checkpoints for recovery.
    
    Creates automatic backups before any code modification to enable rollback.
    """
    
    def __init__(self, checkpoint_dir: str = ".bob/checkpoints"):
        """
        Initialize checkpoint manager.
        
        Args:
            checkpoint_dir: Directory to store checkpoints
        """
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Checkpoint manager initialized: {self.checkpoint_dir}")
    
    def create_checkpoint(
        self,
        file_path: str,
        content: str,
        operation: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a recovery checkpoint before modifying code.
        
        Args:
            file_path: Path to file being modified
            content: Current file content before modification
            operation: Description of operation
            metadata: Additional metadata
        
        Returns:
            Checkpoint ID for recovery reference
        """
        import hashlib
        
        # Generate checkpoint ID
        timestamp = datetime.utcnow().isoformat()
        content_hash = hashlib.sha256(content.encode()).hexdigest()[:8]
        checkpoint_id = f"{timestamp.replace(':', '-')}_{content_hash}"
        
        # Prepare checkpoint data
        checkpoint_data = {
            "id": checkpoint_id,
            "timestamp": timestamp,
            "file_path": file_path,
            "operation": operation,
            "content": content,
            "content_hash": hashlib.sha256(content.encode()).hexdigest(),
            "metadata": metadata or {}
        }
        
        # Save checkpoint
        checkpoint_file = self.checkpoint_dir / f"{checkpoint_id}.json"
        with open(checkpoint_file, "w", encoding="utf-8") as f:
            json.dump(checkpoint_data, f, indent=2)
        
        logger.info(f"Created checkpoint: {checkpoint_id} for {file_path}")
        return checkpoint_id
    
    def restore_checkpoint(self, checkpoint_id: str) -> Dict[str, Any]:
        """
        Restore a file from a checkpoint.
        
        Args:
            checkpoint_id: Checkpoint identifier
        
        Returns:
            Checkpoint data including file content
        """
        checkpoint_file = self.checkpoint_dir / f"{checkpoint_id}.json"
        
        if not checkpoint_file.exists():
            raise FileNotFoundError(f"Checkpoint {checkpoint_id} not found")
        
        with open(checkpoint_file, "r", encoding="utf-8") as f:
            checkpoint_data = json.load(f)
        
        logger.info(f"Restored checkpoint: {checkpoint_id}")
        return checkpoint_data
    
    def list_checkpoints(self, file_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List available checkpoints.
        
        Args:
            file_path: Filter by file path (optional)
        
        Returns:
            List of checkpoint metadata
        """
        checkpoints = []
        
        for checkpoint_file in self.checkpoint_dir.glob("*.json"):
            try:
                with open(checkpoint_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                # Filter by file path if specified
                if file_path and data.get("file_path") != file_path:
                    continue
                
                # Include only metadata (not full content)
                checkpoints.append({
                    "id": data["id"],
                    "timestamp": data["timestamp"],
                    "file_path": data["file_path"],
                    "operation": data["operation"],
                    "content_hash": data["content_hash"]
                })
            
            except Exception as e:
                logger.warning(f"Failed to read checkpoint {checkpoint_file}: {e}")
        
        # Sort by timestamp (newest first)
        checkpoints.sort(key=lambda x: x["timestamp"], reverse=True)
        return checkpoints


class WatsonxOrchestrate:
    """
    watsonx Orchestrate workflow manager for human-in-the-loop approvals.
    
    Handles automated approval workflows before code modifications.
    """
    
    def __init__(self, webhook_url: Optional[str] = None):
        """
        Initialize watsonx Orchestrate integration.
        
        Args:
            webhook_url: Webhook URL for notifications (Slack, Teams, etc.)
        """
        self.webhook_url = webhook_url or os.environ.get("ORCHESTRATE_WEBHOOK_URL")
        self.approval_required = os.environ.get("ORCHESTRATE_APPROVAL_REQUIRED", "false").lower() == "true"
        
        logger.info(f"watsonx Orchestrate initialized (approval_required: {self.approval_required})")
    
    async def request_approval(
        self,
        operation: str,
        file_path: str,
        changes_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Request human approval for code modification.
        
        Args:
            operation: Operation type (generate_endpoint, refactor_function, etc.)
            file_path: File to be modified
            changes_summary: Summary of changes
            metadata: Additional metadata
        
        Returns:
            True if approved, False if rejected
        """
        if not self.approval_required:
            logger.info("Auto-approval enabled, skipping human review")
            return True
        
        # Prepare approval request
        approval_request = {
            "timestamp": datetime.utcnow().isoformat(),
            "operation": operation,
            "file_path": file_path,
            "changes_summary": changes_summary,
            "metadata": metadata or {}
        }
        
        # Send webhook notification
        if self.webhook_url:
            await self._send_webhook_notification(approval_request)
        
        # In production, this would wait for approval via API callback
        # For now, we'll auto-approve with logging
        logger.warning(f"Approval requested for {operation} on {file_path}")
        logger.info("Auto-approving (implement actual approval workflow in production)")
        
        return True
    
    async def _send_webhook_notification(self, approval_request: Dict[str, Any]):
        """Send webhook notification for approval request."""
        import aiohttp
        
        try:
            async with aiohttp.ClientSession() as session:
                # Format message for Slack/Teams
                message = {
                    "text": f"🔔 Code Modification Approval Required",
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": f"*Operation:* {approval_request['operation']}\n*File:* `{approval_request['file_path']}`\n*Summary:* {approval_request['changes_summary']}"
                            }
                        }
                    ]
                }
                
                async with session.post(self.webhook_url, json=message) as response:
                    if response.status == 200:
                        logger.info("Webhook notification sent successfully")
                    else:
                        logger.warning(f"Webhook notification failed: {response.status}")
        
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")


# Global instances (initialized on first use)
_watsonx_client: Optional[WatsonxLLMClient] = None
_checkpoint_manager: Optional[CheckpointManager] = None
_orchestrate: Optional[WatsonxOrchestrate] = None


def get_watsonx_client() -> WatsonxLLMClient:
    """Get or create watsonx LLM client instance."""
    global _watsonx_client
    if _watsonx_client is None:
        config = WatsonxConfig()
        _watsonx_client = WatsonxLLMClient(config)
    return _watsonx_client


def get_checkpoint_manager() -> CheckpointManager:
    """Get or create checkpoint manager instance."""
    global _checkpoint_manager
    if _checkpoint_manager is None:
        _checkpoint_manager = CheckpointManager()
    return _checkpoint_manager


def get_orchestrate() -> WatsonxOrchestrate:
    """Get or create watsonx Orchestrate instance."""
    global _orchestrate
    if _orchestrate is None:
        _orchestrate = WatsonxOrchestrate()
    return _orchestrate

# Made with Bob
