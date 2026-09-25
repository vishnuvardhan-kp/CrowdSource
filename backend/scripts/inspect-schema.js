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

  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('Tables in database:');
  console.log(tables.rows.map(r => r.table_name).join(', '));

  console.log('\n--- Institution count by type and subtype ---');
  const instTypes = await client.query(`
    SELECT type, subtype, count(*) 
    FROM institutions 
    GROUP BY type, subtype 
    ORDER BY type, subtype
  `);
  console.table(instTypes.rows);

  console.log('\n--- Sample Institutions with LGD codes ---');
  const sampleInst = await client.query(`
    SELECT id, name, type, subtype, lgd_code, hierarchy_level, district_name, block_name, verification_status
    FROM institutions 
    LIMIT 10
  `);
  console.table(sampleInst.rows);

  console.log('\n--- Institution Memberships columns ---');
  const memCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'institution_memberships'
    ORDER BY ordinal_position
  `);
  console.table(memCols.rows);

  console.log('\n--- Challenges verification snapshot columns ---');
  const chalCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'challenges' AND (column_name LIKE '%verif%' OR column_name LIKE '%inst%' OR column_name LIKE '%lgd%' OR column_name LIKE '%snap%')
    ORDER BY ordinal_position
  `);
  console.table(chalCols.rows);

  console.log('\n--- Project tables columns ---');
  const projCols = await client.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('projects', 'project_milestones', 'project_deliverables')
    ORDER BY table_name, ordinal_position
  `);
  console.table(projCols.rows);

  await client.end();
}

main().catch(console.error);
