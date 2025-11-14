#!/bin/bash
set -e

# ==============================================================================
# PeerPrep - Observability Setup Script
# ==============================================================================
# Sets up CloudWatch Dashboard, Alarms, and Log Insights queries
# ==============================================================================

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
ECS_CLUSTER="peerprep-cluster"
ALB_ARN="arn:aws:elasticloadbalancing:ap-southeast-1:672832942376:loadbalancer/app/peerprep-alb/5a67e8e09c4f4b3a"
SNS_TOPIC_NAME="peerprep-alerts"

echo "════════════════════════════════════════════════════════════════════════════════"
echo "  PeerPrep - Observability Setup"
echo "════════════════════════════════════════════════════════════════════════════════"
echo ""

# ==============================================================================
# Step 1: Create SNS Topic for Alerts
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 1: Creating SNS Topic for Alerts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SNS_TOPIC_ARN=$(aws sns create-topic \
    --name $SNS_TOPIC_NAME \
    --region $AWS_REGION \
    --query 'TopicArn' \
    --output text 2>/dev/null || \
    aws sns list-topics \
        --region $AWS_REGION \
        --query "Topics[?contains(TopicArn, '$SNS_TOPIC_NAME')].TopicArn" \
        --output text)

echo "✅ SNS Topic ARN: $SNS_TOPIC_ARN"
echo ""
echo "⚠️  IMPORTANT: Subscribe to this topic to receive alerts!"
echo "   Run: aws sns subscribe --topic-arn $SNS_TOPIC_ARN --protocol email --notification-endpoint YOUR_EMAIL@example.com"
echo ""

# ==============================================================================
# Step 2: Create CloudWatch Dashboard
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 2: Creating CloudWatch Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > /tmp/peerprep-dashboard.json << 'EOF'
{
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "CPUUtilization", { "stat": "Average", "label": "User Service CPU" }, { "service": "user-service", "cluster": "peerprep-cluster" } ],
                    [ "...", { "service": "question-service", "cluster": "peerprep-cluster", "label": "Question Service CPU" } ],
                    [ "...", { "service": "collaboration-service", "cluster": "peerprep-cluster", "label": "Collaboration Service CPU" } ],
                    [ "...", { "service": "matching-service", "cluster": "peerprep-cluster", "label": "Matching Service CPU" } ],
                    [ "...", { "service": "web-server", "cluster": "peerprep-cluster", "label": "Web Server CPU" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "ap-southeast-1",
                "title": "ECS Service - CPU Utilization",
                "period": 300,
                "yAxis": {
                    "left": {
                        "min": 0,
                        "max": 100
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "MemoryUtilization", { "stat": "Average", "label": "User Service Memory" }, { "service": "user-service", "cluster": "peerprep-cluster" } ],
                    [ "...", { "service": "question-service", "cluster": "peerprep-cluster", "label": "Question Service Memory" } ],
                    [ "...", { "service": "collaboration-service", "cluster": "peerprep-cluster", "label": "Collaboration Service Memory" } ],
                    [ "...", { "service": "matching-service", "cluster": "peerprep-cluster", "label": "Matching Service Memory" } ],
                    [ "...", { "service": "web-server", "cluster": "peerprep-cluster", "label": "Web Server Memory" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "ap-southeast-1",
                "title": "ECS Service - Memory Utilization",
                "period": 300,
                "yAxis": {
                    "left": {
                        "min": 0,
                        "max": 100
                    }
                }
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "RequestCount", { "stat": "Sum" } ],
                    [ ".", "TargetResponseTime", { "stat": "Average" } ],
                    [ ".", "HTTPCode_Target_2XX_Count", { "stat": "Sum", "label": "2xx Responses" } ],
                    [ ".", "HTTPCode_Target_4XX_Count", { "stat": "Sum", "label": "4xx Errors" } ],
                    [ ".", "HTTPCode_Target_5XX_Count", { "stat": "Sum", "label": "5xx Errors" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "ap-southeast-1",
                "title": "ALB - Request Metrics",
                "period": 300
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "HealthyHostCount", { "stat": "Average", "label": "Healthy Targets" }, { "service": "user-service" } ],
                    [ ".", "UnhealthyHostCount", { "stat": "Average", "label": "Unhealthy Targets" }, { "service": "user-service" } ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "ap-southeast-1",
                "title": "Target Health Status",
                "period": 60
            }
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '/ecs/user-service'\n| SOURCE '/ecs/question-service'\n| SOURCE '/ecs/collaboration-service'\n| SOURCE '/ecs/matching-service'\n| SOURCE '/ecs/web-server'\n| fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 100",
                "region": "ap-southeast-1",
                "title": "Recent Errors (All Services)",
                "stacked": false
            }
        },
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "RunningTaskCount", { "service": "user-service", "cluster": "peerprep-cluster" } ],
                    [ "...", { "service": "question-service", "cluster": "peerprep-cluster" } ],
                    [ "...", { "service": "collaboration-service", "cluster": "peerprep-cluster" } ],
                    [ "...", { "service": "matching-service", "cluster": "peerprep-cluster" } ],
                    [ "...", { "service": "web-server", "cluster": "peerprep-cluster" } ]
                ],
                "view": "singleValue",
                "region": "ap-southeast-1",
                "title": "Running Task Count",
                "period": 300
            }
        }
    ]
}
EOF

