# Google Cloud Deployment Guide for Policy Agent AI

This guide will walk you through deploying your Policy Agent AI application to Google Cloud Platform (GCP). Your application consists of a React frontend and a FastAPI backend with Supabase integration.

## Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud CLI**: Install from [cloud.google.com/sdk](https://cloud.google.com/sdk)
3. **Docker**: Install from [docker.com](https://docker.com)
4. **Git**: Ensure your code is in a Git repository

## Step 1: Project Setup and Preparation

### 1.1 Initialize Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (replace with your desired project name)
gcloud projects create crispterms-[YOUR-UNIQUE-ID]

# Set the project as default
gcloud config set project crispterms-[YOUR-UNIQUE-ID]

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
```

### 1.2 Prepare Environment Variables

Create a `.env` file in your project root:

```bash
# Backend Environment Variables
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000

# Frontend Environment Variables
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_API_URL=https://your-backend-url.com
```

## Step 2: Backend Deployment (FastAPI)

### 2.1 Create Dockerfile for Backend

Create `Dockerfile.backend` in your project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8080"]
```

### 2.2 Add Health Check Endpoint

Add this to your `src/app.py`:

```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
```

### 2.3 Build and Deploy Backend

```bash
# Build the Docker image
docker build -f Dockerfile.backend -t gcr.io/crispterms-[YOUR-UNIQUE-ID]/backend .

# Push to Google Container Registry
docker push gcr.io/crispterms-[YOUR-UNIQUE-ID]/backend

# Deploy to Cloud Run
gcloud run deploy policy-agent-backend \
    --image gcr.io/crispterms-[YOUR-UNIQUE-ID]/backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,ALLOWED_ORIGINS=$ALLOWED_ORIGINS \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 10
```

## Step 3: Frontend Deployment (React/Vite)

### 3.1 Create Dockerfile for Frontend

Create `Dockerfile.frontend` in your project root:

```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 3.2 Create Nginx Configuration

Create `nginx.conf` in your project root:

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 8080;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Handle React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 3.3 Update Vite Configuration

Update your `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  define: {
    'process.env': {},
  },
})
```

### 3.4 Build and Deploy Frontend

```bash
# Build the Docker image
docker build -f Dockerfile.frontend -t gcr.io/crispterms-[YOUR-UNIQUE-ID]/frontend .

# Push to Google Container Registry
docker push gcr.io/crispterms-[YOUR-UNIQUE-ID]/frontend

# Deploy to Cloud Run
gcloud run deploy policy-agent-frontend \
    --image gcr.io/crispterms-[YOUR-UNIQUE-ID]/frontend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 5
```

## Step 4: Set Up Custom Domain (Optional)

### 4.1 Configure Domain

```bash
# Map custom domain to Cloud Run services
gcloud run domain-mappings create \
    --service policy-agent-frontend \
    --domain your-domain.com \
    --region us-central1

gcloud run domain-mappings create \
    --service policy-agent-backend \
    --domain api.your-domain.com \
    --region us-central1
```

### 4.2 Set Up SSL Certificate

```bash
# Enable Cloud Load Balancing
gcloud services enable compute.googleapis.com

# Create SSL certificate
gcloud compute ssl-certificates create policy-agent-cert \
    --domains your-domain.com,api.your-domain.com \
    --global
```

## Step 5: Set Up Monitoring and Logging

### 5.1 Enable Cloud Monitoring

```bash
# Enable monitoring APIs
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com

