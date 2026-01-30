# Smart Kisan Backend - Deployment Guide

## 🚀 Docker Hub Publishing

### Build & Push to Docker Hub

```bash
cd backend

# Build the image
docker build -t yourusername/smart-kisan-backend:latest .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push yourusername/smart-kisan-backend:latest
```

## 🔒 Security Checklist

✅ `.dockerignore` created - Excludes `.env` from image
✅ `.gitignore` updated - `.env` never committed to Git
✅ `.env.example` provided - Template for users
✅ Environment variables passed at runtime (not baked into image)

## 📦 Running the Docker Image

### Option 1: Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: yourusername/smart-kisan-backend:latest
    ports:
      - "5000:5000"
    environment:
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      OPENWEATHER_API_KEY: ${OPENWEATHER_API_KEY}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    env_file:
      - .env  # Load from .env file (NOT included in image)
```

Run:
```bash
docker-compose up
```

### Option 2: Direct Docker Run

```bash
docker run -p 5000:5000 \
  -e DB_NAME=your_db \
  -e DB_USER=your_user \
  -e DB_PASSWORD=your_password \
  -e DB_HOST=your_host \
  -e DB_PORT=6543 \
  -e GEMINI_API_KEY=your_key \
  -e OPENWEATHER_API_KEY=your_key \
  -e JWT_SECRET_KEY=your_secret \
  yourusername/smart-kisan-backend:latest
```

### Option 3: Using .env file

```bash
docker run -p 5000:5000 --env-file .env yourusername/smart-kisan-backend:latest
```

## 📋 Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_NAME` | Database name | `farmers` |
| `DB_USER` | Database user | `postgres.xxxxx` |
| `DB_PASSWORD` | Database password | (your password) |
| `DB_HOST` | Database host | `aws-1-ap-northeast-2.pooler.supabase.com` |
| `DB_PORT` | Database port | `6543` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `OPENWEATHER_API_KEY` | OpenWeather API key | `abc123...` |
| `JWT_SECRET_KEY` | Secret for JWT tokens | (random string) |

## 🛡️ Security Best Practices

1. **Never commit `.env` to Git** - Already in `.gitignore`
2. **Never include `.env` in Docker image** - `.dockerignore` prevents this
3. **Use environment variables at runtime** - Pass via `-e` or `--env-file`
4. **Rotate secrets regularly** - Especially API keys and JWT secrets
5. **Use Docker secrets** for production (Kubernetes/Docker Swarm)

## 🚢 Deployment Platforms

### Render
- Use environment variables in dashboard
- Auto-deploys from GitHub

### Railway/Fly.io
```bash
# Set environment variables
flyctl secrets set DB_PASSWORD=xxx GEMINI_API_KEY=xxx ...
```

### AWS ECS/Fargate
- Use AWS Secrets Manager
- Reference secrets in task definition

## 📝 Quick Start

1. Copy `.env.example` to `.env`
2. Fill in your actual values
3. Run: `docker-compose up`
4. Backend available at `http://localhost:5000`
