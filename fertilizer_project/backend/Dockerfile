# Build stage for dependencies
FROM python:3.10-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.10-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -r appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run FastAPI with uvicorn
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
