#!/bin/bash

APPLICATION_NAME="$PROJECT_ID"
export APPLICATION_NAME

# Clone the GitHub repository if the GITHUB_URL environment variable is provided
if [ -n "$GITHUB_URL" ]; then
  echo "Cloning repository from $GITHUB_URL..."

  if [ -n "$PATH_TO_CLONE" ] && [ "$PATH_TO_CLONE" != "/" ]; then
    echo "Cloning the specified folder: $PATH_TO_CLONE"
    
    # Clone the repo with sparse checkout and only the specific folder
    git clone --depth 1 --filter=blob:none --sparse "$GITHUB_URL" repo
    cd repo
    git sparse-checkout init --cone
    git sparse-checkout set "$PATH_TO_CLONE"

    if [ ! -d "$PATH_TO_CLONE" ]; then
      echo "Error: The specified path $PATH_TO_CLONE does not exist in the repository."
      exit 1
    fi

    cd "$PATH_TO_CLONE"
  else
    echo "Cloning the entire repository..."
    git clone "$GITHUB_URL" repo
    cd repo
  fi

  # Install project dependencies
  echo "Installing project dependencies..."
  npm install
  npm install serverless-http

  # Copy serverless.yml and scripts from /app to the current folder
  echo "Copying files..."
  cp /app/serverless.yml ./ 
  cp /app/script_import.js ./ 
  cp /app/script_require.js ./ 

  # Update .env file with current environment variables
  echo "Updating .env file..."
  printenv | grep -v '^_=' | while IFS='=' read -r key value; do
    if [[ -n "$key" && -n "$value" ]]; then
      echo "$key=$value"
    fi
  done > .env

  # Determine module type from package.json and run the appropriate script
  if [ -f package.json ]; then
    MODULE_TYPE=$(jq -r '.type // "commonjs"' package.json)

    if [ "$MODULE_TYPE" == "module" ]; then
      node script_import.js
    else
      node script_require.js
    fi
  else
    echo "package.json not found. Exiting."
    exit 1
  fi

  echo "Deploying the project..."
  serverless deploy 

else
  echo "GITHUB_URL is not set. Exiting."
  exit 1
fi
