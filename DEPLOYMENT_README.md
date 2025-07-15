# Quick Start Deployment Guide

This directory contains all the files needed to deploy your CrispTerms application to Google Cloud Platform.

## Files Overview

- **`GOOGLE_CLOUD_DEPLOYMENT.md`** - Comprehensive deployment guide
- **`deploy.sh`** - Automated deployment script
- **`Dockerfile.backend`** - Backend container configuration
- **`Dockerfile.frontend`** - Frontend container configuration
- **`nginx.conf`** - Nginx configuration for frontend
- **`cloudbuild.yaml`** - CI/CD pipeline configuration
- **`dashboard-config.json`** - Monitoring dashboard configuration

## Quick Start

### 1. Prerequisites
- Google Cloud Account
- Google Cloud CLI installed
- Docker installed
- Git repository with your code

### 2. Environment Setup
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

### 3. Run Deployment
```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

### 4. Manual Deployment (Alternative)
If you prefer manual deployment, follow the step-by-step guide in `GOOGLE_CLOUD_DEPLOYMENT.md`.

## What Gets Deployed

### Backend (FastAPI)
- **Service**: `policy-agent-backend`
- **Runtime**: Cloud Run
- **Memory**: 2GB
- **CPU**: 2 cores
- **Max Instances**: 10

### Frontend (React/Vite)
- **Service**: `policy-agent-frontend`
- **Runtime**: Cloud Run with Nginx
- **Memory**: 512MB
- **CPU**: 1 core
- **Max Instances**: 5

## Post-Deployment

1. **Test your application** using the provided URLs
2. **Set up monitoring** with the included dashboard
3. **Configure custom domain** (optional)
4. **Set up CI/CD** with Cloud Build
5. **Monitor costs** and set up billing alerts

## Troubleshooting

### Common Issues

1. **CORS Errors**: Update `ALLOWED_ORIGINS` in your environment variables
2. **Build Failures**: Check Docker logs and ensure all dependencies are in requirements.txt
3. **Memory Issues**: Increase memory allocation in Cloud Run configuration
4. **Cold Starts**: Consider using minimum instances for better performance

### Useful Commands

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

## Cost Optimization

- Monitor Cloud Run instance usage
- Adjust memory and CPU allocation based on actual usage
- Set appropriate max-instances limits
- Use Cloud Run's automatic scaling features
- Set up budget alerts

## Security Best Practices

- Use service accounts with minimal required permissions
- Enable security headers
- Configure CORS properly
- Use HTTPS for all communications
- Regularly update dependencies

For detailed information, refer to `GOOGLE_CLOUD_DEPLOYMENT.md`. 