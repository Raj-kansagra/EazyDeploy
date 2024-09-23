#!/bin/bash

# Ensure the GITHUB_URL is provided
if [ -z "$GITHUB_URL" ]; then
  echo "Error: GITHUB_URL is not set"
  exit 1
fi

# Set the output folder
OUTPUT_DIR="/home/app/output"
mkdir -p "$OUTPUT_DIR"
TEMP_DIR="/home/app/temp"
mkdir -p "$TEMP_DIR"

# Navigate to the temp directory
cd "$TEMP_DIR"
git init
git remote add origin "$GITHUB_URL"

git sparse-checkout init --cone

# Check if the PATH_TO_CLONE environment variable is provided
if [ -n "$PATH_TO_CLONE" ]; then
  # If PATH_TO_CLONE is set, set sparse-checkout to include only that folder
  echo "Cloning folder: $PATH_TO_CLONE"
  git sparse-checkout set "$PATH_TO_CLONE"
else
  # If PATH_TO_CLONE is not set or is empty, clone the root directory
  echo "PATH_TO_CLONE is not set or empty. Cloning the root directory."
  git sparse-checkout disable
fi

# Pull the content from the repository
git pull origin main

# Create .env file with environment variables
echo "Creating .env file..."
{
  # Output all environment variables in the format KEY=VALUE
  printenv | while IFS='=' read -r key value; do
    if [[ -n "$key" && -n "$value" ]]; then
      echo "$key=$value"
    fi
  done
} > /home/app/output/.env


# Ensure the folder exists and then move the contents
if [ -d "$TEMP_DIR/$PATH_TO_CLONE" ] || [ -z "$PATH_TO_CLONE" ]; then
  # Move contents from the specified folder or root if PATH_TO_CLONE is empty
  mv -v "$TEMP_DIR/$PATH_TO_CLONE/"* "$OUTPUT_DIR"
else
  echo "Error: Cloned folder $TEMP_DIR/$PATH_TO_CLONE does not exist in the repository."
  exit 1
fi

# Clean up the temporary directory
rm -rf "$TEMP_DIR"

cd ..
node script.js
