#!/bin/bash

# Setup S3 + CloudFront for PeerPrep Frontend
# This script creates the infrastructure needed to host the web-server on S3 + CloudFront

set -e

BUCKET_NAME="peerprep-frontend-prod"
REGION="ap-southeast-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 Setting up S3 + CloudFront for PeerPrep Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Configuration:"
echo "  • Bucket: $BUCKET_NAME"
echo "  • Region: $REGION"
echo "  • Account: $ACCOUNT_ID"
echo ""

# Step 1: Create S3 bucket
echo "📦 Step 1/6: Creating S3 bucket..."
if aws s3 ls "s3://$BUCKET_NAME" 2>/dev/null; then
  echo "  ✓ Bucket already exists"
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
  echo "  ✓ Bucket created"
fi

# Step 2: Enable versioning
echo "📚 Step 2/6: Enabling versioning..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
echo "  ✓ Versioning enabled"

# Step 3: Block public access (CloudFront will access privately)
echo "🔒 Step 3/6: Configuring bucket access..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "  ✓ Public access blocked (CloudFront will use OAC)"

# Step 4: Create CloudFront Origin Access Control (OAC)
echo "🌐 Step 4/6: Creating CloudFront Origin Access Control..."
OAC_NAME="peerprep-frontend-oac"

# Check if OAC already exists
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$OAC_NAME'].Id" \
  --output text 2>/dev/null || echo "")

if [ -z "$OAC_ID" ]; then
  # Create new OAC
  OAC_CONFIG=$(cat <<EOF
{
  "Name": "$OAC_NAME",
  "Description": "OAC for PeerPrep frontend S3 bucket",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
}
EOF
)
  
  OAC_RESULT=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config "$OAC_CONFIG")
  OAC_ID=$(echo "$OAC_RESULT" | jq -r '.OriginAccessControl.Id')
  echo "  ✓ OAC created: $OAC_ID"
else
  echo "  ✓ OAC already exists: $OAC_ID"
fi

# Step 5: Create CloudFront distribution
echo "☁️  Step 5/6: Creating CloudFront distribution..."

# Check if distribution already exists
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?DomainName=='$BUCKET_NAME.s3.$REGION.amazonaws.com']].Id" \
  --output text 2>/dev/null || echo "")

if [ -z "$DIST_ID" ]; then
  # Create distribution config
  DIST_CONFIG=$(cat <<EOF
{
  "CallerReference": "peerprep-frontend-$(date +%s)",
  "Comment": "PeerPrep Frontend Distribution",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-$BUCKET_NAME",
        "DomainName": "$BUCKET_NAME.s3.$REGION.amazonaws.com",
        "OriginAccessControlId": "$OAC_ID",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-$BUCKET_NAME",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_All",
  "ViewerCertificate": {
    "CloudFrontDefaultCertificate": true,
    "MinimumProtocolVersion": "TLSv1.2_2021"
  }
}
EOF
)
  
  DIST_RESULT=$(aws cloudfront create-distribution \
    --distribution-config "$DIST_CONFIG")
  DIST_ID=$(echo "$DIST_RESULT" | jq -r '.Distribution.Id')
  DIST_DOMAIN=$(echo "$DIST_RESULT" | jq -r '.Distribution.DomainName')
  
  echo "  ✓ Distribution created: $DIST_ID"
  echo "  ✓ Domain: $DIST_DOMAIN"
else
  DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" \
    --query 'Distribution.DomainName' --output text)
  echo "  ✓ Distribution already exists: $DIST_ID"
  echo "  ✓ Domain: $DIST_DOMAIN"
fi

# Step 6: Update S3 bucket policy to allow CloudFront OAC
echo "🔐 Step 6/6: Updating S3 bucket policy..."
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DIST_ID"
        }
      }
    }
  ]
}
EOF
)

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "$BUCKET_POLICY"
echo "  ✓ Bucket policy updated"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Add GitHub Secret:"
echo "   Go to: Settings → Secrets and variables → Actions"
echo "   Add: CLOUDFRONT_DISTRIBUTION_ID = $DIST_ID"
echo ""
echo "2. Test deployment manually:"
echo "   cd web-server"
echo "   npm run build"
echo "   aws s3 sync dist/ s3://$BUCKET_NAME --delete"
echo "   aws cloudfront create-invalidation --distribution-id $DIST_ID --paths \"/*\""
echo ""
echo "3. Access your frontend:"
echo "   https://$DIST_DOMAIN"
echo ""
echo "4. Update backend CORS to allow CloudFront:"
echo "   Add to CORS origins: https://$DIST_DOMAIN"
echo ""
echo "5. (Optional) Set up custom domain:"
echo "   - Request ACM certificate in us-east-1"
echo "   - Add alternate domain name to CloudFront"
echo "   - Create Route53 A record → CloudFront"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
