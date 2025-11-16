#!/bin/bash
set -e

# ==============================================================================
# PeerPrep - Rollback Script
# ==============================================================================
# Rolls back all services to previous task definition revision
# ==============================================================================

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ECS_CLUSTER="peerprep-cluster"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  PeerPrep - Service Rollback"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# Parse arguments
ROLLBACK_ALL=false
SPECIFIC_SERVICE=""

if [ "$1" == "--all" ]; then
    ROLLBACK_ALL=true
elif [ -n "$1" ]; then
    SPECIFIC_SERVICE="$1"
else
    echo "Usage:"
    echo "  bash rollback.sh --all                    # Rollback all services"
    echo "  bash rollback.sh <service-name>           # Rollback specific service"
    echo ""
    echo "Available services:"
    echo "  - user-service"
    echo "  - question-service"
    echo "  - collaboration-service"
    echo "  - matching-service"
    echo "  - web-server"
    echo ""
    exit 1
fi

# ==============================================================================
# Rollback Function
# ==============================================================================
rollback_service() {
    local service_name=$1
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Rolling back: $service_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Get current task definition
    CURRENT_TASK_DEF=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $service_name \
        --region $AWS_REGION \
        --query 'services[0].taskDefinition' \
        --output text)
    
    if [ -z "$CURRENT_TASK_DEF" ] || [ "$CURRENT_TASK_DEF" == "None" ]; then
        echo "❌ Error: Service $service_name not found"
        return 1
    fi
    
    # Extract current revision number
    CURRENT_REVISION=$(echo $CURRENT_TASK_DEF | grep -oP '\d+$')
    
    if [ "$CURRENT_REVISION" == "1" ]; then
        echo "⚠️  Warning: Service is already at revision 1 (no previous revision to rollback to)"
        return 0
    fi
    
    # Calculate previous revision
    PREVIOUS_REVISION=$((CURRENT_REVISION - 1))
    PREVIOUS_TASK_DEF="${service_name}:${PREVIOUS_REVISION}"
    
    echo "Current task definition:  $CURRENT_TASK_DEF"
    echo "Rolling back to:          $PREVIOUS_TASK_DEF"
    echo ""
    
    # Show what changed between versions
    echo "📋 Comparing revisions..."
    
    CURRENT_IMAGE=$(aws ecs describe-task-definition \
        --task-definition $CURRENT_TASK_DEF \
        --region $AWS_REGION \
        --query 'taskDefinition.containerDefinitions[0].image' \
        --output text)
    
    PREVIOUS_IMAGE=$(aws ecs describe-task-definition \
        --task-definition $PREVIOUS_TASK_DEF \
        --region $AWS_REGION \
        --query 'taskDefinition.containerDefinitions[0].image' \
        --output text)
    
    echo "  Current image:  $CURRENT_IMAGE"
    echo "  Previous image: $PREVIOUS_IMAGE"
    echo ""
    
    # Confirm rollback
    read -p "⚠️  Are you sure you want to rollback? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Rollback cancelled"
        return 0
    fi
    
    # Perform rollback
    echo ""
    echo "🔄 Starting rollback..."
    
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $service_name \
        --task-definition $PREVIOUS_TASK_DEF \
        --force-new-deployment \
        --region $AWS_REGION \
        --query 'service.{name:serviceName,status:status,taskDef:taskDefinition}' \
        --output table
    
    echo ""
    echo "⏳ Waiting for service to stabilize (this may take 2-3 minutes)..."
    
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER \
        --services $service_name \
        --region $AWS_REGION
    
    echo "✅ Rollback complete for $service_name"
    echo ""
    
    # Show updated status
    aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $service_name \
        --region $AWS_REGION \
        --query 'services[0].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount,TaskDef:taskDefinition}' \
        --output table
    
    echo ""
}

# ==============================================================================
# Main Execution
# ==============================================================================

if [ "$ROLLBACK_ALL" == "true" ]; then
    SERVICES=("user-service" "question-service" "collaboration-service" "matching-service" "web-server")
    
    echo "⚠️  WARNING: You are about to rollback ALL services!"
    echo ""
    echo "Services to rollback:"
    for service in "${SERVICES[@]}"; do
        echo "  • $service"
    done
    echo ""
    read -p "Are you absolutely sure? (type 'ROLLBACK ALL' to confirm): " FINAL_CONFIRM
    
    if [ "$FINAL_CONFIRM" != "ROLLBACK ALL" ]; then
        echo "❌ Rollback cancelled"
        exit 1
    fi
    
    echo ""
    
    for service in "${SERVICES[@]}"; do
        # Skip confirmation for batch rollback
        CONFIRM="yes"
        rollback_service $service
    done
    
else
    rollback_service $SPECIFIC_SERVICE
fi

# ==============================================================================
# Summary
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Rollback Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔍 Verify the rollback:"
echo "   1. Check application: http://peerprep-alb-1487410036.ap-southeast-1.elb.amazonaws.com"
echo "   2. Monitor logs:      aws logs tail /ecs/$service_name --follow"
echo "   3. Check metrics:     CloudWatch Dashboard (PeerPrep-Production)"
echo ""
echo "⚠️  If issues persist:"
echo "   • Check CloudWatch Logs for errors"
echo "   • Verify task definition configuration"
echo "   • Consider rolling back to an earlier revision"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
