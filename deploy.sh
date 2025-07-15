#!/bin/bash

# CrispTerms - Google Cloud Deployment Script
# This script automates the deployment process to Google Cloud Platform

set -e  # Exit on any error

# Configuration
PROJECT_ID="crispterms"  # Use your existing project
REGION="us-central1"
BACKEND_SERVICE="crispterms-backend"
FRONTEND_SERVICE="crispterms-frontend"

echo "🚀 Starting Policy Agent AI deployment to Google Cloud..."

# Step 1: Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Step 2: Login to Google Cloud
echo "🔐 Logging into Google Cloud..."
gcloud auth login --no-launch-browser

# Step 3: Create and configure project
echo "🏗️  Creating Google Cloud project: $PROJECT_ID"
gcloud projects create $PROJECT_ID --name="CrispTerms"

echo "⚙️  Setting project as default..."
gcloud config set project $PROJECT_ID

echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
#gcloud services enable run.googleapis.com  # Usually already enabled
#gcloud services enable artifactregistry.googleapis.com

# Step 4: Configure Docker for Google Container Registry
echo "🐳 Configuring Docker for Google Container Registry..."
gcloud auth configure-docker

# Step 5: Load environment variables
echo "📝 Loading environment variables..."
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one with your API keys:"
    echo "   GEMINI_API_KEY=your_gemini_api_key"
    echo "   SUPABASE_URL=your_supabase_url"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key"
    echo "   ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000"
    exit 1
fi

source .env

# Step 6: Build and deploy backend
echo "🔧 Building and deploying backend..."
docker build -f Dockerfile.backend -t gcr.io/$PROJECT_ID/backend .
docker push gcr.io/$PROJECT_ID/backend

gcloud run deploy $BACKEND_SERVICE \
    --image gcr.io/$PROJECT_ID/backend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,ALLOWED_ORIGINS=$ALLOWED_ORIGINS \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 10

# Step 7: Build and deploy frontend
echo "🎨 Building and deploying frontend..."
docker build -f Dockerfile.frontend -t gcr.io/$PROJECT_ID/frontend .
docker push gcr.io/$PROJECT_ID/frontend

gcloud run deploy $FRONTEND_SERVICE \
    --image gcr.io/$PROJECT_ID/frontend \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 512Mi \
    --cpu 1 \
    --max-instances 5

# Step 8: Get service URLs
echo "🔗 Getting service URLs..."
FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region=$REGION --format="value(status.url)")
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region=$REGION --format="value(status.url)")

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📱 Frontend URL: $FRONTEND_URL"
echo "🔧 Backend URL: $BACKEND_URL"
echo ""
echo "🧪 Testing deployment..."

# Step 9: Test deployment
echo "🔍 Testing health endpoints..."
if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
fi

if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
fi

echo ""
echo "📊 Setting up monitoring dashboard..."
gcloud monitoring dashboards create --config-from-file=dashboard-config.json

echo ""
echo "🎯 Next steps:"
echo "1. Update your frontend environment variables with the new backend URL"
echo "2. Test the application functionality"
echo "3. Set up custom domain (optional)"
echo "4. Configure monitoring alerts"
echo "5. Set up CI/CD pipeline with Cloud Build"
echo ""
echo "📚 For more information, see: GOOGLE_CLOUD_DEPLOYMENT.md"
echo ""
echo "💰 Don't forget to set up billing alerts to monitor costs!" 