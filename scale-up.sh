#!/bin/bash

# Quick script to scale all services back to 1 (start)

AWS_REGION="ap-southeast-1"
CLUSTER_NAME="peerprep-cluster"

echo "Scaling all services to 1..."

aws ecs update-service --cluster $CLUSTER_NAME --service web-server --desired-count 1 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service user-service --desired-count 1 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service matching-service --desired-count 1 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service question-service --desired-count 1 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service collaboration-service --desired-count 1 --region $AWS_REGION

echo "✓ All services scaled to 1 (running)"
echo "Your application will be online in ~1-2 minutes"
