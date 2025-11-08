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
deploy_service "user-service" "user-service-task-def-new.json"

# ==============================================================================
# Step 2: Build and Push Matching Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2/5: Matching Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "matching-service" "matching-service" "peerprep/matching-service"

# Check if REDIS_URI exists in Secrets Manager
echo "📋 Checking for REDIS_URI in Secrets Manager..."
SECRET_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id peerprep/secrets \
    --region $AWS_REGION \
    --query 'SecretString' \
    --output text 2>/dev/null || echo "{}")

REDIS_SECRET_EXISTS=$(echo $SECRET_VALUE | jq -r 'has("REDIS_URI")' 2>/dev/null || echo "false")

# Create task definition for matching service
echo "📋 Creating task definition for matching-service..."

if [ "$REDIS_SECRET_EXISTS" == "true" ]; then
    echo "   ✅ Using REDIS_URI from Secrets Manager"
    cat > /tmp/matching-service-task-def.json <<EOF
{
    "family": "matching-service",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "matching-service",
            "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/peerprep/matching-service:${IMAGE_TAG}",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "PORT",
                    "value": "3001"
                }
            ],
            "secrets": [
                {
                    "name": "REDIS_URI",
                    "valueFrom": "${SECRET_ARN}:REDIS_URI::"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/matching-service",
                    "awslogs-create-group": "true",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  ⚠️  REDIS_URI NOT FOUND IN SECRETS MANAGER"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "The matching service requires a Redis instance. You have two options:"
    echo ""
    echo "Option 1: Add REDIS_URI to AWS Secrets Manager (RECOMMENDED)"
    echo "  1. Get your current secrets:"
    echo "     aws secretsmanager get-secret-value --secret-id peerprep/secrets --region $AWS_REGION --query SecretString --output text | jq ."
    echo ""
    echo "  2. Add REDIS_URI to the secret (replace YOUR_REDIS_URI with actual value):"
    echo "     Example formats:"
    echo "       - redis://your-redis-host:6379"
    echo "       - rediss://your-elasticache.cache.amazonaws.com:6379 (for AWS ElastiCache with TLS)"
    echo ""
    echo "     Update command:"
    echo "     aws secretsmanager update-secret --secret-id peerprep/secrets --region $AWS_REGION \\"
    echo "       --secret-string '{\"JWT_SECRET\":\"...\",\"REFRESH_TOKEN_SECRET\":\"...\",\"MONGO_URI\":\"...\",\"REDIS_URI\":\"YOUR_REDIS_URI\"}'"
    echo ""
    echo "Option 2: Deploy without Redis (matching service will fail)"
    echo "  - The service will attempt to use redis://redis:6379 which won't work in ECS"
    echo ""
    read -p "Do you want to continue without REDIS_URI? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled. Please add REDIS_URI to Secrets Manager and try again."
        exit 1
    fi
    
    echo "   ⚠️  Deploying without REDIS_URI - matching service will NOT work!"
    cat > /tmp/matching-service-task-def.json <<EOF
{
    "family": "matching-service",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "matching-service",
            "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/peerprep/matching-service:${IMAGE_TAG}",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "PORT",
                    "value": "3001"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/matching-service",
                    "awslogs-create-group": "true",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF
fi

deploy_service "matching-service" "/tmp/matching-service-task-def.json"
rm /tmp/matching-service-task-def.json

# ==============================================================================
# Step 3: Build and Push Question Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3/5: Question Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "question-service" "question-service" "question-service"

# Create clean task definition for question service
echo "📋 Creating task definition for question-service..."
cat > /tmp/question-service-task-def-clean.json <<EOF
{
    "family": "question-service",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "1024",
    "memory": "3072",
    "runtimePlatform": {
        "cpuArchitecture": "X86_64",
        "operatingSystemFamily": "LINUX"
    },
    "containerDefinitions": [
        {
            "name": "question-service",
            "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/question-service:${IMAGE_TAG}",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 3003,
                    "hostPort": 3003,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "PORT",
                    "value": "3003"
                }
            ],
            "secrets": [
                {
                    "name": "MONGO_URI",
                    "valueFrom": "${SECRET_ARN}:MONGO_URI::"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/question-service",
                    "awslogs-create-group": "true",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs"
                }
            }
        }
    ]
}
EOF

deploy_service "question-service" "/tmp/question-service-task-def-clean.json"
rm /tmp/question-service-task-def-clean.json

# ==============================================================================
# Step 4: Build and Push Collaboration Service
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4/5: Collaboration Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

build_and_push_image "collaboration-service" "collaboration-service" "collaboration-service"
deploy_service "collaboration-service" "collab-task-def-new.json"

# ==============================================================================
# Step 5: Build and Push Web Server
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 5/5: Web Server (Frontend)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if web-server-config.json exists
if [ ! -f "web-server-config.json" ]; then
    echo "⚠️  Warning: web-server-config.json not found."
    echo "   Creating default configuration..."
    
    # Get default subnet and security group
    DEFAULT_VPC=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region $AWS_REGION --query 'Vpcs[0].VpcId' --output text)
    SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC" --region $AWS_REGION --query 'Subnets[0:2].SubnetId' --output json)
    SUBNET_1=$(echo $SUBNETS | jq -r '.[0]')
    SUBNET_2=$(echo $SUBNETS | jq -r '.[1]')
    
    # Get or create security group
    ECS_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=peerprep-ecs-sg" "Name=vpc-id,Values=$DEFAULT_VPC" \
        --region $AWS_REGION \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || echo "none")
    
    if [ "$ECS_SG_ID" == "none" ]; then
        echo "   Creating ECS security group..."
        ECS_SG_ID=$(aws ec2 create-security-group \
            --group-name peerprep-ecs-sg \
            --description "Security group for PeerPrep ECS tasks" \
            --vpc-id $DEFAULT_VPC \
            --region $AWS_REGION \
            --query 'GroupId' \
            --output text)
        
        # Add inbound rules
        aws ec2 authorize-security-group-ingress \
            --group-id $ECS_SG_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0 \
            --region $AWS_REGION
    fi
    
    # Get target group
    TG_WEB=$(aws elbv2 describe-target-groups \
        --names peerprep-web-server \
        --region $AWS_REGION \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || echo "")
    
    cat > web-server-config.json <<EOF
{
    "ALB_DNS": "peerprep-alb-1487410036.ap-southeast-1.elb.amazonaws.com",
    "ECS_SG_ID": "$ECS_SG_ID",
    "SUBNET_1": "$SUBNET_1",
    "SUBNET_2": "$SUBNET_2",
    "TG_WEB": "$TG_WEB"
}
EOF
    echo "   ✅ Configuration file created"
