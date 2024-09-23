# Use the official Node.js image
# Use the official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Install necessary tools
RUN apt-get update && apt-get install -y git jq

# Install the Serverless Framework globally
RUN npm install -g serverless

#----------------------------------------------------------------------
# uncomment and put your credentials

# ENV AWS_ACCESS_KEY_ID=
# ENV AWS_SECRET_ACCESS_KEY=
# ENV SERVERLESS_ACCESS_KEY=

#----------------------------------------------------------------------

# Copy the script to the container
COPY script_import.js .
COPY script_require.js .
COPY serverless.yml .
COPY .env .env
# Create the entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Default command to run the entrypoint script
CMD ["/app/entrypoint.sh"]

