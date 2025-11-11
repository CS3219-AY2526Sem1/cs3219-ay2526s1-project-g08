#!/bin/bash
set -e

# ==============================================================================
# PeerPrep - Complete Deployment Script
# ==============================================================================
# This script builds, deploys, and starts all services on AWS ECS
# Run this after services have been scaled down to 0
#
# Usage: bash deploy-all-services.sh
# ==============================================================================

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  PeerPrep - Full Deployment to AWS ECS"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Configuration
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ECS_CLUSTER="peerprep-cluster"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ALB_URL="http://peerprep-alb-1487410036.ap-southeast-1.elb.amazonaws.com"

# ==============================================================================
# Pre-flight Checks
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 0: Pre-flight Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed"
    exit 1
fi
echo "✅ AWS CLI installed"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    exit 1
fi
echo "✅ Docker installed"

# Check jq
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed"
    echo "   Install with: sudo apt-get install jq (Linux) or brew install jq (Mac)"
    exit 1
fi
echo "✅ jq installed"

# Check AWS credentials
echo "Checking AWS credentials..."
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo "❌ Error: Not authenticated with AWS. Run 'aws configure' first."
    exit 1
}
echo "✅ AWS credentials valid"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo ""
echo "Configuration:"
echo "  • AWS Account ID: $AWS_ACCOUNT_ID"
echo "  • Region: $AWS_REGION"
echo "  • ECS Cluster: $ECS_CLUSTER"
echo "  • ALB URL: $ALB_URL"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Get Secrets Manager ARN
echo "Retrieving Secrets Manager ARN..."
SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id peerprep/secrets \
    --region $AWS_REGION \
    --query 'ARN' \
    --output text)
echo "✅ Secret ARN: $SECRET_ARN"
echo ""

# ==============================================================================
# Helper Functions
# ==============================================================================

build_and_push_image() {
    local service_name=$1
    local service_dir=$2
    local ecr_repo=$3
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Building and Pushing: $service_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    local ecr_uri="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ecr_repo}"
    
    # Create ECR repository if it doesn't exist
    echo "📦 Ensuring ECR repository exists: $ecr_repo"
    aws ecr create-repository \
        --repository-name $ecr_repo \
        --region $AWS_REGION 2>/dev/null || true
    
    # Build Docker image
    echo "🔨 Building Docker image..."
    cd $service_dir
    docker build -t ${service_name}:${IMAGE_TAG} .
    
    # Tag for ECR
    echo "🏷️  Tagging image for ECR..."
    docker tag ${service_name}:${IMAGE_TAG} ${ecr_uri}:${IMAGE_TAG}
    
    # Login to ECR
    echo "🔐 Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin ${ecr_uri}
    
    # Push to ECR
    echo "⬆️  Pushing image to ECR..."
    docker push ${ecr_uri}:${IMAGE_TAG}
    
    cd - > /dev/null
    echo "✅ $service_name image pushed successfully"
    echo ""
}

deploy_service() {
    local service_name=$1
    local task_def_file=$2
    
    echo "📋 Registering task definition for $service_name..."
    
    # Register task definition
    TASK_DEF_ARN=$(aws ecs register-task-definition \
        --cli-input-json file://${task_def_file} \
        --region $AWS_REGION \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    echo "✅ Task definition registered: $TASK_DEF_ARN"
    
    # Update service with new task definition
    echo "🔄 Updating ECS service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $service_name \
        --task-definition $service_name \
        --force-new-deployment \
        --desired-count 1 \
        --region $AWS_REGION \
        --query 'service.{name:serviceName,status:status,desiredCount:desiredCount,runningCount:runningCount}' \
        --output table
    
    echo "✅ $service_name service updated"
    echo ""
}

# ==============================================================================
# Step 1: Build and Push User Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1/5: User Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "user-service" "user-service" "user-service"
deploy_service "user-service" ".aws/task-definitions/user-service.json"

# ==============================================================================
# Step 2: Build and Push Matching Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2/5: Matching Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "matching-service" "matching-service" "peerprep/matching-service"
deploy_service "matching-service" ".aws/task-definitions/matching-service.json"

# ==============================================================================
# Step 3: Build and Push Question Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3/5: Question Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "question-service" "question-service" "question-service"
deploy_service "question-service" ".aws/task-definitions/question-service.json"

# ==============================================================================
# Step 4: Build and Push Collaboration Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4/5: Collaboration Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "collaboration-service" "collaboration-service" "collaboration-service"
deploy_service "collaboration-service" ".aws/task-definitions/collaboration-service.json"

# ==============================================================================
# Step 5: Build and Push Web Server
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 5/5: Web Server (Frontend)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "web-server" "web-server" "peerprep/web-server"
deploy_service "web-server" ".aws/task-definitions/web-server.json"
echo ""

# ==============================================================================
# Wait for Services to Stabilize
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Waiting for Services to Stabilize"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This may take 2-3 minutes..."
echo ""

SERVICES=("user-service" "matching-service" "question-service" "collaboration-service" "web-server")

for service in "${SERVICES[@]}"; do
    echo "⏳ Waiting for $service to stabilize..."
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER \
        --services $service \
        --region $AWS_REGION
    echo "✅ $service is stable"
done

echo ""

# ==============================================================================
# Deployment Summary
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment Complete! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All services deployed and running!"
echo ""
echo "🌐 Application URL:"
echo "   $ALB_URL"
echo ""
echo "📊 Service Status:"
aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services user-service matching-service question-service collaboration-service web-server \
    --region $AWS_REGION \
    --query 'services[*].[serviceName,desiredCount,runningCount,deployments[0].status]' \
    --output table

echo ""
echo "🔍 Monitor logs with:"
echo "   aws logs tail /ecs/user-service --follow --region $AWS_REGION"
echo "   aws logs tail /ecs/matching-service --follow --region $AWS_REGION"
echo "   aws logs tail /ecs/question-service --follow --region $AWS_REGION"
echo "   aws logs tail /ecs/collaboration-service --follow --region $AWS_REGION"
echo "   aws logs tail /ecs/web-server --follow --region $AWS_REGION"
echo ""
echo "🧪 Test your application:"
echo "   1. Visit: $ALB_URL"
echo "   2. Login with GitHub"
echo "   3. Test matchmaking and collaboration features"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
