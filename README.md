# IBM Bob API Architect Canvas

A powerful visual API architecture tool with AI-powered code generation, refactoring, and chatbot assistance using IBM Granite LLM.

## 🌟 Features

### Visual API Canvas
- **Interactive Flow Diagram**: Visualize REST API endpoints and their function call chains
- **Real-time Code Editing**: Edit function code directly in the canvas
- **Syntax Validation**: Instant feedback on code syntax errors
- **Graph Auto-generation**: Automatically parse Python FastAPI projects

### AI-Powered Features (via MCP Server)
- **🤖 AI Chatbot**: Conversational assistant for architecture questions and guidance
- **✨ Endpoint Generator**: Generate complete REST API endpoints from natural language descriptions
- **🔧 Function Refactoring**: AI-powered code improvement (performance, readability, error handling, etc.)
- **📊 Code Analysis**: Automated code quality analysis and suggestions

### Custom Mode: Api-Architect
- Specialized backend system engineer mode
- Integrated with IBM Granite LLM
- MCP (Model Context Protocol) server for frontend-backend communication
- Rule-based code generation following best practices

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Canvas     │  │  AI Chatbot  │  │  Generator   │      │
│  │   (ReactFlow)│  │              │  │  Components  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Bridge (FastAPI - Port 5000)            │
│  • Graph generation from Python files                        │
│  • File operations (read/write)                              │
│  • Syntax validation                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP Server (FastAPI - Port 5001)                │
│  • AI endpoint generation                                    │
│  • Function refactoring                                      │
│  • Code analysis                                             │
│  • Chatbot interactions                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   IBM Granite LLM                            │
│  • Code generation                                           │
│  • Natural language understanding                            │
│  • Code optimization                                         │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
IBM/
├── .bob/
│   ├── custom_modes.yaml              # Custom mode configuration
│   └── rules-api-architect/
│       ├── 01-generation-standards.md # Code generation rules
│       └── 02-refactoring-guidelines.md # Refactoring best practices
├── backend/
│   ├── main.py                        # Main backend bridge server
│   └── mcp_server.py                  # MCP server for AI features
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIChatbot.jsx         # AI assistant chatbot
│   │   │   ├── AIGenerateEndpoint.jsx # Endpoint generator UI
│   │   │   ├── AIRefactorFunction.jsx # Function refactoring UI
│   │   │   ├── CodeSidebar.jsx       # Code editor sidebar
│   │   │   └── TopBar.jsx            # Main toolbar
│   │   ├── lib/
│   │   │   └── apiClient.js          # API client utilities
│   │   ├── App.jsx
│   │   ├── IbmBobApiArchitectCanvas.jsx # Main canvas component
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── testing/
    ├── sample_api.py                  # Sample FastAPI project
    └── services/
        ├── user_service.py
        └── validators.py
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **IBM Bob** (for Api-Architect custom mode)

### Installation

1. **Clone the repository**
   ```bash
   cd d:/projects/IBM
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   pip install fastapi uvicorn pydantic
   ```

### Running the Application

#### 1. Start the Backend Bridge Server (Port 5000)
```bash
cd backend
python main.py
```

#### 2. Start the MCP Server (Port 5001)
```bash
cd backend
python mcp_server.py
```

#### 3. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```

#### 4. Access the Application
Open your browser and navigate to: `http://localhost:5173`

## 🎯 Usage Guide

### Loading a Project

1. Enter the path to your main Python file (e.g., `D:/projects/IBM/testing/sample_api.py`)
2. Click **Load Graph**
3. The canvas will display all REST endpoints and their function call chains

### Using AI Features

#### 💬 AI Chatbot
1. Click the **💬 Chat** button in the toolbar
2. Ask questions about your API architecture
3. Get suggestions and code examples

#### ✨ Generate Endpoint
1. Click **✨ Generate Endpoint**
2. Select HTTP method (GET, POST, PUT, DELETE, PATCH)
3. Enter endpoint path (e.g., `/api/v1/users`)
4. Describe what the endpoint should do in natural language
5. Click **Generate Endpoint**
6. Review and copy the generated code

**Example Description:**
```
Fetch all active users with pagination support. 
Include user profile data and last login timestamp. 
Return 404 if no users found. Add proper error handling.
```

#### 🔧 Refactor Function
1. Select a function node in the canvas
2. Click **🔧 Refactor Function**
3. Choose a refactoring goal:
   - ⚡ Optimize Performance
   - 🛡️ Add Error Handling
   - 📖 Improve Readability
   - 🔒 Add Type Safety
   - 📝 Enhance Documentation
4. Click **Refactor Function**
5. Review the before/after comparison
6. Apply changes if satisfied

### Editing Code

1. Click on any function node in the canvas
2. The code editor sidebar will open
3. Edit the function code
4. Click **Save Function** to persist changes
5. The graph will automatically refresh

## 🤖 Api-Architect Custom Mode

### Activating the Mode

In IBM Bob, switch to Api-Architect mode:
```
/mode api-architect
```

### Mode Capabilities

