const fs = require('fs');
const path = require('path');

const testDir = path.resolve(__dirname, '../backend/test');
const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.ts'));

const dotenvCode = `import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
`;

for (const file of files) {
  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('dotenv.config')) {
    content = dotenvCode + content;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Patched dotenv in:', file);
  }
}
