import express from "express";
import Userdemo from "../models/Userdemo.js";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import { Route53Client, ChangeResourceRecordSetsCommand,ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { APIGatewayClient, GetRestApisCommand, DeleteRestApiCommand,DeleteDomainNameCommand} from "@aws-sdk/client-api-gateway";
import { LambdaClient, GetFunctionCommand, DeleteFunctionCommand } from "@aws-sdk/client-lambda";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { deployQueue } from '../Queues/queue.js';
dotenv.config();

const router = express.Router();
router.use(bodyParser.json());

const hostedZoneId = 'Z01531901QARMVOM6LM5A';
// AWS SDK v3 Clients using environment credentials
const apiGateway = new APIGatewayClient({ 
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const lambda = new LambdaClient({ 
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const s3 = new S3Client({ 
  region: "ap-south-1",
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


const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Failed to authenticate" });
    req.userid = decoded.id;
    next();
  });
};

router.post(
  "/projects/deploy-express/:id",
  authMiddleware,
  async (req, res) => {
    const { id } = req.params;

    const user = await Userdemo.findById(req.userid);
    if (user.dailylimit <= 0)
      return res.status(401).json({ message: "Dailylimit exceeded" });

    const userProject = await Userdemo.findOne({ "projects._id": id });
    const project = userProject.projects.find((p) => p._id == id);

    if (!project || !project.github_link || !project.project_id) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    if (project.isdeploying) {
      return res.status(200).json({ message: "Project is already deploying" });
    }

    await Userdemo.updateOne(
      { "projects._id": id },
      { $set: { "projects.$.isdeploying": true } }
    );

    user.dailylimit -= 1;
    await user.save();
    
    await deployQueue.add("deploy-express-project", project  , { attempts: 1 });
    
    res.status(200).json({ message: "Deploying the express project" });
  }
);


router.post("/projects/deploy-react/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  const user = await Userdemo.findById(req.userid);
  if (user.dailylimit <= 0)
    return res.status(401).json({ message: "Dailylimit exceeded" });

  const userProject = await Userdemo.findOne({ "projects._id": id });
  const project = userProject.projects.find((p) => p._id == id);

  if (!project || !project.github_link || !project.project_id) {
    return res.status(400).json({ message: "Invalid parameters" });
  }

  if (project.isdeploying) {
    return res.status(200).json({ message: "Project is already deploying" });
  }

  await Userdemo.updateOne(
    { "projects._id": id },
    { $set: { "projects.$.isdeploying": true } }
  );

  user.dailylimit -= 1;
  await user.save();

  await deployQueue.add('deploy-react-project', project , { attempts: 1 });
  res.status(200).json({ message: "Deploying the react project" });
});

router.get("/projects/status/:id", authMiddleware ,async (req, res) => {
  const { id } = req.params;
  try {
    const userProject = await Userdemo.findOne({ "projects._id": id });

    if (!userProject) {
      return res.status(404).json({ message: "Project not found", status: "404" });
    }
    const project = userProject.projects.id(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found", status: "404" });
    }

    return res.status(200).json({
      isdeploying: project.isdeploying,
    });

  } catch (error) {
    console.error("Error fetching project status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/projects/status/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const userProject = await Userdemo.findOne({ "projects._id": id });
    if (!userProject) {
      return res.status(404).json({ message: "Project not found", status: "404" });
    }
    const project = userProject.projects.id(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found", status: "404" });
    }
    if (project.isdeploying) {
      return res.status(200).json({
        message: "Project gand marva raha he",
        isdeploying: true
      });
    }
    await Userdemo.updateOne(
      { "projects._id": id },
      { $set: { "projects.$.isdeploying": false } }
    );

    return res.status(200).json({
      message: "Status successfully updated",
      isdeploying: false
    });

  } catch (error) {
    console.error("Error fetching project status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Get User Projects
router.get("/projects", authMiddleware, async (req, res) => {
  try {
    const user = await Userdemo.findById(req.userid);
    res.json({allprojects : user.projects , isverify : user.isVerified});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/projects", authMiddleware, async (req, res) => {
  const { github_link, project_id , project_type} = req.body;
  try {
    const apis = await apiGateway.send(new GetRestApisCommand({}));
    const api = apis.items.find(api => api.name === `dev-${project_id}`);
    if(api) return res.status(409).json({message : "projectid is not unique"});

    const user = await Userdemo.findById(req.userid);
    const newProject = { github_link, project_id , project_type };
    user.projects.push(newProject);
    await user.save();
    const createdProject = user.projects[user.projects.length - 1];
    res.status(201).json({
      _id: createdProject._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/projects/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Userdemo.findById(req.userid);
    const project = user.projects.id(id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({project : project, limit : user.dailylimit});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.patch("/projects/:id", authMiddleware, async (req, res) => {
  const { env, project_path } = req.body; 
  try {
    // Find the user based on the authenticated user ID
    const user = await Userdemo.findById(req.userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the specific project by ID
    const project = user.projects.find(
      (project) => project._id.toString() === req.params.id
    );
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Update the project's env array with the new env array from request body
    project.env = env.filter((envVar) => envVar.key && envVar.value); // Filter out invalid env variables
    project.project_path = project_path;
    // Save the updated user document
    await user.save();

    res.status(200).json({ message: "Environment variables updated successfully", project });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete("/projects/:id", authMiddleware, async (req, res) => {
  try {
    const user = await Userdemo.findById(req.userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const project = user.projects.find(project => project._id.toString() === req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const project_id = project.project_id;
    const project_type = project.project_type; 
    const lambdaFunctionName = `${project_id}-dev-app`;
    const domainName = `${project_id}.eazydeploy.online`;

    if (project_type === "express") {
      //deleting lambda function if exist
      try {
        await lambda.send(new GetFunctionCommand({ FunctionName: lambdaFunctionName }));
        await lambda.send(new DeleteFunctionCommand({ FunctionName: lambdaFunctionName }));
        console.log(`Lambda function ${lambdaFunctionName} deleted successfully`);
      } catch (err) {
      }
      //deleting DNS record if exist

      try {
        const listRecordsParams = {
          HostedZoneId: hostedZoneId,
          StartRecordName: domainName,
          StartRecordType: "A", // Adjust if it's not an A record
          MaxItems: "1"
        };

        const listResponse = await route53.send(new ListResourceRecordSetsCommand(listRecordsParams));
        const recordToDelete = listResponse.ResourceRecordSets[0];

        if (!recordToDelete) {
          console.log(`No A record found to delete`);
        }else{
        // Step 2: Delete the AliasTarget Record
          if (recordToDelete.AliasTarget) {
            const deleteRecordParams = {
              HostedZoneId: hostedZoneId,
              ChangeBatch: {
                Changes: [
                  {
                    Action: "DELETE",
                    ResourceRecordSet: {
                      Name: recordToDelete.Name,
                      Type: recordToDelete.Type,
                      AliasTarget: recordToDelete.AliasTarget
                    }
                  }
                ]
              }
            };

            await route53.send(new ChangeResourceRecordSetsCommand(deleteRecordParams));
            console.log(`Alias DNS record ${domainName} deleted successfully`);
          }
        }
      } catch (err) {
        console.error("Error deleting alias DNS record:", err);
      }

      try {
        // Delete custom domain name in API Gateway
        await apiGateway.send(new DeleteDomainNameCommand({ domainName }));
        console.log(`Custom domain name ${domainName} deleted successfully from API gateway`);
      } catch (err) {
        console.log("No Custom domain name API found");
      }

      try {
        const response = await apiGateway.send(new GetRestApisCommand({ limit: 500 }));
        const api = response.items.find(api => api.name === `dev-${project_id}`);
        if (!api) {
          console.log(`API with name dev-${project_id} not found.`);
        }else{
          const apiId = api.id; 
          await apiGateway.send(new DeleteRestApiCommand({ restApiId: apiId }));
          console.log(`API Gateway API ${apiId} (Name: dev-${project_id}) deleted successfully`);
        }
      } catch (err) {
        console.error("Error deleting API Gateway API:", err);
      }

    } else if (project_type === "react") {
      try {
        const bucketParams = {
          Bucket: "vercel-react-bucket",
          Key: `${project_id}/`
        };

        await s3.send(new DeleteObjectCommand(bucketParams));
        console.log(`React project folder ${project_id} deleted from S3 bucket successfully`);
      } catch (err) {
        console.error("Error deleting React project folder from S3:", err);
        return res.status(500).json({ error: "Failed to delete React project folder from S3" });
      }
    } else {
      console.log(`Unsupported project type: ${project_type}`);
      return res.status(400).json({ error: "Unsupported project type" });
    }

    // Remove the project from the user's projects
    user.projects = user.projects.filter(
      project => project._id.toString() !== req.params.id
    );
    await user.save();

    res.status(200).json({ message: "Project and associated resources successfully deleted" });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: err.message });
  }
});


export default router;
