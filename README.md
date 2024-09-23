# EazyDeploy - Deployment Platform for Web Apps

[**Live Demo**](https://www.eazydeploy.online)

Build, deploy, and scale your Express and React apps with unmatched ease from your very first user to your billionth.

## Tech Stack Used

- **Node.js**: Backend framework for handling API requests and business logic.
- **React.js**: Frontend framework for building responsive user interfaces.
- **Docker**: Containerization for running isolated and scalable application environments.
- **Redis**: In-memory database used for caching and message queue management.
- **MongoDB**: NoSQL database for managing user and application data.
- **AWS Lambda & ECS**: For running backend services and deploying Docker containers.
- **AWS S3 & Route 53**: Hosting static assets and managing custom subdomains.
- **BullMQ**: Message queue system for handling background tasks and scaling job processing.

## Features

1. **Automated Deployment**: Simplify the deployment of both React frontends and Express backends. With just a few steps, users can build, deploy, and manage applications across AWS services.

2. **Scalability & Performance**: EazyDeploy utilizes Docker and AWS ECS to ensure horizontal scaling for growing user traffic. Backend APIs run seamlessly on AWS Lambda, offering a serverless, cost-effective solution.

3. **Efficient Task Processing**: Powered by BullMQ and Redis, EazyDeploy processes background jobs and queues with high performance and reliability. This ensures that tasks like email notifications, data processing, or scheduled jobs are handled efficiently.

4. **Custom Subdomains**: Offer personalized subdomains using AWS Route 53, allowing users to deploy applications with their own unique URLs. This feature provides flexibility and professionalism for projects.

## Setup Instructions

### 1. Redis Docker Setup (Prerequisite)

Before setting up the application, ensure that Redis is up and running. You can run Redis using Docker by following these steps:

1. Pull the Redis Docker image:

    ```bash
    docker pull redis
    ```

2. Run the Redis container:

    ```bash
    docker run --name redis-container -p 6379:6379 -d redis
    ```

3. Verify that Redis is running:

    ```bash
    docker ps
    ```

The Redis server will now be running on port `6379`.

### 2. Frontend Docker Configuration

1. Inside `frontend-docker-config` folder, complete `.env` file with the given environment variables.
2. Build the Docker image inside `frontend-docker-config`:

    ```bash
    docker build -t frontend-image .
    ```

3. Deploy the image to AWS ECR (Elastic Container Registry):

### 3. Backend Docker Configuration

1. Inside `backend-docker-config` folder, complete `.env` file with the given environment variables.
2. Build the Docker image inside `backend-docker-config`:

    ```bash
    docker build -t backend-image .
    ```

3. Deploy the image to AWS ECR (Elastic Container Registry):

### 4. EazyDeploy App Setup

To set up the application using the configurations in `EazyDeploy`:

1. Navigate to the `EazyDeploy/backend` folder and create a `.env` file with the following environment variables:

    ```env
    MONGODB_URL=your_mongodb_url
    JWT_SECRET=your_jwt_secret
    EMAIL_USER=your_email_user
    EMAIL_PASS=your_email_pass
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    HOSTED_ZONE_ID=your_hosted_zone_id
    CERTIFICATE_ARN=your_certificate_arn
    ```

2. Navigate to the `EazyDeploy/backend/Queues` folder and start the worker:

    ```bash
    node worker.js
    ```

3. Start the backend application:

    ```bash
    cd EazyDeploy/backend
    npm install
    npm start
    ```

4. Start the frontend application:

    ```bash
    cd EazyDeploy/frontend
    npm install
    npm start
    ```

The backend Express server will run on port `5000`, and the frontend React application will run on port `3000`.

### Notes

- Ensure that you replace placeholder values in the `.env` files with your actual credentials and configuration settings.
- For deploying Docker images to AWS ECR, you need AWS CLI configured on your local machine or CI/CD environment.
- The `AWS_ACCOUNT_ID` and `AWS_REGION` variables should be replaced with your AWS account ID and region, respectively.
- Make sure Docker and AWS CLI are installed on your local machine before proceeding with the build and deploy commands.

Feel free to reach out if you have any questions or need further assistance.
