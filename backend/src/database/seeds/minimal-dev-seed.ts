import { AppDataSource } from '../data-source';
import {
  User,
  Organization,
  Capability,
  InstitutionProfile,
  Department,
  Laboratory,
  InstitutionCapability,
  IndustryProfile,
  IndustrySector,
  IndustrySupportType,
  IndustryCapability,
  VerificationRecord,
  OrganizationMembership,
  District,
} from '../entities';
import {
  UserRole,
  OrganizationType,
  VerificationStatus,
  CapabilitySource,
  IndustrySupportCode,
  GeographicReach,
  OrganizationRole,
  MembershipStatus,
  JurisdictionScope,
} from '../../common/enums';

import * as bcrypt from 'bcryptjs';

export async function runDevSeed() {
  console.log('🌱 Starting minimal development seed...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepo = AppDataSource.getRepository(User);
  const orgRepo = AppDataSource.getRepository(Organization);
  const capRepo = AppDataSource.getRepository(Capability);
  const instProfileRepo = AppDataSource.getRepository(InstitutionProfile);
  const deptRepo = AppDataSource.getRepository(Department);
  const labRepo = AppDataSource.getRepository(Laboratory);
  const instCapRepo = AppDataSource.getRepository(InstitutionCapability);
  const indProfileRepo = AppDataSource.getRepository(IndustryProfile);
  const sectorRepo = AppDataSource.getRepository(IndustrySector);
  const supportTypeRepo = AppDataSource.getRepository(IndustrySupportType);
  const indCapRepo = AppDataSource.getRepository(IndustryCapability);
  const verifRepo = AppDataSource.getRepository(VerificationRecord);

  // 1. Seed Core Master Capabilities
  const capabilitiesData = [
    {
      name: 'Internet of Things (IoT)',
      slug: 'iot',
      category: 'Technology',
      description: 'Sensor networks, edge telemetry, and embedded connectivity',
    },
    {
      name: 'Artificial Intelligence & Machine Learning',
      slug: 'ai-ml',
      category: 'Technology',
      description: 'Machine learning models, computer vision, natural language processing',
    },
    {
      name: 'Water Quality & Resource Management',
      slug: 'water-management',
      category: 'Environmental Engineering',
      description: 'Water testing, purification, watershed conservation, and hydrology',
    },
    {
      name: 'Geographic Information Systems (GIS)',
      slug: 'gis',
      category: 'Spatial Analysis',
      description: 'Geospatial mapping, remote sensing, spatial planning',
    },
    {
      name: 'Embedded Systems & Hardware',
      slug: 'embedded-systems',
      category: 'Hardware Engineering',
      description: 'Microcontroller architecture, PCB design, firmware engineering',
    },
  ];

  const savedCapabilities: Record<string, Capability> = {};
  for (const cData of capabilitiesData) {
    let cap = await capRepo.findOne({ where: { slug: cData.slug } });
    if (!cap) {
      cap = capRepo.create(cData);
      cap = await capRepo.save(cap);
    }
    savedCapabilities[cData.slug] = cap;
  }
  console.log(`✅ Seeded ${Object.keys(savedCapabilities).length} master capabilities`);

  // 2. Seed Industry Support Types
  const supportTypesData = [
    { code: IndustrySupportCode.FUNDING, name: 'Project Funding / Grants', description: 'Financial grants and seed funding' },
    { code: IndustrySupportCode.MENTORSHIP, name: 'Technical & Domain Mentorship', description: 'Industry expert advising' },
    { code: IndustrySupportCode.HARDWARE, name: 'Hardware & Lab Equipment Access', description: 'Access to physical fabrication & lab tools' },
    { code: IndustrySupportCode.SOFTWARE, name: 'Software Licenses & Cloud Credits', description: 'Tools, SDKs, and compute' },
    { code: IndustrySupportCode.PROTOTYPING, name: 'Rapid Prototyping Facilities', description: 'Machining, 3D printing, circuit fab' },
    { code: IndustrySupportCode.TESTING, name: 'Field & Compliance Testing', description: 'Standard compliance and stress testing' },
    { code: IndustrySupportCode.MANUFACTURING, name: 'Small-Batch Manufacturing', description: 'Pilot scale production' },
    { code: IndustrySupportCode.PILOT_DEPLOYMENT, name: 'Pilot Site Deployment', description: 'Real-world field testbeds' },
    { code: IndustrySupportCode.MARKET_ACCESS, name: 'Market & Go-to-Market Access', description: 'Distribution and commercial channel links' },
    { code: IndustrySupportCode.TECHNOLOGY_TRANSFER, name: 'Technology Transfer / IP Licensing', description: 'IP commercialization pathways' },
  ];

  const savedSupportTypes: Record<string, IndustrySupportType> = {};
  for (const st of supportTypesData) {
    let item = await supportTypeRepo.findOne({ where: { code: st.code } });
    if (!item) {
      item = supportTypeRepo.create(st);
      item = await supportTypeRepo.save(item);
    }
    savedSupportTypes[st.code] = item;
  }
  console.log(`✅ Seeded ${Object.keys(savedSupportTypes).length} industry support types`);

  // 3. Seed Industry Sectors
  const sectorsData = [
    { code: 'IT_SOFTWARE', name: 'Information Technology & Software', description: 'Software and computing systems' },
    { code: 'CLEANTECH_ENV', name: 'CleanTech & Environmental Engineering', description: 'Water, waste, and clean energy' },
    { code: 'AGRI_TECH', name: 'Agriculture & Rural Tech', description: 'Agritech and post-harvest storage' },
    { code: 'HEALTHCARE', name: 'Healthcare & Biomedical Devices', description: 'Public health diagnostics and devices' },
  ];

  for (const sec of sectorsData) {
    const exists = await sectorRepo.findOne({ where: { code: sec.code } });
    if (!exists) {
      await sectorRepo.save(sectorRepo.create(sec));
    }
  }

  // 4. Seed 1 Demo Platform Admin User (development credentials: admin@dev.local / AdminDev123!)
  const devAdminHash = await bcrypt.hash('AdminDev123!', 10);
  let adminUser = await userRepo.findOne({ where: { email: 'admin@dev.local' } });
  if (!adminUser) {
    adminUser = userRepo.create({
      name: 'System Admin (Dev Placeholder)',
      email: 'admin@dev.local',
      password_hash: devAdminHash,
      role: UserRole.PLATFORM_ADMIN,
      is_active: true,
    });
    adminUser = await userRepo.save(adminUser);
    console.log('✅ Seeded demo admin user (admin@dev.local / AdminDev123!)');
  } else if (!adminUser.password_hash) {
    adminUser.password_hash = devAdminHash;
    adminUser = await userRepo.save(adminUser);
    console.log('✅ Updated demo admin password hash for dev authentication');
  }

  // Seed 1 Demo Citizen User (development credentials: citizen@dev.local / CitizenDev123!)
  const devCitizenHash = await bcrypt.hash('CitizenDev123!', 10);
  let citizenUser = await userRepo.findOne({ where: { email: 'citizen@dev.local' } });
  if (!citizenUser) {
    citizenUser = userRepo.create({
      name: 'Priya Sharma (Demo Citizen)',
      email: 'citizen@dev.local',
      password_hash: devCitizenHash,
      role: UserRole.CITIZEN,
      is_active: true,
      phone: '+91-9876543210',
    });
    citizenUser = await userRepo.save(citizenUser);
    console.log('✅ Seeded demo citizen user (citizen@dev.local / CitizenDev123!)');
  } else if (!citizenUser.password_hash) {
    citizenUser.password_hash = devCitizenHash;
    citizenUser = await userRepo.save(citizenUser);
    console.log('✅ Updated demo citizen password hash');
  }

  // 4b. Seed Dedicated Government Officers & State Reviewer with canonical district IDs
  const distRepo = AppDataSource.getRepository(District);
  const ranchiDistrict = await distRepo.findOne({ where: { name: 'Ranchi' } });
  const dhanbadDistrict = await distRepo.findOne({ where: { name: 'Dhanbad' } });

  const govPasswordHash = await bcrypt.hash('GovOfficer123!', 10);
  const stateAdminPasswordHash = await bcrypt.hash('GovAdmin123!', 10);

  // 1. Ranchi District Officer
  let ranchiOfficer = await userRepo.findOne({ where: { email: 'officer.ranchi@jharkhand.gov.in' } });
  if (!ranchiOfficer) {
    ranchiOfficer = userRepo.create({
      name: 'Rajesh Kumar (District Officer, Ranchi)',
      email: 'officer.ranchi@jharkhand.gov.in',
      password_hash: govPasswordHash,
      role: UserRole.GOVERNMENT_OFFICER,
      district_id: ranchiDistrict?.id,
      district: 'Ranchi',
      state: 'Jharkhand',
      jurisdiction_scope: JurisdictionScope.DISTRICT,
      is_active: true,
      phone: '+91-651-2200001',
    });
    await userRepo.save(ranchiOfficer);
    console.log('✅ Seeded Ranchi Government Officer (officer.ranchi@jharkhand.gov.in / GovOfficer123!)');
  } else {
    ranchiOfficer.password_hash = govPasswordHash;
    ranchiOfficer.role = UserRole.GOVERNMENT_OFFICER;
    ranchiOfficer.district_id = ranchiDistrict?.id;
    ranchiOfficer.district = 'Ranchi';
    ranchiOfficer.jurisdiction_scope = JurisdictionScope.DISTRICT;
    await userRepo.save(ranchiOfficer);
  }

  // 2. Dhanbad District Officer
  let dhanbadOfficer = await userRepo.findOne({ where: { email: 'officer.dhanbad@jharkhand.gov.in' } });
  if (!dhanbadOfficer) {
    dhanbadOfficer = userRepo.create({
      name: 'Amit Singh (District Officer, Dhanbad)',
      email: 'officer.dhanbad@jharkhand.gov.in',
      password_hash: govPasswordHash,
      role: UserRole.GOVERNMENT_OFFICER,
      district_id: dhanbadDistrict?.id,
      district: 'Dhanbad',
      state: 'Jharkhand',
      jurisdiction_scope: JurisdictionScope.DISTRICT,
      is_active: true,
      phone: '+91-326-2200002',
    });
    await userRepo.save(dhanbadOfficer);
    console.log('✅ Seeded Dhanbad Government Officer (officer.dhanbad@jharkhand.gov.in / GovOfficer123!)');
  } else {
    dhanbadOfficer.password_hash = govPasswordHash;
    dhanbadOfficer.role = UserRole.GOVERNMENT_OFFICER;
    dhanbadOfficer.district_id = dhanbadDistrict?.id;
    dhanbadOfficer.district = 'Dhanbad';
    dhanbadOfficer.jurisdiction_scope = JurisdictionScope.DISTRICT;
    await userRepo.save(dhanbadOfficer);
  }

  // 3. Statewide Government Admin / Reviewer
  let stateAdmin = await userRepo.findOne({ where: { email: 'admin.state@jharkhand.gov.in' } });
  if (!stateAdmin) {
    stateAdmin = userRepo.create({
      name: 'Dr. Sunita Murmu (State Reviewer, Jharkhand)',
      email: 'admin.state@jharkhand.gov.in',
      password_hash: stateAdminPasswordHash,
      role: UserRole.GOVERNMENT_ADMIN,
      district_id: null,
      district: null,
      state: 'Jharkhand',
      jurisdiction_scope: JurisdictionScope.STATE,
      is_active: true,
      phone: '+91-651-2200003',
    });
    await userRepo.save(stateAdmin);
    console.log('✅ Seeded Statewide Government Admin (admin.state@jharkhand.gov.in / GovAdmin123!)');
  } else {
    stateAdmin.password_hash = stateAdminPasswordHash;
    stateAdmin.role = UserRole.GOVERNMENT_ADMIN;
    stateAdmin.jurisdiction_scope = JurisdictionScope.STATE;
    await userRepo.save(stateAdmin);
  }

  // Ensure Platform Admin has NATIONAL jurisdiction
  if (adminUser) {
    adminUser.jurisdiction_scope = JurisdictionScope.NATIONAL;
    await userRepo.save(adminUser);
  }

  // 5. Seed 1 Demo Higher Education Institution (clearly marked as dev demo)
  let demoInstOrg = await orgRepo.findOne({ where: { name: '[DEV-DEMO] Demo Institute of Technology' } });
  if (!demoInstOrg) {
    demoInstOrg = orgRepo.create({
      name: '[DEV-DEMO] Demo Institute of Technology',
      organization_type: OrganizationType.INSTITUTION,
      description: 'Development test institution profile to verify relational schema and capability linkages.',
      district: 'Ranchi',
      state: 'Jharkhand',
      verification_status: VerificationStatus.VERIFIED,
      verification_source: 'PUBLIC_RECORD',
      verified_at: new Date(),
      is_claimed: false,
      is_demo: true,
      geographic_reach: GeographicReach.DISTRICT,
    });
    demoInstOrg = await orgRepo.save(demoInstOrg);

    const instProfile = instProfileRepo.create({
      organization_id: demoInstOrg.id,
      institution_code: 'DEV-INST-001',
      institution_category: 'Technical University',
      established_year: 1985,
    });
    const savedProfile = await instProfileRepo.save(instProfile);

    const dept = deptRepo.create({
      institution_id: savedProfile.id,
      name: 'Department of Computer Science & Engineering',
      code: 'CSE',
    });
    const savedDept = await deptRepo.save(dept);

    const lab = labRepo.create({
      institution_id: savedProfile.id,
      department_id: savedDept.id,
      name: 'Smart Systems & IoT Lab',
      description: 'Sensor testing and LoRaWAN gateway development',
    });
    const savedLab = await labRepo.save(lab);

    // Link capability with provenance
    const instCap = instCapRepo.create({
      institution_id: savedProfile.id,
      capability_id: savedCapabilities['iot'].id,
      department_id: savedDept.id,
      laboratory_id: savedLab.id,
      source: CapabilitySource.OFFICIAL_WEBSITE,
      verification_status: VerificationStatus.VERIFIED,
      confidence_score: 0.95,
      evidence_summary: 'Accredited Smart Systems Lab, DST grant project on rural water sensing',
    });
    const savedInstCap = await instCapRepo.save(instCap);

    // Audit verification record
    await verifRepo.save(
      verifRepo.create({
        entity_type: 'INSTITUTION_CAPABILITY',
        entity_id: savedInstCap.id,
        verification_status: VerificationStatus.VERIFIED,
        verification_source: 'OFFICIAL_WEBSITE',
        verified_by: adminUser.id,
        verified_at: new Date(),
        notes: 'Verified against university laboratory registry portal',
      })
    );
    console.log('✅ Seeded demo institution with departments, lab, and verified capability');
  }

  // 5b. Seed / Ensure Birla Institute of Technology, Mesra & Dean user
  let bitMesra = await orgRepo.findOne({ where: { name: 'Birla Institute of Technology, Mesra' } });
  if (!bitMesra) {
    bitMesra = orgRepo.create({
      name: 'Birla Institute of Technology, Mesra',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Premier technical and research university in Mesra, Ranchi, specializing in environmental engineering, remote sensing, AI/ML, and water quality systems.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.bitmesra.ac.in',
      email: 'dean.research@bitmesra.ac.in',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
      available_capacity: 5,
      availability_status: 'AVAILABLE',
    });
    bitMesra = await orgRepo.save(bitMesra);
  } else {
    bitMesra.verification_status = VerificationStatus.VERIFIED;
    bitMesra.is_claimed = true;
    bitMesra.district = 'Ranchi';
    bitMesra.state = 'Jharkhand';
    bitMesra.available_capacity = 5;
    bitMesra.availability_status = 'AVAILABLE';
    bitMesra = await orgRepo.save(bitMesra);
  }

  // Ensure BIT Profile & Capabilities
  let bitProfile = await instProfileRepo.findOne({ where: { organization_id: bitMesra.id } });
  if (!bitProfile) {
    bitProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: bitMesra.id,
        institution_code: 'BIT-MES-001',
        institution_category: 'Institute of Technology / Deemed University',
        established_year: 1955,
      }),
    );
  }

  let bitDept = await deptRepo.findOne({ where: { institution_id: bitProfile.id, code: 'CSE' } });
  if (!bitDept) {
    bitDept = await deptRepo.save(
      deptRepo.create({
        institution_id: bitProfile.id,
        name: 'Department of Computer Science & Environmental Systems',
        code: 'CSE',
      }),
    );
  }

  let bitLab = await labRepo.findOne({
    where: { institution_id: bitProfile.id, name: 'Water Quality & AI Diagnostic Lab' },
  });
  if (!bitLab) {
    await labRepo.save(
      labRepo.create({
        institution_id: bitProfile.id,
        department_id: bitDept.id,
        name: 'Water Quality & AI Diagnostic Lab',
        description: 'Spectrophotometry, environmental telemetry, and water contamination monitoring sensors.',
      }),
    );
  }

  // Link capabilities for BIT Mesra
  for (const capKey of ['water-management', 'iot', 'ai-ml', 'gis']) {
    if (savedCapabilities[capKey]) {
      const existsCap = await instCapRepo.findOne({
        where: { institution_id: bitProfile.id, capability_id: savedCapabilities[capKey].id },
      });
      if (!existsCap) {
        await instCapRepo.save(
          instCapRepo.create({
            institution_id: bitProfile.id,
            capability_id: savedCapabilities[capKey].id,
            department_id: bitDept.id,
            source: CapabilitySource.ORGANIZATION_PROVIDED,
            verification_status: VerificationStatus.VERIFIED,
            confidence_score: 0.95,
            evidence_summary: 'Accredited Environmental Systems and Water Quality Analytical Facility',
          }),
        );
      }
    }
  }

  // Seed Dean of BIT Mesra user (dean@bitmesra.ac.in / BitMesra123!)
  const bitDeanHash = await bcrypt.hash('BitMesra123!', 10);
  let bitDeanUser = await userRepo.findOne({ where: { email: 'dean@bitmesra.ac.in' } });
  if (!bitDeanUser) {
    bitDeanUser = userRepo.create({
      name: 'Prof. Ananya Sen (Dean of Research, BIT Mesra)',
      email: 'dean@bitmesra.ac.in',
      password_hash: bitDeanHash,
      role: UserRole.UNIVERSITY_ADMIN,
      organization_id: bitMesra.id,
      is_active: true,
      phone: '+91-651-2275444',
    });
    bitDeanUser = await userRepo.save(bitDeanUser);
    console.log('✅ Seeded demo institutional user (dean@bitmesra.ac.in / BitMesra123!)');
  } else {
    bitDeanUser.password_hash = bitDeanHash;
    bitDeanUser.organization_id = bitMesra.id;
    bitDeanUser.role = UserRole.UNIVERSITY_ADMIN;
    bitDeanUser = await userRepo.save(bitDeanUser);
    console.log('✅ Updated demo institutional user (dean@bitmesra.ac.in / BitMesra123!)');
  }

  // Ensure active OrganizationMembership
  const memberRepo = AppDataSource.getRepository(OrganizationMembership);
  let bitMembership = await memberRepo.findOne({
    where: { user_id: bitDeanUser.id, organization_id: bitMesra.id },
  });
  if (!bitMembership) {
    await memberRepo.save(
      memberRepo.create({
        user_id: bitDeanUser.id,
        organization_id: bitMesra.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );
    console.log('✅ Linked BIT Mesra Dean OrganizationMembership');
  }

  // 5c. Seed / Ensure Primary Showcase University: National Institute of Technology, Jamshedpur (NIT Jamshedpur)
  let nitJamshedpur = await orgRepo.findOne({ where: { name: 'National Institute of Technology, Jamshedpur' } });
  if (!nitJamshedpur) {
    nitJamshedpur = orgRepo.create({
      name: 'National Institute of Technology, Jamshedpur',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Premier Institute of National Importance in Adityapur, Jamshedpur, specializing in electrical engineering, smart microgrids, environmental telemetry, and advanced robotics.',
      district: 'East Singhbhum',
      state: 'Jharkhand',
      website: 'https://www.nitjsr.ac.in',
      email: 'dean.research@nitjsr.ac.in',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
      available_capacity: 6,
      availability_status: 'AVAILABLE',
    });
    nitJamshedpur = await orgRepo.save(nitJamshedpur);
  }

  let nitProfile = await instProfileRepo.findOne({ where: { organization_id: nitJamshedpur.id } });
  if (!nitProfile) {
    nitProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: nitJamshedpur.id,
        institution_code: 'NIT-JSR-001',
        institution_category: 'Institute of National Importance',
        established_year: 1960,
      }),
    );
  }

  let nitDept = await deptRepo.findOne({ where: { institution_id: nitProfile.id, code: 'EED' } });
  if (!nitDept) {
    nitDept = await deptRepo.save(
      deptRepo.create({
        institution_id: nitProfile.id,
        name: 'Department of Electrical Engineering',
        code: 'EED',
      }),
    );
  }

  let nitLab = await labRepo.findOne({
    where: { institution_id: nitProfile.id, name: 'Smart Microgrid & Clean Energy Systems Lab' },
  });
  if (!nitLab) {
    await labRepo.save(
      labRepo.create({
        institution_id: nitProfile.id,
        department_id: nitDept.id,
        name: 'Smart Microgrid & Clean Energy Systems Lab',
        description: 'Advanced real-time digital power simulator and PV-biomass microgrid stabilization testbed.',
      }),
    );
  }

  // Link capabilities for NIT Jamshedpur
  for (const capKey of ['water-management', 'iot', 'ai-ml', 'gis']) {
    if (savedCapabilities[capKey]) {
      const existsCap = await instCapRepo.findOne({
        where: { institution_id: nitProfile.id, capability_id: savedCapabilities[capKey].id },
      });
      if (!existsCap) {
        await instCapRepo.save(
          instCapRepo.create({
            institution_id: nitProfile.id,
            capability_id: savedCapabilities[capKey].id,
            department_id: nitDept.id,
            source: CapabilitySource.ORGANIZATION_PROVIDED,
            verification_status: VerificationStatus.VERIFIED,
            confidence_score: 0.95,
            evidence_summary: 'Accredited NIT Jamshedpur National R&D Facility',
          }),
        );
      }
    }
  }

  // Seed Dean of NIT Jamshedpur user (dean@nitjsr.ac.in / NitJsr123!)
  const nitDeanHash = await bcrypt.hash('NitJsr123!', 10);
  let nitDeanUser = await userRepo.findOne({ where: { email: 'dean@nitjsr.ac.in' } });
  if (!nitDeanUser) {
    nitDeanUser = userRepo.create({
      name: 'Prof. Rajeshwar Kumar (Dean of R&C, NIT Jamshedpur)',
      email: 'dean@nitjsr.ac.in',
      password_hash: nitDeanHash,
      role: UserRole.UNIVERSITY_ADMIN,
      organization_id: nitJamshedpur.id,
      is_active: true,
      phone: '+91-657-2282231',
    });
    nitDeanUser = await userRepo.save(nitDeanUser);
    console.log('✅ Seeded demo showcase university user (dean@nitjsr.ac.in / NitJsr123!)');
  } else {
    nitDeanUser.password_hash = nitDeanHash;
    nitDeanUser.organization_id = nitJamshedpur.id;
    nitDeanUser.role = UserRole.UNIVERSITY_ADMIN;
    nitDeanUser = await userRepo.save(nitDeanUser);
    console.log('✅ Updated demo showcase university user (dean@nitjsr.ac.in / NitJsr123!)');
  }

  let nitMembership = await memberRepo.findOne({
    where: { user_id: nitDeanUser.id, organization_id: nitJamshedpur.id },
  });
  if (!nitMembership) {
    await memberRepo.save(
      memberRepo.create({
        user_id: nitDeanUser.id,
        organization_id: nitJamshedpur.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );
    console.log('✅ Linked NIT Jamshedpur Dean OrganizationMembership');
  }

  // 6. Seed 1 Demo Industry Partner (clearly marked as dev demo)
  let demoIndOrg = await orgRepo.findOne({ where: { name: '[DEV-DEMO] Demo CleanTech Solutions' } });
  if (!demoIndOrg) {
    demoIndOrg = orgRepo.create({
      name: '[DEV-DEMO] Demo CleanTech Solutions',
      organization_type: OrganizationType.INDUSTRY,
      description: 'Development test industry partner profile.',
      district: 'Jamshedpur',
      state: 'Jharkhand',
      verification_status: VerificationStatus.VERIFIED,
      verification_source: 'ORGANIZATION_PROVIDED',
      verified_at: new Date(),
      is_claimed: true,
      claimed_at: new Date(),
      is_demo: true,
      geographic_reach: GeographicReach.DISTRICT,
    });
    demoIndOrg = await orgRepo.save(demoIndOrg);

    const indProfile = indProfileRepo.create({
      organization_id: demoIndOrg.id,
      company_registration_number: 'DEV-CIN-2024-999',
      industry_type: 'MSME',
      headquarters: 'Jamshedpur',
    });
    const savedIndProfile = await indProfileRepo.save(indProfile);

    // Link capability with support type
    const indCap = indCapRepo.create({
      industry_id: savedIndProfile.id,
      capability_id: savedCapabilities['water-management'].id,
      support_type_id: savedSupportTypes[IndustrySupportCode.PROTOTYPING]?.id,
      source: CapabilitySource.ORGANIZATION_PROVIDED,
      verification_status: VerificationStatus.VERIFIED,
      confidence_score: 0.90,
      notes: 'Offers pilot filter test rigs and water sensor calibration',
    });
    await indCapRepo.save(indCap);
    console.log('✅ Seeded demo industry partner with verified capability');
  }

  console.log('✨ Minimal development seed complete.');
}

if (require.main === module) {
  runDevSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Dev seed failed:', err);
      process.exit(1);
    });
}
