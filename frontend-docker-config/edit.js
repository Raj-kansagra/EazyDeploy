const fs = require('fs');
const path = require('path');
const PROJECT_ID = process.env.PROJECT_ID || 'default-project';
const packageJsonPath = path.join(__dirname, 'output', 'package.json');

fs.readFile(packageJsonPath, 'utf8', (err, data) => {
    if (err) {
        console.error(`Error reading package.json: ${err.message}`);
        process.exit(1);
    }

    try {
        const packageJson = JSON.parse(data);
        packageJson.homepage = `${PROJECT_ID}/`;
        fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8', (err) => {
            if (err) {
                console.error(`Error writing package.json: ${err.message}`);
                process.exit(1);
            }
            console.log(`package.json updated with homepage: ${PROJECT_ID}/`);
        });
    } catch (err) {
        console.error(`Error parsing package.json: ${err.message}`);
        process.exit(1);
    }
});
