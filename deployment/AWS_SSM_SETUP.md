# AWS SSM Parameter Store Integration

This document explains how to use AWS Systems Manager (SSM) Parameter Store to manage environment variables for CARC deployments.

## Overview

Instead of manually entering environment variables, you can store them in AWS SSM Parameter Store and have the deployment script automatically fetch and configure them. This is useful for:

- **Secure storage** of API keys and credentials
- **Automated deployments** without manual input
- **Multi-environment management** (prod and sandbox)
- **Centralized configuration** across instances

## Setup

### 1. Create SSM Parameters

In AWS Systems Manager → Parameter Store, create parameters with the path `/carc/prod/*`:

```
Parameter Name                    Type          Value
───────────────────────────────────────────────────────────────
/carc/prod/PAYPAL_CLIENT_ID       SecureString  abcd1234...
/carc/prod/PAYPAL_CLIENT_SECRET   SecureString  efgh5678...
/carc/prod/ADMIN_DIAGNOSTIC_USERNAME  SecureString  admin_user
/carc/prod/ADMIN_DIAGNOSTIC_PASSWORD  SecureString  secure_pass
/carc/prod/NEXT_PUBLIC_API_BASE   String        https://example.com
/carc/prod/NEXT_PUBLIC_PAYPAL_ENVIRONMENT  String  production
```

**Important:**
- Use **SecureString** type for sensitive values (encrypted at rest)
- Use **String** type for non-sensitive values (e.g., NEXT_PUBLIC_* vars)
- Use the exact parameter names as your environment variables
- For sandbox, use `/carc/sandbox/*` instead

### 2. Create IAM User (for Lightsail instance)

Since Lightsail instances don't have IAM roles, create an IAM user:

1. AWS Console → IAM → Users → Create User
2. Attach inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParametersByPath",
        "ssm:GetParameter"
      ],
      "Resource": "arn:aws:ssm:us-west-2:ACCOUNT_ID:parameter/carc/prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:us-west-2:ACCOUNT_ID:key/KEY_ID"
    }
  ]
}
```

3. Create access keys (save securely)
4. On Lightsail instance: `aws configure` with these keys

### 3. Install AWS CLI

On your Lightsail instance:

```bash
sudo apt-get update
sudo apt-get install -y awscli
aws configure  # Enter the IAM user credentials
aws ssm get-parameters-by-path --path /carc/prod --recursive --region us-west-2 # Test
```

## Usage

### Fresh Deployment with SSM

When running `lightsail-setup.sh`, use the `USE_SSM=1` flag:

```bash
ssh ubuntu@<static-ip>
git clone https://github.com/bassoman/NextJS-26.git
cd NextJS-26

