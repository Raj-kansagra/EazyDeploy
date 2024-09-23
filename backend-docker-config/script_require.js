const fs = require('fs');
const path = require('path');

const indexFilePath = path.resolve('index.js');
let indexContent = fs.readFileSync(indexFilePath, 'utf8');

if (!indexContent.includes('const serverless = require(\'serverless-http\');')) {
  indexContent = `const serverless = require('serverless-http');\n\n${indexContent}`;
}
if (!indexContent.includes('module.exports.handler = serverless(app);')) {
  indexContent += `\n\nmodule.exports.handler = serverless(app);`;
}

fs.writeFileSync(indexFilePath, indexContent, 'utf8');