# Create monitoring dashboard
gcloud monitoring dashboards create --config-from-file=dashboard-config.json
```

### 5.2 Create Dashboard Configuration

Create `dashboard-config.json`:

```json
{
  "displayName": "Policy Agent AI Dashboard",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "Request Count",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_count\""
                }
              }
            }
          ]
        }
      },
      {
        "title": "Response Time",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\""
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

## Step 6: Set Up CI/CD Pipeline

### 6.1 Create Cloud Build Configuration

Create `cloudbuild.yaml` in your project root:

```yaml
steps:
  # Build and deploy backend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.backend', '-t', 'gcr.io/$PROJECT_ID/backend:$COMMIT_SHA', '.']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/backend:$COMMIT_SHA']
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'policy-agent-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/backend:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'GEMINI_API_KEY=${_GEMINI_API_KEY},SUPABASE_URL=${_SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${_SUPABASE_SERVICE_ROLE_KEY}'

  # Build and deploy frontend
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-f', 'Dockerfile.frontend', '-t', 'gcr.io/$PROJECT_ID/frontend:$COMMIT_SHA', '.']
  
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/frontend:$COMMIT_SHA']
  
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'policy-agent-frontend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/frontend:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'

substitutions:
  _GEMINI_API_KEY: 'your-gemini-api-key'
  _SUPABASE_URL: 'your-supabase-url'
  _SUPABASE_SERVICE_ROLE_KEY: 'your-supabase-service-role-key'

images:
  - 'gcr.io/$PROJECT_ID/backend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/frontend:$COMMIT_SHA'
```

### 6.2 Connect GitHub Repository

```bash
# Connect your GitHub repository to Cloud Build
gcloud builds triggers create github \
    --repo-name=policy-agent-ai \
    --repo-owner=your-github-username \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml
```

## Step 7: Security and Best Practices

### 7.1 Set Up IAM Roles

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create policy-agent-sa \
    --display-name="Policy Agent Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding crispterms-[YOUR-UNIQUE-ID] \
    --member="serviceAccount:policy-agent-sa@crispterms-[YOUR-UNIQUE-ID].iam.gserviceaccount.com" \
    --role="roles/run.invoker"
```

### 7.2 Configure Security Headers

Add security headers to your FastAPI app:

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Add security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["your-domain.com"])
app.add_middleware(HTTPSRedirectMiddleware)
```

## Step 8: Testing and Validation

### 8.1 Test Your Deployment

```bash
# Get your service URLs
FRONTEND_URL=$(gcloud run services describe policy-agent-frontend --region=us-central1 --format="value(status.url)")
BACKEND_URL=$(gcloud run services describe policy-agent-backend --region=us-central1 --format="value(status.url)")

echo "Frontend URL: $FRONTEND_URL"
echo "Backend URL: $BACKEND_URL"

# Test health endpoints
curl $BACKEND_URL/health
curl $FRONTEND_URL
```

### 8.2 Performance Testing

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test backend performance
ab -n 100 -c 10 $BACKEND_URL/health

# Test frontend performance
ab -n 100 -c 10 $FRONTEND_URL
```

## Step 9: Cost Optimization

### 9.1 Set Up Budget Alerts

```bash
# Create budget
gcloud billing budgets create \
    --billing-account=your-billing-account-id \
    --display-name="Policy Agent AI Budget" \
    --budget-amount=100USD \
    --threshold-rules=threshold=0.5,basis=current_spend \
    --threshold-rules=threshold=0.8,basis=current_spend \
    --threshold-rules=threshold=1.0,basis=current_spend
```

### 9.2 Optimize Resource Allocation

- Monitor Cloud Run instance usage
- Adjust memory and CPU allocation based on actual usage
- Set appropriate max-instances limits
- Use Cloud Run's automatic scaling features

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure `ALLOWED_ORIGINS` includes your frontend domain
2. **Environment Variables**: Verify all required env vars are set in Cloud Run
3. **Memory Issues**: Increase memory allocation if you see OOM errors
4. **Cold Starts**: Consider using Cloud Run's minimum instances feature

### Useful Commands:

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Check service status
gcloud run services list --region=us-central1

# Update environment variables
gcloud run services update policy-agent-backend \
    --set-env-vars NEW_VAR=value \
    --region=us-central1
```

## Next Steps

1. Set up monitoring alerts for critical metrics
2. Implement automated backups for your Supabase database
3. Set up staging environment for testing
4. Configure CDN for static assets
5. Implement rate limiting and DDoS protection

Your Policy Agent AI application is now deployed and ready for production use on Google Cloud Platform! 