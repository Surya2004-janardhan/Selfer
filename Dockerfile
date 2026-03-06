# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv for fast dependency resolution
RUN pip install uv --no-cache-dir

# Copy dependency specs first (layer caching)
COPY pyproject.toml ./
COPY src/ ./src/

# Install into a local venv
RUN uv sync --no-dev

# ─── Runtime Stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy installed env + source from builder
COPY --from=builder /app /app

# Create the workspace directory for Selfer state
RUN mkdir -p /workspace/.selfer/logs /workspace/.selfer/sessions

# Environment defaults (override via --env-file or docker-compose)
ENV TELEGRAM_BOT_TOKEN=""
ENV OPENAI_API_KEY=""
ENV GEMINI_API_KEY=""
ENV GROQ_API_KEY=""
ENV ANTHROPIC_API_KEY=""
ENV OLLAMA_HOST="http://host.docker.internal:11434"
ENV SELFER_WORKSPACE="/workspace"

WORKDIR /workspace

# Expose the selfer CLI
ENTRYPOINT ["python", "-m", "selfer.cli.main"]
CMD ["start", "--no-telegram"]
