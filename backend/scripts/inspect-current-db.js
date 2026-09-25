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
  console.log('Connected to samadhan_setu!');

  const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Total tables in public schema:', tablesRes.rows.length);

  for (const t of ['districts', 'blocks', 'institutions', 'institution_memberships', 'institution_evidence', 'challenges']) {
    try {
      const res = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`Table '${t}': ${res.rows[0].count} records`);
    } catch (e) {
      console.log(`Table '${t}': Error (${e.message})`);
    }
  }

  try {
    const insts = await client.query('SELECT id, name, type, subtype, lgd_code, district_name, block_name FROM institutions ORDER BY type, name');
    console.log(`\nExisting institutions in database (${insts.rows.length} total):`);
    insts.rows.forEach(r => {
      console.log(`  - [${r.type} | ${r.subtype}] LGD: "${r.lgd_code}" | ${r.name} (District: ${r.district_name || 'N/A'}, Block: ${r.block_name || 'N/A'})`);
    });
  } catch (e) {
    console.log('Error fetching institutions:', e.message);
  }

  try {
    const mems = await client.query('SELECT m.id, m.relationship, m.designation, m.authority_status, i.name as inst_name, i.lgd_code FROM institution_memberships m LEFT JOIN institutions i ON m.institution_id = i.id');
    console.log(`\nExisting memberships in database (${mems.rows.length} total):`);
    mems.rows.forEach(r => {
      console.log(`  - Membership ID: ${r.id} | ${r.designation} (${r.relationship}) | Status: ${r.authority_status} | Inst: ${r.inst_name} [${r.lgd_code}]`);
    });
  } catch (e) {
    console.log('Error fetching memberships:', e.message);
  }

  try {
    const chs = await client.query('SELECT id, title, reporter_type, institution_id, status FROM challenges WHERE reporter_type != \'INDIVIDUAL\'');
    console.log(`\nExisting institutional challenges (${chs.rows.length} total):`);
    chs.rows.forEach(r => {
      console.log(`  - Challenge ID: ${r.id} | ${r.title} | Reporter: ${r.reporter_type} | Inst ID: ${r.institution_id}`);
    });
  } catch (e) {
    console.log('Error fetching challenges:', e.message);
  }

  await client.end();
}

main().catch(console.error);
