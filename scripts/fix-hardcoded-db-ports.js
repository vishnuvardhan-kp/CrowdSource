const fs = require('fs');
const path = require('path');

const testDir = path.resolve(__dirname, '../backend/test');
const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(testDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('port: 5432')) {
    content = content.replace(/port:\s*5432/g, "port: parseInt(process.env.DATABASE_PORT || '5432', 10)");
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed hardcoded port in:', file);
  }
}