- **Read/Edit Tools**: Access to backend files
- **Command Execution**: Run tests, linting, server operations
- **MCP Integration**: Automatic connection to MCP server
- **Rule-Based Generation**: Follows best practices from `.bob/rules-api-architect/`

### Tool Access

The Api-Architect mode has access to:
- ✅ `read_file` - Read source files
- ✅ `apply_diff` - Edit files with targeted changes
- ✅ `write_to_file` - Create new files
- ✅ `execute_command` - Run CLI commands
- ✅ `mcp` - Communicate with MCP server

### Constraints

- **Allowed Paths**: `backend/**`, `testing/**`, `.bob/rules-api-architect/**`
- **Restricted Paths**: `node_modules/**`, `dist/**`, `__pycache__/**`
- **Max File Size**: 500KB

## 📚 API Reference

### Backend Bridge API (Port 5000)

#### Load Main File
```http
POST /api/load-main-file
Content-Type: application/json

{
  "path": "D:/projects/IBM/testing/sample_api.py"
}
```

#### Save Function Content
```http
POST /api/save-function-content
Content-Type: application/json

{
  "function_id": "sample_api.py::list_users",
  "content": "def list_users():\n    return []"
}
```

### MCP Server API (Port 5001)

#### Generate Endpoint
```http
POST /mcp/generate-endpoint
Content-Type: application/json

{
  "method": "GET",
  "path": "/api/v1/users",
  "description": "Fetch all active users with pagination",
  "target_file": "backend/main.py",
  "include_tests": false
}
```

#### Refactor Function
```http
POST /mcp/refactor-function
Content-Type: application/json

{
  "function_id": "sample_api.py::list_users",
  "refactor_goal": "optimize performance",
  "preserve_signature": true
}
```

#### Chat Completion
```http
POST /mcp/chat-completion
Content-Type: application/json

{
  "message": "How do I add authentication to my endpoints?",
  "context": {
    "selectedNode": "list_users",
    "workspacePath": "D:/projects/IBM/testing"
  },
  "conversation_history": []
}
```

## 🔧 Configuration

### Custom Mode Configuration

Edit `.bob/custom_modes.yaml` to customize:
- Tool access permissions
- MCP server settings
- LLM preferences (model, temperature, max tokens)
- Validation rules
- File path constraints

### Generation Rules

Edit `.bob/rules-api-architect/01-generation-standards.md` to define:
- Code templates
- Naming conventions
- Error handling patterns
- Documentation requirements

### Refactoring Guidelines

Edit `.bob/rules-api-architect/02-refactoring-guidelines.md` to specify:
- Refactoring patterns
- Performance optimization techniques
- Code quality standards

## 🧪 Testing

### Run Backend Tests
```bash
cd testing
python -m pytest -v
```

### Run Frontend Tests
```bash
cd frontend
npm test
```

### Lint Code
```bash
# Python
ruff check backend/

# JavaScript
cd frontend
npm run lint
```

## 🛠️ Development

### Adding New AI Features

1. **Add MCP Endpoint** in `backend/mcp_server.py`
2. **Create Frontend Component** in `frontend/src/components/`
3. **Update Canvas** in `frontend/src/IbmBobApiArchitectCanvas.jsx`
4. **Add Toolbar Button** in `frontend/src/components/TopBar.jsx`

### Extending the Custom Mode

1. **Update Configuration** in `.bob/custom_modes.yaml`
2. **Add Rules** in `.bob/rules-api-architect/`
3. **Test Mode Activation** with IBM Bob

## 📝 Best Practices

### Code Generation
- Always include type hints
- Add comprehensive docstrings
- Implement proper error handling
- Follow FastAPI conventions
- Write tests for generated code

### Refactoring
- Preserve function signatures unless explicitly requested
- Maintain backward compatibility
- Run tests after refactoring
- Document changes in commit messages

### Security
- Never commit secrets or API keys
- Validate all user inputs
- Use environment variables for configuration
- Implement rate limiting for public endpoints

## 🐛 Troubleshooting

### MCP Server Not Responding
```bash
# Check if server is running
curl http://localhost:5001/mcp/health

# Restart MCP server
cd backend
python mcp_server.py
```

If `http://localhost:5001/mcp/health` returns `404 Not Found`, port `5001` is likely serving the backend bridge (`main.py`) instead of the MCP app. Stop that process and start `backend/mcp_server.py` again.

### Graph Not Loading
- Verify the Python file path is correct
- Check for syntax errors in the Python file
- Ensure the backend bridge server is running on port 5000

### AI Features Not Working
- Confirm MCP server is running on port 5001
- Check browser console for CORS errors
- Verify IBM Granite LLM integration (if using production setup)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is part of the IBM Bob ecosystem.

## 🙏 Acknowledgments

- **IBM Granite LLM** for AI capabilities
- **FastAPI** for backend framework
- **React Flow** for visual canvas
- **Vite** for frontend tooling

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the API reference
- Consult `.bob/rules-api-architect/` for guidelines

---

**Built with ❤️ for the IBM Bob ecosystem**
