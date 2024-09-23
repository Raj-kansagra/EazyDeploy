const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const PROJECT_ID = process.env.PROJECT_ID || 'default-project';
const packageJsonPath = path.join(__dirname, 'output', 'package.json');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// Function to update the homepage field in package.json
function updatePackageJson() {
    return new Promise((resolve, reject) => {
        fs.readFile(packageJsonPath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading package.json: ${err.message}`);
                return reject(err);
            }

            try {
                const packageJson = JSON.parse(data);
                packageJson.homepage = `${PROJECT_ID}/`;

                fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8', (err) => {
                    if (err) {
                        console.error(`Error writing package.json: ${err.message}`);
                        return reject(err);
                    }

                    console.log(`package.json updated with homepage: ${PROJECT_ID}/`);
                    resolve();
                });
            } catch (err) {
                console.error(`Error parsing package.json: ${err.message}`);
                reject(err);
            }
        });
    });
}

// Recursive function to upload files to S3
async function uploadDirectory(directoryPath, s3Bucket, s3Path) {
    const files = fs.readdirSync(directoryPath, { withFileTypes: true });

    for (const file of files) {
        const filePath = path.join(directoryPath, file.name);
        const s3Key = path.join(s3Path, file.name).replace(/\\/g, '/'); // Normalize path for S3

        if (file.isDirectory()) {
            await uploadDirectory(filePath, s3Bucket, s3Key);
        } else {
            const command = new PutObjectCommand({
                Bucket: s3Bucket,
                Key: s3Key,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath) || 'application/octet-stream',
            });

            try {
                await s3Client.send(command);
            } catch (error) {
                console.error('Upload Error', error);
            }
        }
    }
}

// Function to run the build and upload process
async function init() {
    try {
        await updatePackageJson();

        console.log('Executing script.js');
        const outDirPath = path.join(__dirname, 'output');
        const p = exec(`cd ${outDirPath} && npm install && npm run build`);

        p.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        p.stderr.on('data', (data) => {
            console.error('Error', data.toString());
        });

        p.on('close', async () => {
            console.log('Build Complete');
            const distFolderPath = path.join(__dirname, 'output', 'build');

            console.log('Starting to upload recursively');
            await uploadDirectory(distFolderPath, process.env.S3_BUCKET_NAME, PROJECT_ID);
            console.log('Upload Complete');
        });
    } catch (err) {
        console.error('Error during execution:', err.message);
    }
}

init();