aws cloudwatch put-dashboard \
    --dashboard-name PeerPrep-Production \
    --dashboard-body file:///tmp/peerprep-dashboard.json \
    --region $AWS_REGION

echo "✅ CloudWatch Dashboard created: PeerPrep-Production"
echo "   View at: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=PeerPrep-Production"
echo ""

# ==============================================================================
# Step 3: Create CloudWatch Alarms
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 3: Creating CloudWatch Alarms"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SERVICES=("user-service" "question-service" "collaboration-service" "matching-service" "web-server")

for service in "${SERVICES[@]}"; do
    echo "Creating alarms for $service..."
    
    # High CPU Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "PeerPrep-${service}-HighCPU" \
        --alarm-description "CPU utilization exceeded 80% for $service" \
        --metric-name CPUUtilization \
        --namespace AWS/ECS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --dimensions Name=ServiceName,Value=$service Name=ClusterName,Value=$ECS_CLUSTER \
        --alarm-actions $SNS_TOPIC_ARN \
        --region $AWS_REGION
    
    # High Memory Alarm
    aws cloudwatch put-metric-alarm \
        --alarm-name "PeerPrep-${service}-HighMemory" \
        --alarm-description "Memory utilization exceeded 80% for $service" \
        --metric-name MemoryUtilization \
        --namespace AWS/ECS \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --dimensions Name=ServiceName,Value=$service Name=ClusterName,Value=$ECS_CLUSTER \
        --alarm-actions $SNS_TOPIC_ARN \
        --region $AWS_REGION
    
    # Service Down Alarm (No Running Tasks)
    aws cloudwatch put-metric-alarm \
        --alarm-name "PeerPrep-${service}-ServiceDown" \
        --alarm-description "$service has no running tasks" \
        --metric-name RunningTaskCount \
        --namespace AWS/ECS \
        --statistic Average \
        --period 60 \
        --threshold 1 \
        --comparison-operator LessThanThreshold \
        --evaluation-periods 2 \
        --dimensions Name=ServiceName,Value=$service Name=ClusterName,Value=$ECS_CLUSTER \
        --alarm-actions $SNS_TOPIC_ARN \
        --treat-missing-data notBreaching \
        --region $AWS_REGION
    
    echo "  ✓ Created 3 alarms for $service"
done

# ALB Target Health Alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "PeerPrep-ALB-UnhealthyTargets" \
    --alarm-description "ALB has unhealthy targets" \
    --metric-name UnHealthyHostCount \
    --namespace AWS/ApplicationELB \
    --statistic Average \
    --period 60 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 2 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

# ALB 5xx Error Rate Alarm
aws cloudwatch put-metric-alarm \
    --alarm-name "PeerPrep-ALB-High5xxErrors" \
    --alarm-description "ALB is returning high 5xx errors" \
    --metric-name HTTPCode_Target_5XX_Count \
    --namespace AWS/ApplicationELB \
    --statistic Sum \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions $SNS_TOPIC_ARN \
    --region $AWS_REGION

echo "✅ Created $(( ${#SERVICES[@]} * 3 + 2 )) CloudWatch Alarms"
echo ""

# ==============================================================================
# Step 4: Create Log Insights Queries
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Step 4: Saved CloudWatch Insights Queries"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat << 'QUERIES'
📊 Useful CloudWatch Insights Queries:

1. Error Analysis (All Services):
   fields @timestamp, @message
   | filter @message like /ERROR/
   | stats count() by bin(5m)

2. Slow Requests:
   fields @timestamp, @message
   | filter @message like /ms/
   | parse @message /(?<duration>\d+)ms/
   | filter duration > 1000
   | sort duration desc

3. Request Volume by Service:
   fields @timestamp
   | stats count() as requests by bin(5m)
   | sort @timestamp desc

4. Failed Authentication Attempts:
   fields @timestamp, @message
   | filter @message like /401/ or @message like /unauthorized/
   | stats count() by bin(1h)

5. Database Connection Issues:
   fields @timestamp, @message
   | filter @message like /MONGO/ or @message like /connection/
   | sort @timestamp desc

QUERIES

echo ""

# ==============================================================================
# Deployment Summary
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Observability Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources Created:"
echo "   • CloudWatch Dashboard: PeerPrep-Production"
echo "   • CloudWatch Alarms: $(( ${#SERVICES[@]} * 3 + 2 ))"
echo "   • SNS Topic: $SNS_TOPIC_NAME"
echo ""
echo "🔗 Quick Links:"
echo "   Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=PeerPrep-Production"
echo "   Alarms:    https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#alarmsV2:"
echo "   Logs:      https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups"
echo ""
echo "⚠️  Next Steps:"
echo "   1. Subscribe to SNS alerts:"
echo "      aws sns subscribe --topic-arn $SNS_TOPIC_ARN --protocol email --notification-endpoint your-email@example.com"
echo ""
echo "   2. Confirm subscription in your email"
echo ""
echo "   3. Test alerts by triggering an alarm (optional)"
echo ""
echo "════════════════════════════════════════════════════════════════════════════════"