# Run setup with SSM
USE_SSM=1 DOMAIN=example.com EMAIL=admin@example.com bash deployment/scripts/lightsail-setup.sh
```

The setup script will:
1. Call `fetch-ssm-params.sh`
2. Fetch all parameters from `/carc/prod/*`
3. Write to `/var/www/carc-app/.env`
4. Set proper ownership: `www-data:webadmins` (mode 640)
5. Build the app
6. Start the service

### Manual SSM Fetch

If you need to update environment variables later:

```bash
sudo bash /var/www/carc-app/deployment/scripts/fetch-ssm-params.sh
```

This fetches parameters and overwrites `/var/www/carc-app/.env`.

### Sandbox Environment

To fetch parameters for the sandbox environment:

```bash
sudo CARC_ENVIRONMENT=sandbox bash /var/www/carc-app/deployment/scripts/fetch-ssm-params.sh
```

This:
- Fetches from `/carc/sandbox/*` (instead of `/carc/prod/*`)
- Writes to `/var/www/carc-app/.env` (or override with `APP_DIR`)
- Sets PORT=3001 (instead of 3000)
- Sets SQLITE_DATABASE_PATH to `/var/carc/sandbox/data/carc.db`

## Script: fetch-ssm-params.sh

The updated script handles the new multi-admin architecture:

### Features

- **Direct file writing**: Writes directly to target `.env` file (no piping needed)
- **Proper permissions**: Sets mode 640, owned by `www-data:webadmins`
- **Clear logging**: Shows what's happening at each step
- **Error handling**: Validates parameters and fails safely
- **Flexible paths**: Supports custom `APP_DIR` via environment variable

### Usage

```bash
# Default: fetch /carc/prod/* → /var/www/carc-app/.env
sudo bash fetch-ssm-params.sh

# Fetch /carc/sandbox/* → /var/www/carc-app/.env
sudo CARC_ENVIRONMENT=sandbox bash fetch-ssm-params.sh

# Custom app directory
sudo APP_DIR=/custom/path bash fetch-ssm-params.sh

# Custom SSM path
sudo CARC_SSM_PATH=/my/custom/path bash fetch-ssm-params.sh

# Custom AWS region
sudo AWS_REGION=us-east-1 bash fetch-ssm-params.sh
```

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CARC_ENVIRONMENT` | `prod` | Environment: `prod` or `sandbox` |
| `APP_DIR` | `/var/www/carc-app` | Application directory (new architecture) |
| `CARC_SSM_PATH` | `/carc/{CARC_ENVIRONMENT}` | SSM parameter path |
| `CARC_TARGET_ENV_FILE` | `${APP_DIR}/.env` | Target .env file location |
| `SERVICE_USER` | `www-data` | Service account for ownership |
| `SERVICE_GROUP` | `webadmins` | Admin group for ownership |
| `AWS_REGION` | `us-west-2` | AWS region |

### Output

```
[2026-11-13T12:00:00Z] Fetching SSM parameters from path: /carc/prod
[2026-11-13T12:00:00Z] Environment: prod
[2026-11-13T12:00:00Z] Target file: /var/www/carc-app/.env
[2026-11-13T12:00:00Z] AWS Region: us-west-2
[2026-11-13T12:00:01Z] File ownership: www-data:webadmins
[2026-11-13T12:00:01Z] Successfully wrote 8 environment variables to /var/www/carc-app/.env
[2026-11-13T12:00:01Z] Permissions: mode 640, owner www-data:webadmins
```

## Troubleshooting

### "No parameters were fetched from SSM"

**Cause**: IAM credentials don't have access to the parameters

**Fix**:
1. Verify IAM user policy allows `ssm:GetParametersByPath`
2. Check parameter path exists: `aws ssm get-parameters-by-path --path /carc/prod --recursive`
3. Verify AWS region matches where parameters are stored
4. Check KMS key permissions for SecureString parameters

### "AWS CLI is not installed"

**Fix**:
```bash
sudo apt-get install -y awscli
aws configure  # Enter IAM credentials
```

### "Permission denied" when reading .env

**Cause**: File ownership is incorrect (www-data can't read)

**Fix**:
```bash
sudo chown www-data:webadmins /var/www/carc-app/.env
sudo chmod 640 /var/www/carc-app/.env
```

### "Invalid environment variable name"

**Cause**: Parameter name in SSM doesn't match valid env var format

**Fix**: Parameter names must:
- Start with letter or underscore
- Contain only letters, numbers, underscores
- Be uppercase by convention

Example: `/carc/prod/MY_API_KEY` ✅ vs `/carc/prod/my-api-key` ❌

## Security Best Practices

### 1. Use SecureString for Secrets

```bash
aws ssm put-parameter \
  --name /carc/prod/PAYPAL_CLIENT_SECRET \
  --type SecureString \
  --value 'your-secret-value'
```

### 2. Restrict IAM Policy

Only allow access to specific parameters and KMS keys:

```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParametersByPath", "ssm:GetParameter"],
  "Resource": "arn:aws:ssm:us-west-2:123456789012:parameter/carc/prod/*",
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": "us-west-2"
    }
  }
}
```

### 3. Rotate Credentials Regularly

- Rotate IAM access keys (delete old ones after 90 days)
- Update SSM parameters when credentials change
- Re-run `fetch-ssm-params.sh` and restart the service

### 4. Audit Access

```bash
# Check who accessed SSM parameters
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GetParametersByPath
```

### 5. Don't Commit Credentials

The `.env` file is automatically .gitignored. Never commit:
- API keys
- Database passwords
- JWT secrets
- Admin credentials

## Comparison: Manual vs SSM

| Aspect | Manual .env | AWS SSM |
|--------|-----------|---------|
| **Setup Time** | Fast (~1 min) | Medium (~10 min) |
| **Security** | Good (local file) | Excellent (encrypted at rest) |
| **Secrets Exposure** | Low (file-based) | Very Low (encrypted + audit) |
| **Updates** | Manual re-edit | Automated fetch |
| **Audit Trail** | Limited (file logs) | Excellent (CloudTrail) |
| **Multi-Env** | Manual duplication | Centralized (/carc/prod, /carc/sandbox) |
| **Cost** | Free | ~$0.01-0.05 per parameter/month |

## Migration from Manual to SSM

To migrate from a manually-edited `.env` to SSM:

### 1. Create parameters in SSM

```bash
# From current .env, create parameters
grep "^[A-Z_]" /var/www/carc-app/.env | while IFS='=' read key val; do
  aws ssm put-parameter \
    --name "/carc/prod/$key" \
    --type SecureString \
    --value "$val"
done
```

### 2. Test fetching

```bash
sudo bash /var/www/carc-app/deployment/scripts/fetch-ssm-params.sh
cat /var/www/carc-app/.env  # Verify it matches
```

### 3. Restart the service

```bash
sudo systemctl restart carc-app@prod
curl http://127.0.0.1:3000/  # Test
```

## References

- AWS SSM Documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- AWS CLI SSM Commands: https://docs.aws.amazon.com/cli/latest/reference/ssm/
- IAM Policy Examples: https://docs.aws.amazon.com/systems-manager/latest/userguide/security_iam_service-with-iam.html
