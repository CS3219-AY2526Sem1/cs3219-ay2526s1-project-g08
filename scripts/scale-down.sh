#!/bin/bash

# Quick script to scale all services to 0 (stop)

AWS_REGION="ap-southeast-1"
CLUSTER_NAME="peerprep-cluster"

echo "Scaling all services to 0..."

aws ecs update-service --cluster $CLUSTER_NAME --service web-server --desired-count 0 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service user-service --desired-count 0 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service matching-service --desired-count 0 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service question-service --desired-count 0 --region $AWS_REGION
aws ecs update-service --cluster $CLUSTER_NAME --service collaboration-service --desired-count 0 --region $AWS_REGION

echo "✓ All services scaled to 0 (stopped)"
echo "Your application is now offline and not incurring compute costs"
