const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const fs = require('fs');

async function main() {
  const dataDir = path.resolve(__dirname, '../.pgdata');
  const dbName = process.env.DATABASE_NAME || 'samadhan_setu';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || 'postgres_password';

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user,
    password,
    persistent: true,
    initdbFlags: ['-E', 'UTF8', '--locale=C'],
  });

  const isFirstRun = !fs.existsSync(dataDir) || fs.readdirSync(dataDir).length === 0;

  if (isFirstRun) {
    console.log(`📦 Initializing PostgreSQL cluster at ${dataDir}...`);
    await pg.initialise();
    console.log('✅ Cluster initialized.');
  }

  console.log(`🚀 Starting PostgreSQL on port ${port}...`);
  await pg.start();
  console.log(`✅ PostgreSQL server running on port ${port}.`);

  if (isFirstRun) {
    console.log(`📁 Creating database "${dbName}"...`);
    try {
      await pg.createDatabase(dbName);
      console.log(`✅ Database "${dbName}" created.`);
    } catch (err) {
      console.log(`Database creation notice: ${err.message}`);
    }
  }

  console.log(`🌟 PostgreSQL is ready and accepting connections on localhost:${port}.`);

  // Handle termination signals
  const cleanup = async () => {
    console.log('Stopping PostgreSQL server...');
    try {
      await pg.stop();
    } catch (e) {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process alive
  setInterval(() => {}, 10000);
}

main().catch((err) => {
  console.error('❌ Failed to run embedded postgres:', err);
  process.exit(1);
});
