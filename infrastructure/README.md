# Infrastructure Configuration

This directory contains AWS infrastructure configuration files for CloudFront, S3, and related services.

## CloudFront Configurations

- **`cloudfront-config.json`** - Main CloudFront distribution configuration
- **`cloudfront-current-config.json`** - Current active configuration snapshot
- **`cloudfront-fixed-config.json`** - Fixed/corrected configuration
- **`cloudfront-nobom.json`** - Configuration without BOM characters
- **`cloudfront-updated-config.json`** - Latest updated configuration
- **`cache-policy-with-cookies.json`** - Cache policy that includes cookie handling
- **`response-headers-policy.json`** - Security and CORS headers policy

## S3 Policies

- **`bucket-policy.json`** - S3 bucket policy for frontend hosting

## Notes

These configuration files are used by the deployment scripts in `../scripts/` directory. They define:
- Cache behaviors and policies
- CORS settings for cross-origin requests
- Security headers
- Origin configurations for backend services
