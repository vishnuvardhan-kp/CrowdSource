const fs = require('fs');
const path = require('path');
const { Client } = require(path.resolve(__dirname, '../backend/node_modules/pg'));

async function main() {
  const priJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../LGD/processed/pri_institutions.json'), 'utf8'));
  const rawCodes = new Set(priJson.map(p => p.lgd_code));
  console.log('Total PRI in pri_institutions.json:', priJson.length);
  console.log('Unique LGD codes in pri_institutions.json:', rawCodes.size);

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres_password',
    database: 'samadhan_setu',
  });
  await client.connect();

  const res = await client.query('SELECT id, name, type, subtype, lgd_code, is_authoritative_lgd, metadata, created_at FROM institutions WHERE is_authoritative_lgd = true');
  console.log('\nTotal authoritative PRIs in DB:', res.rows.length);

  const extras = res.rows.filter(r => !rawCodes.has(r.lgd_code));
  console.log(`\nFound ${extras.length} authoritative institutions in DB whose LGD code is NOT in pri_institutions.json:`);
  extras.forEach((e, idx) => {
    console.log(`  ${idx + 1}. [${e.type} | ${e.subtype}] LGD: "${e.lgd_code}" | ${e.name}`);
    console.log(`     created_at: ${e.created_at} | metadata: ${JSON.stringify(e.metadata)}`);
  });

  const extraIds = extras.map(e => e.id);
  if (extraIds.length > 0) {
    const mems = await client.query('SELECT count(*) FROM institution_memberships WHERE institution_id = ANY($1::uuid[])', [extraIds]);
    console.log(`\nForeign Key Check: ${mems.rows[0].count} memberships reference these 17 institutions.`);

    const chals = await client.query('SELECT count(*) FROM challenges WHERE institution_id = ANY($1::uuid[])', [extraIds]);
    console.log(`Foreign Key Check: ${chals.rows[0].count} challenges reference these 17 institutions.`);

    if (parseInt(mems.rows[0].count, 10) > 0) {
      const memDetails = await client.query('SELECT m.id, m.institution_id, i.name, i.lgd_code, m.designation, m.authority_status FROM institution_memberships m JOIN institutions i ON m.institution_id = i.id WHERE m.institution_id = ANY($1::uuid[])', [extraIds]);
      console.log('Memberships details:', memDetails.rows);
    }
  }

  // Check the 2 extra districts
  const rawDistricts = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../LGD/processed/districts.json'), 'utf8'));
  const rawDistCodes = new Set(rawDistricts.map(d => d.district_code));
  const dbDistricts = await client.query('SELECT * FROM districts ORDER BY name');
  console.log(`\n--- Districts Audit (Total in DB: ${dbDistricts.rows.length}, Total in LGD: ${rawDistricts.length}) ---`);
  const extraDistricts = dbDistricts.rows.filter(d => !rawDistCodes.has(d.code));
  console.log(`Extra districts in DB (${extraDistricts.length}):`);
  for (const ed of extraDistricts) {
    const orgCount = (await client.query('SELECT count(*) FROM organizations WHERE district_id = $1', [ed.id])).rows[0].count;
    const chalCount = (await client.query('SELECT count(*) FROM challenges WHERE district_id = $1', [ed.id])).rows[0].count;
    const blockCount = (await client.query('SELECT count(*) FROM blocks WHERE district_id = $1', [ed.id])).rows[0].count;
    const blocksInDist = (await client.query('SELECT id, name FROM blocks WHERE district_id = $1', [ed.id])).rows;
    const blockIds = blocksInDist.map(b => b.id);
    let instBlockCount = 0;
    let chalBlockCount = 0;
    if (blockIds.length > 0) {
      instBlockCount = (await client.query('SELECT count(*) FROM institutions WHERE block_id = ANY($1::uuid[])', [blockIds])).rows[0].count;
    }
    console.log(`  - District ID: ${ed.id} | "${ed.name}" | Code: "${ed.code}" | Blocks: ${blockCount}, Orgs: ${orgCount}, Challenges: ${chalCount}, Insts on blocks: ${instBlockCount}, Chals on blocks: ${chalBlockCount}`);
  }
  const rawBlocks = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../LGD/processed/blocks.json'), 'utf8'));
  const rawBlockCodes = new Set(rawBlocks.map(b => b.block_code));
  const allDbBlocks = (await client.query('SELECT b.id, b.name, b.code, d.name as dist_name, d.code as dist_code FROM blocks b LEFT JOIN districts d ON b.district_id = d.id')).rows;
  console.log(`\n--- Blocks Audit (Total in DB: ${allDbBlocks.length}, Total in LGD: ${rawBlocks.length}) ---`);
  const extraBlocks = allDbBlocks.filter(b => !rawBlockCodes.has(b.code));
  console.log(`Extra blocks in DB: ${extraBlocks.length}`);
  const extraBlockIds = extraBlocks.map(b => b.id);
  const chalsOnExtraBlocks = (await client.query('SELECT count(*) FROM challenges WHERE block_id = ANY($1::uuid[])', [extraBlockIds])).rows[0].count;
  const instsOnExtraBlocks = (await client.query('SELECT count(*) FROM institutions WHERE block_id = ANY($1::uuid[])', [extraBlockIds])).rows[0].count;
  console.log(`Challenges referencing extra blocks: ${chalsOnExtraBlocks}`);
  console.log(`Institutions referencing extra blocks: ${instsOnExtraBlocks}`);

  await client.end();
}

main().catch(console.error);
