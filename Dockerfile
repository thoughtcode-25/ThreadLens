# Stage 1: Build the React Vite Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Python FastAPI Backend + Serve Built Frontend
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source and built frontend dist
COPY backend/ ./backend/
COPY --from=frontend-builder /app/dist ./dist

# Environment variables
ENV PORT=8000
EXPOSE 8000

# Start unified full-stack server
CMD ["python", "backend/main.py"]
