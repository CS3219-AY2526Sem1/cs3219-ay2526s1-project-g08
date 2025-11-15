#!/bin/bash
set -e

# Manual Deployment Script for User Service
# Usage: ./scripts/manual_deploy.sh

echo "=========================================="
echo "Manual Deployment - User Service"
echo "=========================================="

# Configuration
SERVICE_NAME="user-service"
AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-user-service}"
ECS_CLUSTER="${ECS_CLUSTER:-peerprep-cluster}"
ECS_SERVICE="${ECS_SERVICE:-user-service}"
TASK_FAMILY="${TASK_FAMILY:-user-service}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ENV_FILE="$(dirname "$0")/../.env.production"

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    exit 1
fi

# Check jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Install with: sudo apt-get install jq"
    exit 1
fi

# Check if logged in to AWS
echo "Checking AWS credentials..."
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo "Error: Not authenticated with AWS. Run 'aws configure' first."
    exit 1
}

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"

# Load environment variables from .env.production
echo ""
echo "Loading environment variables from .env.production..."
if [ ! -f "$ENV_FILE" ]; then
    echo "Warning: .env.production file not found at $ENV_FILE"
    echo "Skipping environment variable update. Run manually if needed."
    SKIP_ENV_UPDATE=true
else
    set -a  # automatically export all variables
    source "$ENV_FILE"
    set +a
    
    # Validate required variables
    required_vars=(
        "OAUTH_CLIENT_ID"
        "OAUTH_CLIENT_SECRET"
        "MONGO_URI"
        "JWT_SECRET"
        "REFRESH_TOKEN_SECRET"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "Warning: Missing required variables in .env.production: ${missing_vars[*]}"
        echo "Skipping environment variable update. Run manually if needed."
        SKIP_ENV_UPDATE=true
    else
        echo "✓ All required environment variables found"
        SKIP_ENV_UPDATE=false
    fi
fi

# Build Docker image
echo ""
echo "Building Docker image..."
cd "$(dirname "$0")/.." || exit 1  # Move to user-service directory
docker build -t $SERVICE_NAME:$IMAGE_TAG .

# Tag for ECR
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY"
docker tag $SERVICE_NAME:$IMAGE_TAG $ECR_URI:$IMAGE_TAG

# Login to ECR
echo ""
echo "Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Push to ECR
echo ""
echo "Pushing image to ECR..."
docker push $ECR_URI:$IMAGE_TAG

# Update task definition with environment variables
if [ "$SKIP_ENV_UPDATE" = false ]; then
    echo ""
    echo "Updating task definition with environment variables..."
    
    # Get current task definition
    TASK_DEF=$(aws ecs describe-task-definition \
        --task-definition $ECS_SERVICE \
        --region $AWS_REGION \
        --query 'taskDefinition')
    
    # Update with environment variables
    NEW_TASK_DEF=$(echo $TASK_DEF | jq \
        --arg OAUTH_CLIENT_ID "$OAUTH_CLIENT_ID" \
        --arg OAUTH_CLIENT_SECRET "$OAUTH_CLIENT_SECRET" \
        --arg MONGO_URI "$MONGO_URI" \
        --arg JWT_SECRET "$JWT_SECRET" \
        --arg REFRESH_TOKEN_SECRET "$REFRESH_TOKEN_SECRET" \
        --arg OAUTH_REDIRECT_URI "${OAUTH_REDIRECT_URI:-http://peerprep-alb-1487410036.ap-southeast-1.elb.amazonaws.com/user/auth/callback}" \
        --arg FRONTEND_URL "${FRONTEND_URL:-http://peerprep-alb-1487410036.ap-southeast-1.elb.amazonaws.com}" \
        --arg IMAGE "$ECR_URI:$IMAGE_TAG" '
        .containerDefinitions[0].image = $IMAGE |
        .containerDefinitions[0].environment = [
            {"name": "OAUTH_CLIENT_ID", "value": $OAUTH_CLIENT_ID},
            {"name": "OAUTH_CLIENT_SECRET", "value": $OAUTH_CLIENT_SECRET},
            {"name": "MONGO_URI", "value": $MONGO_URI},
            {"name": "JWT_SECRET", "value": $JWT_SECRET},
            {"name": "REFRESH_TOKEN_SECRET", "value": $REFRESH_TOKEN_SECRET},
            {"name": "OAUTH_REDIRECT_URI", "value": $OAUTH_REDIRECT_URI},
            {"name": "FRONTEND_URL", "value": $FRONTEND_URL},
            {"name": "PORT", "value": "3002"}
        ] |
        # Remove any secrets to avoid conflicts (we use environment variables instead)
        .containerDefinitions[0].secrets = [] |
        del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
    ')
    
    # Register new task definition
    echo "Registering new task definition..."
    NEW_REVISION=$(aws ecs register-task-definition \
        --region $AWS_REGION \
        --cli-input-json "$NEW_TASK_DEF" \
        --query 'taskDefinition.revision' \
        --output text)
    
    echo "New task definition revision: $NEW_REVISION"
    TASK_DEFINITION="$ECS_SERVICE:$NEW_REVISION"
else
    TASK_DEFINITION="$ECS_SERVICE"
fi

# Update ECS service
echo ""
echo ""
echo "🔍 Checking CloudWatch logging configuration..."

# Check if log group exists
if ! aws logs describe-log-groups \
    --log-group-name-prefix "/ecs/user-service" \
    --region "$AWS_REGION" \
    --query 'logGroups[?logGroupName==`/ecs/user-service`]' \
    --output text | grep -q "/ecs/user-service"; then
    
    echo "📝 Setting up CloudWatch logging..."
    
    # Create log group
    aws logs create-log-group \
        --log-group-name /ecs/user-service \
        --region "$AWS_REGION"
    
    # Set retention policy (7 days)
    aws logs put-retention-policy \
        --log-group-name /ecs/user-service \
        --retention-in-days 7 \
        --region "$AWS_REGION"
    
    echo "✅ CloudWatch log group created: /ecs/user-service"
else
    echo "✅ CloudWatch logging already configured"
fi

# Get current task definition and check if logging is configured
TASK_DEF_JSON=$(aws ecs describe-task-definition \
    --task-definition "$TASK_FAMILY" \
    --region "$AWS_REGION")

# Check if logging is already configured
if echo "$TASK_DEF_JSON" | jq -e '.taskDefinition.containerDefinitions[0].logConfiguration' > /dev/null 2>&1; then
    echo "✅ Task definition already has logging configured"
    SKIP_LOGGING_UPDATE=true
else
    echo "📝 Adding logging configuration to task definition..."
    SKIP_LOGGING_UPDATE=false
    
    # Add logConfiguration to the task definition
    NEW_TASK_DEF=$(echo "$TASK_DEF_JSON" | jq '.taskDefinition | 
        .containerDefinitions[0].logConfiguration = {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "/ecs/user-service",
                "awslogs-region": "'"$AWS_REGION"'",
                "awslogs-stream-prefix": "ecs"
            }
        } | 
        {
            family: .family,
            networkMode: .networkMode,
            containerDefinitions: .containerDefinitions,
            requiresCompatibilities: .requiresCompatibilities,
            cpu: .cpu,
            memory: .memory,
            taskRoleArn: .taskRoleArn,
            executionRoleArn: .executionRoleArn
        }')
    
    # Register the updated task definition
    LOGGING_REVISION=$(aws ecs register-task-definition \
        --cli-input-json "$NEW_TASK_DEF" \
        --region "$AWS_REGION" \
        --query 'taskDefinition.revision' \
        --output text)
    
    echo "✅ Logging configuration added (revision: $LOGGING_REVISION)"
fi

echo ""
echo "Updating ECS service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --task-definition $TASK_DEFINITION \
    --force-new-deployment \
    --region $AWS_REGION

echo ""
echo "=========================================="
echo "Deployment initiated successfully!"
echo "Image: $ECR_URI:$IMAGE_TAG"
if [ "$SKIP_ENV_UPDATE" = false ]; then
    echo "Task Definition: $TASK_DEFINITION (with updated env vars)"
else
    echo "Task Definition: Using existing configuration"
fi
if [ "$SKIP_LOGGING_UPDATE" = false ]; then
    echo "CloudWatch Logging: Configured ✅"
fi
echo "=========================================="
echo ""
echo "Monitor deployment status with:"
echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION"
echo ""
echo "View logs with:"
echo "  aws logs tail /ecs/user-service --follow --region $AWS_REGION"
