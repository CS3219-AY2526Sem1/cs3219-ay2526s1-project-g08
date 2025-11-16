# Deployment & Operations Scripts

This directory contains scripts for deploying and managing the PeerPrep application.

## Deployment Scripts

- **`deploy-all-services.sh`** - Deploys all backend services (user, question, collaboration, matching) to AWS ECS
- **`deploy-frontend.sh`** - Deploys the web frontend to S3 and CloudFront
- **`rollback.sh`** - Rolls back services to previous deployment

## Infrastructure Setup

- **`setup-cloudfront.sh`** - Sets up CloudFront distribution
- **`setup-observability.sh`** - Configures monitoring and logging

## Scaling Scripts

- **`scale-up.sh`** - Increases service task counts for higher load
- **`scale-down.sh`** - Decreases service task counts to save costs

## Usage

All scripts should be run from the project root directory:

```bash
# From project root
bash scripts/deploy-all-services.sh
bash scripts/deploy-frontend.sh
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Docker installed (for building images)
- jq installed (for JSON processing)
