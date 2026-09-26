const path = require('path');
const bcrypt = require(path.join(__dirname, '../node_modules/bcryptjs'));
const { Client } = require(path.join(__dirname, '../node_modules/pg'));

const client = new Client({ connectionString: 'postgresql://postgres:postgres_password@localhost:5432/samadhan_setu' });

async function seedNitJamshedpur() {
  console.log('🏛️ Canonicalizing NIT Jamshedpur as Primary Showcase University...');
  await client.connect();

  // 1. Check or create East Singhbhum district if needed
  let eastSinghbhumDist = (await client.query("SELECT id, name FROM districts WHERE name ILIKE '%East Singhb%' LIMIT 1")).rows[0];
  if (!eastSinghbhumDist) {
    const dRes = await client.query("INSERT INTO districts (id, name, state, code, created_at) VALUES (gen_random_uuid(), 'East Singhbhum', 'Jharkhand', '327', NOW()) RETURNING id, name");
    eastSinghbhumDist = dRes.rows[0];
  }

  // 2. Check or create Organization for NIT Jamshedpur
  let nitOrg = (await client.query("SELECT id, name FROM organizations WHERE name ILIKE '%NIT Jamshedpur%' OR name ILIKE '%National Institute of Technology%Jamshedpur%' LIMIT 1")).rows[0];
  if (!nitOrg) {
    const orgRes = await client.query(`
      INSERT INTO organizations (
        id, name, organization_type, geographic_reach, is_demo, description,
        district, state, website, email, phone, address,
        verification_status, is_claimed, available_capacity, availability_status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'National Institute of Technology, Jamshedpur',
        'INSTITUTION',
        'NATIONAL',
        false,
        'Premier Institute of National Importance in Adityapur, Jamshedpur, specializing in electrical power systems, smart microgrids, environmental telemetry, and advanced robotics.',
        $1,
        'Jharkhand',
        'https://www.nitjsr.ac.in',
        'dean.research@nitjsr.ac.in',
        '+91-657-2282231',
        'Adityapur, Jamshedpur, East Singhbhum, Jharkhand 831014',
        'VERIFIED',
        true,
        6,
        'AVAILABLE',
        NOW(),
        NOW()
      ) RETURNING id, name
    `, [eastSinghbhumDist.name]);
    nitOrg = orgRes.rows[0];
    console.log(`✅ Created Organization: ${nitOrg.name} (${nitOrg.id})`);
  } else {
    await client.query(`
      UPDATE organizations SET
        verification_status = 'VERIFIED',
        is_claimed = true,
        available_capacity = 6,
        availability_status = 'AVAILABLE',
        district = $1,
        website = 'https://www.nitjsr.ac.in',
        email = 'dean.research@nitjsr.ac.in'
      WHERE id = $2
    `, [eastSinghbhumDist.name, nitOrg.id]);
    console.log(`✅ Existing Organization verified: ${nitOrg.name} (${nitOrg.id})`);
  }

  // 3. Check or create InstitutionProfile
  let instProfile = (await client.query('SELECT id FROM institution_profiles WHERE organization_id = $1 LIMIT 1', [nitOrg.id])).rows[0];
  if (!instProfile) {
    const pRes = await client.query(`
      INSERT INTO institution_profiles (
        id, organization_id, institution_code, institution_category, established_year, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        'NIT-JSR-001',
        'Institute of National Importance',
        1960,
        NOW(),
        NOW()
      ) RETURNING id
    `, [nitOrg.id]);
    instProfile = pRes.rows[0];
    console.log(`✅ Created InstitutionProfile for NIT Jamshedpur (${instProfile.id})`);
  }

  // 4. Check or create Departments
  let eeDept = (await client.query("SELECT id FROM departments WHERE institution_id = $1 AND code = 'EED' LIMIT 1", [instProfile.id])).rows[0];
  if (!eeDept) {
    const dRes = await client.query(`
      INSERT INTO departments (id, institution_id, name, code, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'Department of Electrical Engineering', 'EED', NOW(), NOW())
      RETURNING id
    `, [instProfile.id]);
    eeDept = dRes.rows[0];
    console.log(`✅ Created Department of Electrical Engineering (EED)`);
  }

  let csDept = (await client.query("SELECT id FROM departments WHERE institution_id = $1 AND code = 'CSE' LIMIT 1", [instProfile.id])).rows[0];
  if (!csDept) {
    const dRes = await client.query(`
      INSERT INTO departments (id, institution_id, name, code, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, 'Department of Computer Science & Engineering', 'CSE', NOW(), NOW())
      RETURNING id
    `, [instProfile.id]);
    csDept = dRes.rows[0];
    console.log(`✅ Created Department of Computer Science & Engineering (CSE)`);
  }

  // 5. Check or create Laboratories
  let lab1 = (await client.query("SELECT id FROM laboratories WHERE institution_id = $1 AND name ILIKE '%Microgrid%' LIMIT 1", [instProfile.id])).rows[0];
  if (!lab1) {
    await client.query(`
      INSERT INTO laboratories (id, institution_id, department_id, name, description, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, 'Smart Microgrid & Clean Energy Systems Lab', 'Advanced real-time digital power simulator and PV-biomass microgrid stabilization testbed.', NOW(), NOW())
    `, [instProfile.id, eeDept.id]);
    console.log(`✅ Created Smart Microgrid Lab`);
  }

  // 6. Link Capabilities
  const capNames = [
    'Embedded Systems & Hardware',
    'Internet of Things (IoT)',
    'Water Quality & Resource Management',
    'Artificial Intelligence & Machine Learning',
  ];
  for (const capName of capNames) {
    const cap = (await client.query('SELECT id FROM capabilities WHERE name = $1 LIMIT 1', [capName])).rows[0];
    if (cap) {
      const exists = (await client.query('SELECT id FROM institution_capabilities WHERE institution_id = $1 AND capability_id = $2 LIMIT 1', [instProfile.id, cap.id])).rows[0];
      if (!exists) {
        await client.query(`
          INSERT INTO institution_capabilities (
            id, institution_id, capability_id, department_id, source, verification_status, confidence_score, evidence_summary, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, 'ORGANIZATION_PROVIDED', 'VERIFIED', 0.95, 'Accredited NIT Jamshedpur National R&D Facility', NOW(), NOW()
          )
        `, [instProfile.id, cap.id, eeDept.id]);
      }
    }
  }

  // 7. Seed / Update Dean User: dean@nitjsr.ac.in (and also alias/link NitJsr123! / Password123!)
  const passwordHash = await bcrypt.hash('NitJsr123!', 10);
  let deanUser = (await client.query("SELECT id FROM users WHERE email = 'dean@nitjsr.ac.in' LIMIT 1")).rows[0];
  if (!deanUser) {
    const uRes = await client.query(`
      INSERT INTO users (
        id, name, email, password_hash, role, organization_id, phone, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'Prof. Rajeshwar Kumar (Dean of R&C, NIT Jamshedpur)',
        'dean@nitjsr.ac.in',
        $1,
        'UNIVERSITY_ADMIN',
        $2,
        '+91-657-2282231',
        true,
        NOW(),
        NOW()
      ) RETURNING id
    `, [passwordHash, nitOrg.id]);
    deanUser = uRes.rows[0];
    console.log(`✅ Seeded NIT Jamshedpur Dean: dean@nitjsr.ac.in / NitJsr123! (${deanUser.id})`);
  } else {
    await client.query(`
      UPDATE users SET
        name = 'Prof. Rajeshwar Kumar (Dean of R&C, NIT Jamshedpur)',
        password_hash = $1,
        role = 'UNIVERSITY_ADMIN',
        organization_id = $2,
        is_active = true
      WHERE id = $3
    `, [passwordHash, nitOrg.id, deanUser.id]);
    console.log(`✅ Updated NIT Jamshedpur Dean: dean@nitjsr.ac.in`);
  }

  // Ensure OrganizationMembership for Dean
  const membership = (await client.query('SELECT id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1', [deanUser.id, nitOrg.id])).rows[0];
  if (!membership) {
    await client.query(`
      INSERT INTO organization_memberships (
        id, user_id, organization_id, organization_role, membership_status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ADMIN', 'ACTIVE', NOW(), NOW()
      )
    `, [deanUser.id, nitOrg.id]);
    console.log(`✅ Created Active Admin Membership for Dean at NIT Jamshedpur`);
  }

  // 8. Seed Demo Faculty Mentor and Student Researcher members for NIT Jamshedpur
  const facultyEmail = 'sanjeev.kumar@nitjsr.ac.in';
  let facultyUser = (await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [facultyEmail])).rows[0];
  if (!facultyUser) {
    const fuRes = await client.query(`
      INSERT INTO users (
        id, name, email, password_hash, role, organization_id, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'Dr. Sanjeev Kumar', $1, $2, 'FACULTY', $3, true, NOW(), NOW()
      ) RETURNING id
    `, [facultyEmail, passwordHash, nitOrg.id]);
    facultyUser = fuRes.rows[0];
  }
  const fMem = (await client.query('SELECT id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1', [facultyUser.id, nitOrg.id])).rows[0];
  if (!fMem) {
    await client.query(`
      INSERT INTO organization_memberships (
        id, user_id, organization_id, organization_role, membership_status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'MEMBER', 'ACTIVE', NOW(), NOW()
      )
    `, [facultyUser.id, nitOrg.id]);
    console.log(`✅ Seeded Faculty Mentor Dr. Sanjeev Kumar at NIT Jamshedpur`);
  }

  const studentEmail = 'ananya.sharma@nitjsr.ac.in';
  let studentUser = (await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [studentEmail])).rows[0];
  if (!studentUser) {
    const suRes = await client.query(`
      INSERT INTO users (
        id, name, email, password_hash, role, organization_id, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'Ananya Sharma', $1, $2, 'STUDENT', $3, true, NOW(), NOW()
      ) RETURNING id
    `, [studentEmail, passwordHash, nitOrg.id]);
    studentUser = suRes.rows[0];
  }
  const sMem = (await client.query('SELECT id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2 LIMIT 1', [studentUser.id, nitOrg.id])).rows[0];
  if (!sMem) {
    await client.query(`
      INSERT INTO organization_memberships (
        id, user_id, organization_id, organization_role, membership_status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'MEMBER', 'ACTIVE', NOW(), NOW()
      )
    `, [studentUser.id, nitOrg.id]);
    console.log(`✅ Seeded Student Researcher Ananya Sharma at NIT Jamshedpur`);
  }

  await client.end();
  console.log('🎉 NIT Jamshedpur canonicalization complete!');
}

seedNitJamshedpur().catch((err) => {
  console.error('Failed to seed NIT Jamshedpur:', err);
  process.exit(1);
});
