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

  console.log('--- COLUMNS IN institutions TABLE ---');
  const instCols = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'institutions' ORDER BY ordinal_position");
  instCols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  console.log('\n--- COLUMNS IN institution_memberships TABLE ---');
  const memCols = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'institution_memberships' ORDER BY ordinal_position");
  memCols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  console.log('\n--- COLUMNS IN challenges TABLE (INSTITUTION FIELDS) ---');
  const chalCols = await client.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'challenges' AND column_name IN ('reporter_type', 'institution_id', 'institution_membership_id', 'verification_snapshot')");
  chalCols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  await client.end();
}

main().catch(console.error);
