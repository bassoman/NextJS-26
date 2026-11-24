#!/usr/bin/env bash
set -euo pipefail

###############################################
# PROJECT REGISTRY
###############################################

declare -A PROJECT_ENABLED
declare -A PROJECT_DESC

# Enable projects
PROJECT_ENABLED["carc"]=true
PROJECT_DESC["carc"]="CARC Website"

###############################################
# ENVIRONMENTS FOR EACH PROJECT
###############################################

declare -A PROJECT_ENVS
PROJECT_ENVS["carc"]="sandbox prod"

###############################################
# BASE PATHS PER PROJECT + ENVIRONMENT
###############################################

declare -A PROJECT_ENV_PATH
PROJECT_ENV_PATH["carc:sandbox"]="/carc/sandbox"
PROJECT_ENV_PATH["carc:prod"]="/carc/prod"

###############################################
# PARAMETERS PER PROJECT + ENVIRONMENT
###############################################

declare -A PROJECT_ENV_PARAMS

PROJECT_ENV_PARAMS["carc:sandbox"]="PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET PAYPAL_BASE_URL NEXT_PUBLIC_PAYPAL_CLIENT_ID NEXT_PUBLIC_PAYPAL_ENVIRONMENT SUCCESS_URL CANCEL_URL ADMIN_DIAGNOSTIC_USER ADMIN_DIAGNOSTIC_PASS CARC_DATABASE_MODE SQLITE_DATABASE_PATH PORT"

PROJECT_ENV_PARAMS["carc:prod"]="PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET PAYPAL_BASE_URL NEXT_PUBLIC_PAYPAL_CLIENT_ID NEXT_PUBLIC_PAYPAL_ENVIRONMENT SUCCESS_URL CANCEL_URL ADMIN_DIAGNOSTIC_USER ADMIN_DIAGNOSTIC_PASS CARC_DATABASE_MODE SQLITE_DATABASE_PATH PORT"

###############################################
# HELPERS
###############################################

die() {
  echo "ERROR: $*" >&2
  exit 1
}

###############################################
# AWS CREDENTIAL CHECK
###############################################

check_aws_creds() {
  echo "Checking AWS credentials..."
  if ! aws sts get-caller-identity >/dev/null 2>&1; then
    die "AWS credentials invalid or missing"
  fi
  echo "AWS credentials OK"
}

###############################################
# WRITE PARAMETER TO SSM
###############################################

write_param() {
  local path="$1"
  local key="$2"
  local value="$3"

  aws ssm put-parameter \
    --name "${path}/${key}" \
    --type "String" \
    --value "$value" \
    --overwrite \
    >/dev/null
}

###############################################
# LIST PROJECTS
###############################################

list_projects() {
  echo "Available projects:"
  echo "-------------------"

  for project in "${!PROJECT_DESC[@]}"; do
    local enabled="${PROJECT_ENABLED[$project]}"
    local desc="${PROJECT_DESC[$project]}"

    if [[ "$enabled" == true ]]; then
      echo "- $project : $desc"
    else
      echo "- $project : $desc (disabled)"
    fi
  done

  echo
}

###############################################
# MAIN EXECUTION LOGIC
###############################################

run_project() {
  local project="$1"
  local env="$2"
  local dry_run="$3"
  local target_keys_csv="$4"

  # Validate project
  [[ -n "${PROJECT_ENABLED[$project]:-}" ]] || die "Unknown project: $project"
  [[ "${PROJECT_ENABLED[$project]}" == true ]] || die "Project '$project' is disabled"

  # Validate environment
  local envs="${PROJECT_ENVS[$project]}"
  [[ " $envs " == *" $env "* ]] || die "Environment '$env' not valid for project '$project'"

  # Load path + configured params
  local path="${PROJECT_ENV_PATH[$project:$env]}"
  local all_params="${PROJECT_ENV_PARAMS[$project:$env]}"

  # Determine which parameters to iterate over
  local params_to_run=""
  if [[ -n "$target_keys_csv" ]]; then
    # Convert comma-separated string to space-delimited list
    local requested_keys="${target_keys_csv//,/ }"
    
    # Validate each requested key against configured project params
    for req_key in $requested_keys; do
      if [[ " $all_params " != *" $req_key "* ]]; then
        die "Parameter '$req_key' is not configured for $project:$env"
      fi
    done
    params_to_run="$requested_keys"
  else
    params_to_run="$all_params"
  fi

  echo "======================================"
  echo "Project:      $project"
  echo "Environment:  $env"
  echo "Path:         $path"
  echo "Parameters:   $params_to_run"
  echo "======================================"
  echo

  for key in $params_to_run; do
    echo -n "Enter value for $key: "
    read -r value

    if [[ "$dry_run" == true ]]; then
      echo "[DRY RUN] Would write ${path}/${key}"
    else
      write_param "$path" "$key" "$value"
      echo "Wrote ${path}/${key}"
    fi
  done
}

###############################################
# ARGUMENT PARSING
###############################################

PROJECT=""
ENV=""
DRY_RUN=false
LIST_PROJECTS=false
TARGET_KEYS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --env)
      ENV="$2"
      shift 2
      ;;
    --keys|--params)
      TARGET_KEYS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --list-projects)
      LIST_PROJECTS=true
      shift
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

if [[ "$LIST_PROJECTS" == true ]]; then
  list_projects
  exit 0
fi

[[ -n "$PROJECT" ]] || die "You must specify --project <name>"
[[ -n "$ENV" ]] || die "You must specify --env <environment>"

###############################################
# EXECUTION
###############################################

check_aws_creds
run_project "$PROJECT" "$ENV" "$DRY_RUN" "$TARGET_KEYS"

