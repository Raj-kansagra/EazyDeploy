import fs from 'fs';
import path from 'path';

const indexFilePath = path.resolve('index.js');
let indexContent = fs.readFileSync(indexFilePath, 'utf8');

if (!indexContent.includes('import serverless from \'serverless-http\';')) {
  indexContent = `import serverless from 'serverless-http';\n\n${indexContent}`;
}
if (!indexContent.includes('export const handler = serverless(app);')) {
  indexContent += `\n\nexport const handler = serverless(app);`;
}

fs.writeFileSync(indexFilePath, indexContent, 'utf8');



