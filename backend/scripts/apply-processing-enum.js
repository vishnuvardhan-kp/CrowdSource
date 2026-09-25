const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres_password',
    database: 'samadhan_setu',
  });

  await client.connect();
  console.log('Connected to database.');
  await client.query(`ALTER TYPE "challenge_status_enum" ADD VALUE IF NOT EXISTS 'PROCESSING';`);
  console.log('Successfully added PROCESSING to challenge_status_enum.');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
