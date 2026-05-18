# Bobcat backend container - Railway builds this when it sees a Dockerfile
# at the configured Root Directory. We use python:3.11-slim because:
#   - Small base image (~50MB)
#   - apt-get available so we can install git for the GitHub-clone path
#   - Matches the version pinned in runtime.txt
FROM python:3.11-slim

# System packages: git is REQUIRED for the GitHub-URL "Parse" code path.
# build-essential + libssl-dev help wheels that need to compile from source
# (some langchain / cryptography deps). Cleaned up in the same RUN layer
# to keep the image small.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        git \
        ca-certificates \
        build-essential \
        libssl-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so this layer caches across code-only changes.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source. .dockerignore keeps caches and
# secrets out of the build context.
COPY . .

# Railway injects PORT at runtime; default 8000 for local docker runs.
ENV PORT=8000
EXPOSE 8000

# Honour Railway's PORT env var. We invoke uvicorn directly rather than the
# Procfile so the Dockerfile is self-contained.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
