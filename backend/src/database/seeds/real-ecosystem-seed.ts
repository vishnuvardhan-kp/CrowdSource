import { AppDataSource } from '../data-source';
import {
  Organization,
  Capability,
  InstitutionProfile,
  Department,
  Laboratory,
  ResearchArea,
  InstitutionCapability,
  IndustryProfile,
  IndustrySupportType,
  IndustryCapability,
  User,
  OrganizationMembership,
  District,
} from '../entities';
import {
  OrganizationType,
  GeographicReach,
  VerificationStatus,
  CapabilitySource,
  IndustrySupportCode,
  UserRole,
  OrganizationRole,
  MembershipStatus,
  JurisdictionScope,
} from '../../common/enums';
import * as bcrypt from 'bcryptjs';

export async function runRealEcosystemSeed() {
  console.log('🏛️ Seeding REAL Jharkhand ecosystem organizations and institutions...');

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const orgRepo = AppDataSource.getRepository(Organization);
  const capRepo = AppDataSource.getRepository(Capability);
  const instProfileRepo = AppDataSource.getRepository(InstitutionProfile);
  const deptRepo = AppDataSource.getRepository(Department);
  const labRepo = AppDataSource.getRepository(Laboratory);
  const researchAreaRepo = AppDataSource.getRepository(ResearchArea);
  const instCapRepo = AppDataSource.getRepository(InstitutionCapability);
  const indProfileRepo = AppDataSource.getRepository(IndustryProfile);
  const supportTypeRepo = AppDataSource.getRepository(IndustrySupportType);
  const indCapRepo = AppDataSource.getRepository(IndustryCapability);
  const userRepo = AppDataSource.getRepository(User);
  const membershipRepo = AppDataSource.getRepository(OrganizationMembership);

  // Helper to find capability by name or slug
  const findCap = async (name: string) => {
    return capRepo.findOne({
      where: [{ name }, { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }],
    });
  };

  // Helper to find support type
  const findSupport = async (code: IndustrySupportCode) => {
    return supportTypeRepo.findOne({ where: { code } });
  };

  // -------------------------------------------------------------
  // 1. Birsa Agricultural University (BAU) - STATEWIDE HEI
  // -------------------------------------------------------------
  let bau = await orgRepo.findOne({ where: { name: 'Birsa Agricultural University' } });
  if (!bau) {
    bau = orgRepo.create({
      name: 'Birsa Agricultural University',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.STATEWIDE,
      is_demo: false,
      description:
        'Premier state agricultural university in Kanke, Ranchi, dedicated to agricultural research, crop health diagnostics, soil science, and rural development across Jharkhand.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.bauranchi.org',
      email: 'registrar@bauranchi.org',
      phone: '+91-651-2450832',
      address: 'Kanke, Ranchi, Jharkhand 834006',
      verification_status: VerificationStatus.UNVERIFIED,
      is_claimed: false,
      available_capacity: 4,
      availability_status: 'UNKNOWN',
    });
    bau = await orgRepo.save(bau);

    const bauProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: bau.id,
        institution_code: 'BAU-RAN-001',
        institution_category: 'State Agricultural University',
        established_year: 1981,
      }),
    );

    const agronomyDept = await deptRepo.save(
      deptRepo.create({
        institution_id: bauProfile.id,
        name: 'Department of Agronomy',
        code: 'AGRO',
      }),
    );

    const soilDept = await deptRepo.save(
      deptRepo.create({
        institution_id: bauProfile.id,
        name: 'Department of Soil Science & Agricultural Chemistry',
        code: 'SOIL',
      }),
    );

    const plantPathDept = await deptRepo.save(
      deptRepo.create({
        institution_id: bauProfile.id,
        name: 'Department of Plant Pathology',
        code: 'PLPATH',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: bauProfile.id,
        name: 'Plant Disease Diagnostic & Bio-control Lab',
        description: 'Microscopic and molecular diagnosis of fungal, bacterial, and viral crop diseases.',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: bauProfile.id,
        name: 'Soil Health Testing & Micronutrient Analysis Facility',
        description: 'Comprehensive soil profiling and nutritional assessment laboratory.',
      }),
    );

    await researchAreaRepo.save(
      researchAreaRepo.create({
        institution_id: bauProfile.id,
        title: 'Integrated Pest and Disease Containment for Smallholder Farmers',
        description: 'Field diagnostic protocols and biocontrol interventions for regional crops.',
      }),
    );

    // Link capabilities
    const soilCap = await findCap('Soil Science & Agronomy') || await findCap('Water Quality & Resource Management');
    const iotCap = await findCap('Internet of Things (IoT)');
    const aiCap = await findCap('Artificial Intelligence & Machine Learning');

    if (soilCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: bauProfile.id,
          capability_id: soilCap.id,
          department_id: soilDept.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
          evidence_summary: 'Sourced from BAU public annual research bulletins.',
        }),
      );
    }
    if (iotCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: bauProfile.id,
          capability_id: iotCap.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    if (aiCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: bauProfile.id,
          capability_id: aiCap.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    console.log('  ✅ Seeded Birsa Agricultural University (STATEWIDE)');
  }

  // -------------------------------------------------------------
  // 2. BIT Mesra - NATIONAL HEI
  // -------------------------------------------------------------
  let bitMesra = await orgRepo.findOne({ where: { name: 'Birla Institute of Technology, Mesra' } });
  if (!bitMesra) {
    bitMesra = orgRepo.create({
      name: 'Birla Institute of Technology, Mesra',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Premier institute of engineering and research in Mesra, Ranchi, with excellence in computer vision, robotics, GIS/remote sensing, and environmental engineering.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.bitmesra.ac.in',
      email: 'dean.research@bitmesra.ac.in',
      phone: '+91-651-2275444',
      address: 'Mesra, Ranchi, Jharkhand 835215',
      verification_status: VerificationStatus.UNVERIFIED,
      is_claimed: false,
      available_capacity: 5,
      availability_status: 'UNKNOWN',
    });
    bitMesra = await orgRepo.save(bitMesra);

    const bitProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: bitMesra.id,
        institution_code: 'BIT-MES-001',
        institution_category: 'Deemed University / Institute of Technology',
        established_year: 1955,
      }),
    );

    const csDept = await deptRepo.save(
      deptRepo.create({
        institution_id: bitProfile.id,
        name: 'Department of Computer Science & Engineering',
        code: 'CSE',
      }),
    );

    const rsDept = await deptRepo.save(
      deptRepo.create({
        institution_id: bitProfile.id,
        name: 'Department of Remote Sensing',
        code: 'RS',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: bitProfile.id,
        name: 'Artificial Intelligence & Computer Vision Laboratory',
        description: 'High-performance GPU cluster for image processing and edge diagnostic models.',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: bitProfile.id,
        name: 'Geospatial Analytics & Hydrology Mapping Lab',
        description: 'Satellite imagery analysis and GIS-based watershed tracking.',
      }),
    );

    await researchAreaRepo.save(
      researchAreaRepo.create({
        institution_id: bitProfile.id,
        title: 'Deep Learning Diagnostics for Edge Agricultural Surveillance',
        description: 'On-device neural network architectures for field diagnostic devices.',
      }),
    );

    const aiCap = await findCap('Artificial Intelligence & Machine Learning');
    const gisCap = await findCap('Geographic Information Systems (GIS)');
    const iotCap = await findCap('Internet of Things (IoT)');

    if (aiCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: bitProfile.id,
          capability_id: aiCap.id,
          department_id: csDept.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    if (gisCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: bitProfile.id,
          capability_id: gisCap.id,
          department_id: rsDept.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    if (iotCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: bitProfile.id,
          capability_id: iotCap.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    console.log('  ✅ Seeded BIT Mesra (NATIONAL)');
  }

  // -------------------------------------------------------------
  // 3. IIT (ISM) Dhanbad - NATIONAL HEI
  // -------------------------------------------------------------
  let iitDhanbad = await orgRepo.findOne({ where: { name: 'Indian Institute of Technology (ISM) Dhanbad' } });
  if (!iitDhanbad) {
    iitDhanbad = orgRepo.create({
      name: 'Indian Institute of Technology (ISM) Dhanbad',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Institute of National Importance in Dhanbad, renowned for earth sciences, environmental engineering, groundwater hydrology, water resource sustainability, and AI/IoT systems.',
      district: 'Dhanbad',
      state: 'Jharkhand',
      website: 'https://www.iitism.ac.in',
      email: 'dean_rnd@iitism.ac.in',
      phone: '+91-326-2235001',
      address: 'Police Line, Sardar Patel Nagar, Dhanbad, Jharkhand 826004',
      verification_status: VerificationStatus.UNVERIFIED,
      is_claimed: false,
      available_capacity: 5,
      availability_status: 'UNKNOWN',
    });
    iitDhanbad = await orgRepo.save(iitDhanbad);

    const iitProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: iitDhanbad.id,
        institution_code: 'IIT-ISM-001',
        institution_category: 'Institute of National Importance',
        established_year: 1926,
      }),
    );

    const envDept = await deptRepo.save(
      deptRepo.create({
        institution_id: iitProfile.id,
        name: 'Department of Environmental Science & Engineering',
        code: 'ESE',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: iitProfile.id,
        name: 'Water Quality & Remediation Analytical Facility',
        description: 'Advanced ICP-MS and spectrophotometry for heavy metal and contaminant detection in drinking water.',
      }),
    );

    await researchAreaRepo.save(
      researchAreaRepo.create({
        institution_id: iitProfile.id,
        title: 'Community Scale Groundwater Filtration & Fluoride/Arsenic Mitigation',
        description: 'Sustainable low-cost adsorbents for village-level clean water provision.',
      }),
    );

    const waterCap = await findCap('Water Quality & Resource Management');
    const iotCap = await findCap('Internet of Things (IoT)');

    if (waterCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: iitProfile.id,
          capability_id: waterCap.id,
          department_id: envDept.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    if (iotCap) {
      await instCapRepo.save(
        instCapRepo.create({
          institution_id: iitProfile.id,
          capability_id: iotCap.id,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    console.log('  ✅ Seeded IIT (ISM) Dhanbad (NATIONAL)');
  }

  // -------------------------------------------------------------
  // 3b. National Institute of Technology, Jamshedpur - NATIONAL HEI
  // -------------------------------------------------------------
  let nitJsr = await orgRepo.findOne({ where: { name: 'National Institute of Technology, Jamshedpur' } });
  if (!nitJsr) {
    nitJsr = orgRepo.create({
      name: 'National Institute of Technology, Jamshedpur',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Premier Institute of National Importance in Adityapur, Jamshedpur, specializing in electrical engineering, smart microgrids, power telemetry, and IoT sensor systems.',
      district: 'East Singhbhum',
      state: 'Jharkhand',
      website: 'https://www.nitjsr.ac.in',
      email: 'dean.research@nitjsr.ac.in',
      phone: '+91-657-2282231',
      address: 'Adityapur, Jamshedpur, East Singhbhum, Jharkhand 831014',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
      available_capacity: 5,
      availability_status: 'AVAILABLE',
    });
    nitJsr = await orgRepo.save(nitJsr);

    const nitProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: nitJsr.id,
        institution_code: 'NIT-JSR-001',
        institution_category: 'Institute of National Importance',
        established_year: 1960,
      }),
    );

    const eeDept = await deptRepo.save(
      deptRepo.create({
        institution_id: nitProfile.id,
        name: 'Department of Electrical Engineering',
        code: 'EED',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: nitProfile.id,
        name: 'Smart Microgrid & Clean Energy Systems Lab',
        description: 'Advanced real-time digital power simulator and PV-biomass microgrid stabilization testbed.',
      }),
    );
    console.log('  ✅ Seeded NIT Jamshedpur (NATIONAL)');
  }

  // -------------------------------------------------------------
  // 3c. Central University of Jharkhand, Ranchi - CENTRAL HEI
  // -------------------------------------------------------------
  let cuj = await orgRepo.findOne({ where: { name: 'Central University of Jharkhand, Ranchi' } });
  if (!cuj) {
    cuj = orgRepo.create({
      name: 'Central University of Jharkhand, Ranchi',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Central university located in Brambe/Cheri-Manatu, Ranchi, leading research in tribal development, indigenous health, vernacular education, and decentralized renewable energy.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.cuj.ac.in',
      email: 'rnd@cuj.ac.in',
      phone: '+91-651-2451000',
      address: 'Cheri-Manatu, Kanke, Ranchi, Jharkhand 835222',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
      available_capacity: 5,
      availability_status: 'AVAILABLE',
    });
    cuj = await orgRepo.save(cuj);

    const cujProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: cuj.id,
        institution_code: 'CUJ-RAN-001',
        institution_category: 'Central University',
        established_year: 2009,
      }),
    );

    const ruralDept = await deptRepo.save(
      deptRepo.create({
        institution_id: cujProfile.id,
        name: 'Department of Rural & Tribal Development',
        code: 'RTD',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: cujProfile.id,
        name: 'Indigenous Community Health & Vernacular Pedagogy Lab',
        description: 'Translational field laboratory for tribal health telemetry and bilingual learning tools.',
      }),
    );
    console.log('  ✅ Seeded Central University of Jharkhand, Ranchi (NATIONAL)');
  }

  // -------------------------------------------------------------
  // 3d. Ranchi University - STATE HEI
  // -------------------------------------------------------------
  let ru = await orgRepo.findOne({ where: { name: 'Ranchi University' } });
  if (!ru) {
    ru = orgRepo.create({
      name: 'Ranchi University',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.STATEWIDE,
      is_demo: false,
      description:
        'Pioneering public state university in Ranchi with extensive community outreach in urban waste segregation, rural livelihood studies, public health, and environmental conservation.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.ranchiuniversity.ac.in',
      email: 'registrar@ranchiuniversity.ac.in',
      phone: '+91-651-2205177',
      address: 'Shaheed Chowk, Ranchi, Jharkhand 834001',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
      available_capacity: 5,
      availability_status: 'AVAILABLE',
    });
    ru = await orgRepo.save(ru);

    const ruProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: ru.id,
        institution_code: 'RU-RAN-001',
        institution_category: 'State Public University',
        established_year: 1960,
      }),
    );

    const envDept = await deptRepo.save(
      deptRepo.create({
        institution_id: ruProfile.id,
        name: 'Department of Environmental Sciences & Waste Management',
        code: 'ESWM',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: ruProfile.id,
        name: 'Urban Ecology & Municipal Waste Upcycling Lab',
        description: 'Resource recovery and biological composting experimental facility.',
      }),
    );
    console.log('  ✅ Seeded Ranchi University (STATEWIDE)');
  }

  // -------------------------------------------------------------
  // 3e. IIIT Ranchi - NATIONAL HEI
  // -------------------------------------------------------------
  let iiitRanchi = await orgRepo.findOne({ where: { name: 'IIIT Ranchi' } });
  if (!iiitRanchi) {
    iiitRanchi = orgRepo.create({
      name: 'IIIT Ranchi',
      organization_type: OrganizationType.INSTITUTION,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Institute of National Importance in Ranchi specializing in artificial intelligence, machine learning, data engineering, computer vision, and digital governance architectures.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.iiitranchi.ac.in',
      email: 'dean.academic@iiitranchi.ac.in',
      phone: '+91-651-2233001',
      address: 'Namkum, Ranchi, Jharkhand 834010',
      verification_status: VerificationStatus.VERIFIED,
      is_claimed: true,
      available_capacity: 5,
      availability_status: 'AVAILABLE',
    });
    iiitRanchi = await orgRepo.save(iiitRanchi);

    const iiitProfile = await instProfileRepo.save(
      instProfileRepo.create({
        organization_id: iiitRanchi.id,
        institution_code: 'IIIT-RAN-001',
        institution_category: 'Institute of National Importance',
        established_year: 2016,
      }),
    );

    const aiDept = await deptRepo.save(
      deptRepo.create({
        institution_id: iiitProfile.id,
        name: 'Department of Artificial Intelligence & Data Science',
        code: 'AIDS',
      }),
    );

    await labRepo.save(
      labRepo.create({
        institution_id: iiitProfile.id,
        name: 'Civic Intelligence & Machine Vision Lab',
        description: 'GPU-accelerated models for infrastructure defect detection and geospatial problem clustering.',
      }),
    );
    console.log('  ✅ Seeded IIIT Ranchi (NATIONAL)');
  }

  // -------------------------------------------------------------
  // 4. Tata Steel Limited - NATIONAL INDUSTRY
  // -------------------------------------------------------------
  let tataSteel = await orgRepo.findOne({ where: { name: 'Tata Steel Limited' } });
  if (!tataSteel) {
    tataSteel = orgRepo.create({
      name: 'Tata Steel Limited',
      organization_type: OrganizationType.INDUSTRY,
      geographic_reach: GeographicReach.NATIONAL,
      is_demo: false,
      description:
        'Major multinational industrial enterprise operating extensive manufacturing, research, and CSR innovation hubs in Jamshedpur, East Singhbhum.',
      district: 'East Singhbhum',
      state: 'Jharkhand',
      website: 'https://www.tatasteel.com',
      email: 'csr.jharkhand@tatasteel.com',
      phone: '+91-657-2426000',
      address: 'Bistupur, Jamshedpur, East Singhbhum, Jharkhand 831001',
      verification_status: VerificationStatus.UNVERIFIED,
      is_claimed: false,
      available_capacity: 4,
      availability_status: 'UNKNOWN',
    });
    tataSteel = await orgRepo.save(tataSteel);

    const indProfile = await indProfileRepo.save(
      indProfileRepo.create({
        organization_id: tataSteel.id,
        industry_type: 'Heavy Manufacturing & Metallurgy',
        company_registration_number: 'L27100MH1907PLC000260',
        headquarters: 'Jamshedpur / Mumbai',
      }),
    );

    const fundingSupport = await findSupport(IndustrySupportCode.FUNDING);
    const protoSupport = await findSupport(IndustrySupportCode.PROTOTYPING);
    const mfgSupport = await findSupport(IndustrySupportCode.MANUFACTURING);
    const hardwareCap = await findCap('Embedded Systems & Hardware');
    const waterCap = await findCap('Water Quality & Resource Management');

    if (hardwareCap) {
      await indCapRepo.save(
        indCapRepo.create({
          industry_id: indProfile.id,
          capability_id: hardwareCap.id,
          support_type_id: protoSupport?.id || null,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
          notes: 'Prototyping fabrication and mechanical tooling support.',
        }),
      );
    }
    if (waterCap) {
      await indCapRepo.save(
        indCapRepo.create({
          industry_id: indProfile.id,
          capability_id: waterCap.id,
          support_type_id: fundingSupport?.id || null,
          source: CapabilitySource.PUBLIC_DATA,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
          notes: 'CSR water infrastructure funding and watershed deployment.',
        }),
      );
    }
    console.log('  ✅ Seeded Tata Steel Limited (NATIONAL)');
  }

  // -------------------------------------------------------------
  // 5. AgroGreen Solutions Private Limited - DISTRICT STARTUP/MSME
  // -------------------------------------------------------------
  let agroGreen = await orgRepo.findOne({ where: { name: 'AgroGreen Solutions Private Limited' } });
  if (!agroGreen) {
    agroGreen = orgRepo.create({
      name: 'AgroGreen Solutions Private Limited',
      organization_type: OrganizationType.INDUSTRY,
      geographic_reach: GeographicReach.DISTRICT,
      is_demo: false,
      description:
        'Jharkhand AgriTech startup developing mobile-based crop disease containment apps, field sensors, and cold-chain monitoring devices for local farmer collectives.',
      district: 'Ranchi',
      state: 'Jharkhand',
      website: 'https://www.agrogreenjh.example.com',
      email: 'contact@agrogreenjh.example.com',
      phone: '+91-651-7788990',
      address: 'Lalpur, Ranchi, Jharkhand 834001',
      verification_status: VerificationStatus.UNVERIFIED,
      is_claimed: false,
      available_capacity: 2,
      availability_status: 'UNKNOWN',
    });
    agroGreen = await orgRepo.save(agroGreen);

    const indProfile = await indProfileRepo.save(
      indProfileRepo.create({
        organization_id: agroGreen.id,
        industry_type: 'AgriTech Startup',
        company_registration_number: 'U01100JH2022PTC018900',
        headquarters: 'Ranchi',
      }),
    );

    const pilotSupport = await findSupport(IndustrySupportCode.PILOT_DEPLOYMENT);
    const aiCap = await findCap('Artificial Intelligence & Machine Learning');
    const iotCap = await findCap('Internet of Things (IoT)');

    if (aiCap) {
      await indCapRepo.save(
        indCapRepo.create({
          industry_id: indProfile.id,
          capability_id: aiCap.id,
          support_type_id: pilotSupport?.id || null,
          source: CapabilitySource.ORGANIZATION_PROVIDED,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
          notes: 'Mobile app deployment for farmer crop photo scanning.',
        }),
      );
    }
    if (iotCap) {
      await indCapRepo.save(
        indCapRepo.create({
          industry_id: indProfile.id,
          capability_id: iotCap.id,
          source: CapabilitySource.ORGANIZATION_PROVIDED,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
        }),
      );
    }
    console.log('  ✅ Seeded AgroGreen Solutions Pvt Ltd (DISTRICT)');
  }

  // -------------------------------------------------------------
  // 6. JalShuddhi Innovations - DISTRICT STARTUP/MSME
  // -------------------------------------------------------------
  let jalShuddhi = await orgRepo.findOne({ where: { name: 'JalShuddhi Innovations' } });
  if (!jalShuddhi) {
    jalShuddhi = orgRepo.create({
      name: 'JalShuddhi Innovations',
      organization_type: OrganizationType.INDUSTRY,
      geographic_reach: GeographicReach.DISTRICT,
      is_demo: false,
      description:
        'Dhanbad-based clean water startup developing gravity-fed biological sand filters and low-cost solar chlorination devices for peri-urban and mining belt settlements.',
      district: 'Dhanbad',
      state: 'Jharkhand',
      website: 'https://www.jalshuddhi.example.com',
      email: 'innovations@jalshuddhi.example.com',
      phone: '+91-326-8899001',
      address: 'Saraidhela, Dhanbad, Jharkhand 828127',
      verification_status: VerificationStatus.UNVERIFIED,
      is_claimed: false,
      available_capacity: 2,
      availability_status: 'UNKNOWN',
    });
    jalShuddhi = await orgRepo.save(jalShuddhi);

    const indProfile = await indProfileRepo.save(
      indProfileRepo.create({
        organization_id: jalShuddhi.id,
        industry_type: 'CleanTech & Water Treatment Startup',
        company_registration_number: 'U74999JH2023PTC019876',
        headquarters: 'Dhanbad',
      }),
    );

    const testSupport = await findSupport(IndustrySupportCode.TESTING);
    const waterCap = await findCap('Water Quality & Resource Management');

    if (waterCap) {
      await indCapRepo.save(
        indCapRepo.create({
          industry_id: indProfile.id,
          capability_id: waterCap.id,
          support_type_id: testSupport?.id || null,
          source: CapabilitySource.ORGANIZATION_PROVIDED,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.50,
          notes: 'Field testing of community water purifiers in fluorosis-affected pockets.',
        }),
      );
    }
    console.log('  ✅ Seeded JalShuddhi Innovations (DISTRICT)');
  }

  // -------------------------------------------------------------
  // 7. Seed Standard Demo Role Accounts for UI Evaluation
  // -------------------------------------------------------------
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const officerPasswordHash = await bcrypt.hash('Officer123!', 10);

  // A. Citizen
  let citizen = await userRepo.findOne({ where: { email: 'citizen@example.com' } });
  if (!citizen) {
    citizen = userRepo.create({
      name: 'Aarav Verma (Citizen Innovator)',
      email: 'citizen@example.com',
      password_hash: defaultPasswordHash,
      role: UserRole.CITIZEN,
      phone: '+91-9876543210',
      is_active: true,
    });
    await userRepo.save(citizen);
    console.log('  ✅ Seeded Citizen (citizen@example.com / Password123!)');
  }

  // B. University Admin (BAU)
  let bauAdmin = await userRepo.findOne({ where: { email: 'admin@bau.ac.in' } });
  if (!bauAdmin) {
    bauAdmin = userRepo.create({
      name: 'Dr. S. K. Roy (BAU Dean of Research)',
      email: 'admin@bau.ac.in',
      password_hash: defaultPasswordHash,
      role: UserRole.UNIVERSITY_ADMIN,
      phone: '+91-651-2450832',
      is_active: true,
    });
    bauAdmin = await userRepo.save(bauAdmin);
    console.log('  ✅ Seeded University Admin (admin@bau.ac.in / Password123!)');
  }

  // Link BAU Membership
  const existingBauMem = await membershipRepo.findOne({
    where: { user_id: bauAdmin.id, organization_id: bau.id },
  });
  if (!existingBauMem) {
    await membershipRepo.save(
      membershipRepo.create({
        user_id: bauAdmin.id,
        organization_id: bau.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );
    bau.is_claimed = true;
    await orgRepo.save(bau);
    console.log('  ✅ Linked BAU Admin Membership & marked BAU claimed');
  }

  // C. Industry Admin (Tata Steel)
  let tataAdmin = await userRepo.findOne({ where: { email: 'admin@tatasteel.com' } });
  if (!tataAdmin) {
    tataAdmin = userRepo.create({
      name: 'Rajesh Mukherjee (Tata Steel Sustainability Lead)',
      email: 'admin@tatasteel.com',
      password_hash: defaultPasswordHash,
      role: UserRole.INDUSTRY_ADMIN,
      phone: '+91-657-6644332',
      is_active: true,
    });
    tataAdmin = await userRepo.save(tataAdmin);
    console.log('  ✅ Seeded Industry Admin (admin@tatasteel.com / Password123!)');
  }

  // Link Tata Steel Membership
  const existingTataMem = await membershipRepo.findOne({
    where: { user_id: tataAdmin.id, organization_id: tataSteel.id },
  });
  if (!existingTataMem) {
    await membershipRepo.save(
      membershipRepo.create({
        user_id: tataAdmin.id,
        organization_id: tataSteel.id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );
    tataSteel.is_claimed = true;
    await orgRepo.save(tataSteel);
    console.log('  ✅ Linked Tata Steel Admin Membership & marked Tata Steel claimed');
  }

  // D. Government Review Officer
  const distRepo = AppDataSource.getRepository(District);
  const ranchiDistrict = await distRepo.findOne({ where: { name: 'Ranchi' } });

  let govOfficer = await userRepo.findOne({ where: { email: 'officer@jharkhand.gov.in' } });
  if (!govOfficer) {
    govOfficer = userRepo.create({
      name: 'Anita Soren (District Technical Officer, Ranchi)',
      email: 'officer@jharkhand.gov.in',
      password_hash: officerPasswordHash,
      role: UserRole.GOVERNMENT_OFFICER,
      district_id: ranchiDistrict?.id,
      district: 'Ranchi',
      state: 'Jharkhand',
      jurisdiction_scope: JurisdictionScope.DISTRICT,
      phone: '+91-651-2200112',
      is_active: true,
    });
    await userRepo.save(govOfficer);
    console.log('  ✅ Seeded Government Officer (officer@jharkhand.gov.in / Officer123!)');
  } else {
    govOfficer.district_id = ranchiDistrict?.id;
    govOfficer.district = 'Ranchi';
    govOfficer.state = 'Jharkhand';
    govOfficer.jurisdiction_scope = JurisdictionScope.DISTRICT;
    await userRepo.save(govOfficer);
  }

  // E. Platform Admin
  let platAdmin = await userRepo.findOne({ where: { email: 'admin@samadhansetu.gov.in' } });
  if (!platAdmin) {
    platAdmin = userRepo.create({
      name: 'Platform Administrator',
      email: 'admin@samadhansetu.gov.in',
      password_hash: adminPasswordHash,
      role: UserRole.PLATFORM_ADMIN,
      phone: '+91-11-23000000',
      is_active: true,
    });
    await userRepo.save(platAdmin);
    console.log('  ✅ Seeded Platform Admin (admin@samadhansetu.gov.in / Admin123!)');
  }

  console.log('🎉 REAL Jharkhand ecosystem seeding completed successfully!');
}

// Execute standalone if invoked directly
if (require.main === module) {
  runRealEcosystemSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
