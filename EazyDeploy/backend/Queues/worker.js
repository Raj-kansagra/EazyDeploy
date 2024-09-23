import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { ECSClient, RunTaskCommand, DescribeTasksCommand } from "@aws-sdk/client-ecs";
import { CloudWatchLogsClient, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { Route53Client, ChangeResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { APIGatewayClient, GetRestApisCommand, CreateDomainNameCommand, CreateBasePathMappingCommand, GetDomainNamesCommand } from "@aws-sdk/client-api-gateway";
import dotenv from "dotenv";
import Userdemo from "../models/Userdemo.js"; // Adjust the path based on your project structure
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = () => {
    mongoose.set("strictQuery", true);
    mongoose
      .connect(process.env.MONGODB_URL)
      .then(() => console.log("Connected to Mongo DB"))
      .catch((err) => {
        console.error("failed to connect with mongo");
        console.error(err);
      });
  };
connectDB();

// Initialize Redis connection
const redisConnection = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,  // Add this line to comply with BullMQ's requirement
});

// Initialize AWS SDK clients
const ecs = new ECSClient({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const cloudWatchLogs = new CloudWatchLogsClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});
const route53 = new Route53Client({ 
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const apiGateway = new APIGatewayClient({ 
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const hostedZoneId = process.env.HOSTED_ZONE_ID;  // Replace with your actual Route53 hosted zone ID
const certificateArn = process.env.CERTIFICATE_ARN; 

// Unified Worker to process jobs in the queue
new Worker('deployingQueue', async (job) => {
    const project  = job.data;
    const id = project._id;
    const deploymentType = project.project_type;
    try {
        if (deploymentType === 'react') {
            console.log("running react script....")
            await Userdemo.updateOne(
                { 'projects._id': id },
                {
                    $set: {
                        'projects.$.isdeploying': true,
                    },
                }
            );
            const reactParams = {
                cluster: 'my_first_cluster',
                taskDefinition: 'vercel-frontend',
                launchType: 'FARGATE',
                overrides: {
                    containerOverrides: [
                        {
                            name: 'vercel-frontend-image',
                            environment: [
                                { name: 'GITHUB_URL', value: project.github_link },
                                { name: 'PROJECT_ID', value: project.project_id },
                                { name: 'PATH_TO_CLONE', value: project.project_path },
                                ...project.env.map(envVar => ({
                                    name: envVar.key,
                                    value: envVar.value,
                                })),
                            ],
                        },
                    ],
                },
                networkConfiguration: {
                    awsvpcConfiguration: {
                        subnets: [
                            'subnet-05375f99ed8ffe2bc',
                            'subnet-03fe9b657c87f8c86',
                            'subnet-00329f18df08a99c3',
                        ],
                        assignPublicIp: 'ENABLED',
                    },
                },
            };

            const command = new RunTaskCommand(reactParams);
            const data = await ecs.send(command);
            const taskArn = data.tasks[0].taskArn;

            let taskCompleted = false;
            while (!taskCompleted) {
                const taskData = await ecs.send(new DescribeTasksCommand({
                    cluster: 'my_first_cluster',
                    tasks: [taskArn],
                }));

                const status = taskData.tasks[0].lastStatus;
                if (status === 'STOPPED') {
                    taskCompleted = true;
                    const s3BucketName = 'vercel-react-bucket';
                    const s3FolderPath = project.project_id;
                    const fileName = 'index.html';
                    const fileKey = `${s3FolderPath}/${fileName}`;
                    const s3Url = `https://${s3BucketName}.s3.ap-south-1.amazonaws.com/${fileKey}`;

                    const logGroupName = '/ecs/vercel-frontend';
                    const logStreamName = `ecs/vercel-frontend-image/${taskArn.split('/').pop()}`;
                    const logEventsParams = {
                        logGroupName,
                        logStreamName,
                        limit: 100,
                    };
                    const logData = await cloudWatchLogs.send(new GetLogEventsCommand(logEventsParams));

                    const logs = logData.events.map((event) => ({
                        timestamp: new Date(event.timestamp)
                            .toLocaleString("en-US", {
                                timeZone: "Asia/Kolkata",
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                            })
                            .replace(",", ""),
                        message: event.message,
                    }));

                    await Userdemo.updateOne(
                        { 'projects._id': id },
                        {
                            $set: {
                                'projects.$.project_awslink': s3Url,
                                'projects.$.isdeploying': false,
                                'projects.$.logs': logs
                            },
                        }
                    );
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2500));
                }
            }
            console.log("deployed");
        } else if (deploymentType === 'express') {
            // Express Deployment Logic
            console.log("running express script....")
            const expressParams = {
                cluster: "my_first_cluster",
                taskDefinition: "vercel-backend",
                launchType: "FARGATE",
                overrides: {
                    containerOverrides: [
                        {
                            name: "vercel-backend-image",
                            environment: [
                                { name: "GITHUB_URL", value: project.github_link },
                                { name: "PROJECT_ID", value: project.project_id },
                                { name: "PATH_TO_CLONE", value: project.project_path },
                                ...project.env.map((envVar) => ({
                                    name: envVar.key,
                                    value: `"${envVar.value}"`,
                                })),
                            ],
                        },
                    ],
                },
                networkConfiguration: {
                    awsvpcConfiguration: {
                        subnets: [
                            "subnet-05375f99ed8ffe2bc",
                            "subnet-03fe9b657c87f8c86",
                            "subnet-00329f18df08a99c3",
                        ],
                        assignPublicIp: "ENABLED",
                    },
                },
            };
            const runTaskCommand = new RunTaskCommand(expressParams);
            const runTaskData = await ecs.send(runTaskCommand);
            const taskArn = runTaskData.tasks[0].taskArn;

            let taskCompleted = false;
            while (!taskCompleted) {
                const describeTasksCommand = new DescribeTasksCommand({
                    cluster: "my_first_cluster",
                    tasks: [taskArn],
                });
                const describeTasksData = await ecs.send(describeTasksCommand);
                const status = describeTasksData.tasks[0].lastStatus;
                if (status === "STOPPED") {
                    taskCompleted = true;
                    const getRestApisCommand = new GetRestApisCommand({});
                    const apis = await apiGateway.send(getRestApisCommand);
                    const api = apis.items.find(api => api.name === `dev-${project.project_id}`);

                    let apiUrl, customApiUrl;

                    if (!api) {
                        console.log("Error: API Gateway not found for the Lambda function.");
                    } else {
                        apiUrl = `https://${api.id}.execute-api.ap-south-1.amazonaws.com/dev/`;
                        const customDomainName = `${project.project_id}.eazydeploy.online`;
                        const getDomainNamesCommand = new GetDomainNamesCommand({});
                        const existingDomains = await apiGateway.send(getDomainNamesCommand);
                        const domainExists = existingDomains.items.find(domain => domain.domainName === customDomainName);
                        customApiUrl = `https://${customDomainName}`;

                        if (!domainExists) {
                            const createDomainNameParams = {
                                domainName: customDomainName,
                                regionalCertificateArn: certificateArn,
                                endpointConfiguration: {
                                    types: ['REGIONAL'],
                                },
                            };

                            const createDomainNameCommand = new CreateDomainNameCommand(createDomainNameParams);
                            const domainNameData = await apiGateway.send(createDomainNameCommand);

                            const createBasePathMappingParams = {
                                domainName: customDomainName,
                                restApiId: api.id,
                                stage: 'dev',
                            };

                            await apiGateway.send(new CreateBasePathMappingCommand(createBasePathMappingParams));

                            const createRecordParams = {
                                HostedZoneId: hostedZoneId,
                                ChangeBatch: {
                                    Changes: [
                                        {
                                            Action: 'CREATE',
                                            ResourceRecordSet: {
                                                Name: customDomainName,
                                                Type: 'A',
                                                AliasTarget: {
                                                    DNSName: domainNameData.regionalDomainName,
                                                    HostedZoneId: domainNameData.regionalHostedZoneId,
                                                    EvaluateTargetHealth: false,
                                                },
                                            },
                                        },
                                    ],
                                },
                            };

                            await route53.send(new ChangeResourceRecordSetsCommand(createRecordParams));
                        }
                    }

                    const logGroupName = '/ecs/vercel-backend'; // The CloudWatch log group name
                    const logStreamName = `ecs/vercel-backend-image/${taskArn.split('/').pop()}`; // Log stream name

                    const logEventsParams = {
                    logGroupName,
                    logStreamName,
                    limit: 100,
                    };

                    const logData = await cloudWatchLogs.send(new GetLogEventsCommand(logEventsParams));

                    const logs = logData.events.map((event) => ({
                    timestamp: new Date(event.timestamp)
                        .toLocaleString("en-US", {
                        timeZone: "Asia/Kolkata", // IST time zone
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        })
                        .replace(",", ""),
                    message: event.message,
                    }));

                    await Userdemo.updateOne(
                        { "projects._id": id },
                        {
                          $set: {
                            "projects.$.project_awslink": apiUrl,
                            "projects.$.project_customlink": customApiUrl,
                            "projects.$.isdeploying": false,
                            "projects.$.logs": logs
                          },
                        }
                    );
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 2500));
                }
            }
            console.log("deployed")
        }
    } catch (error) {
        console.error('Deployment failed:', error.message);
        await Userdemo.updateOne(
            { 'projects._id': id },
            {
                $set: {
                    'projects.$.isdeploying': false
                }
            }
        );
    }
}, {
    connection: redisConnection,
    concurrency: 2
});
