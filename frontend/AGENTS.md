# Repository Guidelines

## Project Structure & Module Organization
This repository is currently a clean workspace (`D:\projects\IBM`) with no committed modules yet. Use the structure below as the default layout when adding code:
- `src/`: application code organized by feature or domain (`src/<feature>/...`).
- `tests/`: automated tests mirroring `src` paths.
- `assets/`: static files such as sample data, images, or fixtures.
- `scripts/`: local automation (build, seed, migration, release helpers).
- `docs/`: architecture notes and design decisions.

Keep modules small and cohesive. Prefer feature-first folders over large utility dumps.

## Build, Test, and Development Commands
Standardize commands through a single task runner once the stack is chosen.
Recommended defaults:
- `npm install` or `pip install -r requirements.txt`: install dependencies.
- `npm run dev` or `python -m src.main`: run local development entrypoint.
- `npm test` or `pytest -q`: execute tests.
- `npm run lint` or `ruff check .`: run static checks.
- `npm run build`: produce production artifacts.

Document the chosen command set in the root README as soon as tooling is added.

## Coding Style & Naming Conventions
- Indentation: 2 spaces for frontend JS/TS, 4 spaces for Python.
- Naming: `snake_case` for Python files/functions, `camelCase` for JS/TS variables/functions, `PascalCase` for classes/components.
- Keep file names descriptive: `user_service.py`, `OrderSummary.tsx`.
- Use project formatters/linters (for example: Prettier/ESLint or Ruff/Black) and run them before commits.

## Testing Guidelines
- Place tests under `tests/` with mirrored paths (example: `src/auth/login.py` -> `tests/auth/test_login.py`).
- Test names should describe behavior (`test_rejects_invalid_token`).
- Include unit tests for new logic and integration tests for external boundaries.
- Target meaningful coverage for changed code; avoid untested critical paths.

## Commit & Pull Request Guidelines
- Follow Conventional Commits where possible: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Keep commits focused; do not mix refactors with behavior changes.
- PRs should include: summary, rationale, test evidence, and issue link (if applicable).
- Add screenshots or sample outputs when changing UI/CLI behavior.

## Security & Configuration Tips
- Never commit secrets. Use `.env` files and provide `.env.example`.
- Keep dependencies updated and pin major runtime/tool versions.
