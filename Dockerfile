# =========================================================
# Stage 1: Build the React Native (Expo) Web Application
# =========================================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies manifest
COPY frontend/package.json frontend/package-lock.json ./

# Install npm packages
RUN npm ci --legacy-peer-deps

# Copy frontend source code
COPY frontend/ ./

# Compile static assets for production web hosting (outputs to frontend/dist)
RUN npx expo export --platform web

# =========================================================
# Stage 2: Spin up the Python FastAPI Production Server
# =========================================================
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (e.g. curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependencies manifest
COPY backend/requirements.txt ./backend/

# Install python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy the compiled React static files from Stage 1 directly beside main.py
COPY --from=frontend-builder /app/frontend/dist ./backend/dist

# Expose server port
EXPOSE 8000

# Set running directory to the backend folder
WORKDIR /app/backend

# Launch the FastAPI app using Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
