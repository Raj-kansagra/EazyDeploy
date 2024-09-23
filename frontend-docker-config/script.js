const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const PROJECT_ID = process.env.PROJECT_ID || 'default-project';
const packageJsonPath = path.join(__dirname, 'output', 'package.json');
const viteConfigPath = path.join(__dirname, 'output', 'vite.config.js');

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

// Function to update vite.config.js
// Function to update vite.config.js
function updateViteConfig(basePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(viteConfigPath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading vite.config.js: ${err.message}`);
                return reject(err);
            }

            // Check if base property already exists
            if (data.includes('base:')) {
                // If it exists, replace it
                const updatedConfig = data.replace(/base:\s*['"`].*?['"`]/, `base: '${basePath}'`);
                fs.writeFile(viteConfigPath, updatedConfig, 'utf8', (err) => {
                    if (err) {
                        console.error(`Error writing vite.config.js: ${err.message}`);
                        return reject(err);
                    }
                    console.log(`vite.config.js updated with base: ${basePath}`);
                    resolve();
                });
            } else {
                // If it doesn't exist, add it
                const updatedConfig = data.replace(/export default defineConfig\(\{/, `export default defineConfig({\n  base: '${basePath}',`);
                fs.writeFile(viteConfigPath, updatedConfig, 'utf8', (err) => {
                    if (err) {
                        console.error(`Error writing vite.config.js: ${err.message}`);
                        return reject(err);
                    }
                    console.log(`vite.config.js updated with base: ${basePath}`);
                    resolve();
                });
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
        const isViteProject = fs.existsSync(viteConfigPath);

        if (isViteProject) {
            console.log('Detected Vite project. Updating vite.config.js.');
            await updateViteConfig(`${PROJECT_ID}/`);
        } else {
            console.log('Updating package.json for build.');
            await updatePackageJson();
        }

        console.log('Executing build process...');
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

            const outputFolderPath = isViteProject ? path.join(outDirPath, 'dist') : path.join(outDirPath, 'build');

            console.log('Starting to upload recursively');
            await uploadDirectory(outputFolderPath, process.env.S3_BUCKET_NAME, PROJECT_ID);
            console.log('Upload Complete');
        });
    } catch (err) {
        console.error('Error during execution:', err.message);
    }
}

init();