fi

build_and_push_image "web-server" "web-server" "peerprep/web-server"

# Load configuration
ALB_DNS=$(jq -r '.ALB_DNS' web-server-config.json)
ECS_SG_ID=$(jq -r '.ECS_SG_ID' web-server-config.json)
SUBNET_1=$(jq -r '.SUBNET_1' web-server-config.json)
SUBNET_2=$(jq -r '.SUBNET_2' web-server-config.json)
TG_WEB=$(jq -r '.TG_WEB' web-server-config.json)

# Create web server task definition
echo "📋 Creating task definition for web-server..."
cat > /tmp/web-server-task-def.json <<EOF
{
    "family": "web-server",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "256",
    "memory": "512",
    "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
    "containerDefinitions": [
        {
            "name": "web-server",
            "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/peerprep/web-server:${IMAGE_TAG}",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 80,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "API_BASE_URL",
                    "value": "http://${ALB_DNS}"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/ecs/web-server",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "ecs",
                    "awslogs-create-group": "true"
                }
            }
        }
    ]
}
EOF

TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json file:///tmp/web-server-task-def.json \
    --region $AWS_REGION \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ Task definition registered: $TASK_DEF_ARN"

# Check if service exists
EXISTING_SERVICE=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services web-server \
    --region $AWS_REGION \
    --query 'services[?status==`ACTIVE`].serviceName' \
    --output text)

if [ -n "$EXISTING_SERVICE" ]; then
    echo "🔄 Updating existing web-server service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service web-server \
        --task-definition $TASK_DEF_ARN \
        --force-new-deployment \
        --desired-count 1 \
        --region $AWS_REGION
else
    echo "🆕 Creating new web-server service..."
    aws ecs create-service \
        --cluster $ECS_CLUSTER \
        --service-name web-server \
        --task-definition $TASK_DEF_ARN \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$TG_WEB,containerName=web-server,containerPort=80" \
        --health-check-grace-period-seconds 60 \
        --region $AWS_REGION
fi

rm /tmp/web-server-task-def.json
echo "✅ web-server service updated"
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
