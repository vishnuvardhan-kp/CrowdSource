const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres_password',
  database: 'samadhan_setu',
});

// The 6 Real Higher-Education Institutions of Jharkhand
const INSTITUTIONS = [
  {
    key: 'NIT_JSR',
    name: 'National Institute of Technology, Jamshedpur',
    shortName: 'NIT Jamshedpur',
    district: 'East Singhbhum',
    state: 'Jharkhand',
    code: 'NIT-JSR-001',
    category: 'Institute of National Importance',
    estYear: 1960,
    website: 'https://www.nitjsr.ac.in',
    email: 'dean.research@nitjsr.ac.in',
    description: 'Premier Institute of National Importance in Adityapur, Jamshedpur, specializing in electrical engineering, smart microgrids, power telemetry, and IoT sensor systems.',
  },
  {
    key: 'IIT_ISM',
    name: 'IIT (ISM) Dhanbad',
    shortName: 'IIT (ISM) Dhanbad',
    district: 'Dhanbad',
    state: 'Jharkhand',
    code: 'IIT-ISM-001',
    category: 'Institute of National Importance',
    estYear: 1926,
    website: 'https://www.iitism.ac.in',
    email: 'dean_rnd@iitism.ac.in',
    description: 'Institute of National Importance in Dhanbad, renowned for earth sciences, environmental engineering, groundwater hydrology, mining waste remediation, and industrial dust suppression.',
  },
  {
    key: 'CUJ',
    name: 'Central University of Jharkhand, Ranchi',
    shortName: 'Central University of Jharkhand',
    district: 'Ranchi',
    state: 'Jharkhand',
    code: 'CUJ-RAN-001',
    category: 'Central University',
    estYear: 2009,
    website: 'https://www.cuj.ac.in',
    email: 'rnd@cuj.ac.in',
    description: 'Central university located in Brambe/Cheri-Manatu, Ranchi, leading research in tribal development, indigenous health, vernacular education, and decentralized renewable energy.',
  },
  {
    key: 'RU',
    name: 'Ranchi University',
    shortName: 'Ranchi University',
    district: 'Ranchi',
    state: 'Jharkhand',
    code: 'RU-RAN-001',
    category: 'State Public University',
    estYear: 1960,
    website: 'https://www.ranchiuniversity.ac.in',
    email: 'registrar@ranchiuniversity.ac.in',
    description: 'Pioneering public state university in Ranchi with extensive community outreach in urban waste segregation, rural livelihood studies, public health, and environmental conservation.',
  },
  {
    key: 'IIIT_RANCHI',
    name: 'IIIT Ranchi',
    shortName: 'IIIT Ranchi',
    district: 'Ranchi',
    state: 'Jharkhand',
    code: 'IIIT-RAN-001',
    category: 'Institute of National Importance',
    estYear: 2016,
    website: 'https://www.iiitranchi.ac.in',
    email: 'dean.academic@iiitranchi.ac.in',
    description: 'Institute of National Importance in Ranchi specializing in artificial intelligence, machine learning, data engineering, computer vision, and digital governance architectures.',
  },
  {
    key: 'BIT_MESRA',
    name: 'Birla Institute of Technology, Mesra',
    shortName: 'BIT Mesra',
    district: 'Ranchi',
    state: 'Jharkhand',
    code: 'BIT-MES-001',
    category: 'Deemed University / Institute of Technology',
    estYear: 1955,
    website: 'https://www.bitmesra.ac.in',
    email: 'dean.research@bitmesra.ac.in',
    description: 'Premier technical and research university in Mesra, Ranchi, specializing in geospatial analysis, environmental biotechnology, remote sensing, and water filtration systems.',
  },
];

// Rich Catalog of 38 Realistic Solution Blueprints (3-4 lines description each: 240-310 chars)
const BLUEPRINTS = {
  // Domain 1: NIT Jamshedpur (Power, Energy, Electrical Arc-faults, Telemetry, Water IoT)
  NIT_JSR: [
    {
      title: 'Smart Microgrid Solar Inverter Stabilization & Telemetry Unit',
      summary: 'Implement an intelligent inverter control and energy buffer unit that regulates voltage fluctuations in rural solar microgrids during sudden load shifts. The device prevents nuisance inverter trips and provides continuous remote battery state-of-charge telemetry to maintenance crews. A field testbed in an energy-deficit village can demonstrate uninterrupted power delivery over thirty continuous days.',
      approach: 'Dynamic reactive power injection algorithms paired with compact supercapacitor buffers and GSM telematics.',
    },
    {
      title: 'Smart Substation Arc-Fault Detection & Surge Protection System',
      summary: 'Install high-speed acoustic and optical sensor modules on distribution transformers to detect electrical arcing before catastrophic equipment failure occurs. The system triggers rapid circuit isolation and transmits emergency alerts to the nearest sub-divisional utility office. A pilot installation at the Kanke Road substation can validate trigger thresholds under peak load conditions.',
      approach: 'Dual-spectrum optical arc sensors combined with microsecond solid-state disconnect switches and cellular telemetry.',
    },
    {
      title: 'Community-Led Decentralized Water Quality Monitoring Sensor Network',
      summary: 'Develop a sensor-based monitoring network to track water quality and pipeline conditions in rural habitations. The system provides real-time alerts when abnormal contamination or pressure drops are detected. A low-cost prototype can be tested in selected villages before wider deployment across district water supply schemes.',
      approach: 'Electrochemical contaminant sensing nodes communicating over low-power wide-area mesh networks to a centralized district dashboard.',
    },
    {
      title: 'IoT Drinking Water Filtration & Pipeline Telemetry Unit',
      summary: 'Fabricate an automated inline filtration station fitted with ultrasonic flowmeters and chlorine residual sensors for rural overhead supply tanks. The automated telemetry module regulates dosing valves and transmits flow volume records to the Jal Jeevan Mission dashboard. An initial demonstration unit will be installed at a panchayat water intake to verify filtration throughput.',
      approach: 'Embedded PLC controller connected to optical turbidity meters and multi-spectral chlorine sensors.',
    },
    {
      title: 'Solar PV Array Fault Diagnosis & Automated String Switchgear',
      summary: 'Deploy an edge telemetry unit that monitors current-voltage curves across decentralized solar panel strings to pinpoint degraded cells and soil soiling. The system isolates malfunctioning strings while routing power through bypass diodes to maintain uninterrupted village power. A localized prototype will be validated on rooftop arrays across public health centers.',
      approach: 'Micro-inverter telemetry with automated bypass switching and local thermal imaging diagnostics.',
    },
    {
      title: 'Predictive Transformer Health Monitoring & Oil Telemetry Module',
      summary: 'Equip rural step-down transformers with non-invasive thermal sensors and dielectric oil condition detectors to anticipate phase overloads. Real-time telemetry is broadcast to block electrical divisions through long-range radio signals to prevent transformer burnouts. An initial rollout across five high-risk rural feeders will verify warning accuracy prior to summer peak demands.',
      approach: 'Acoustic partial-discharge monitoring and temperature sensor arrays sending packets via LoRaWAN.',
    },
    {
      title: 'Solar-Powered Fluoride Remediation & Village Dispensing Kiosk',
      summary: 'Construct a standalone solar-powered electrocoagulation water purification kiosk that removes endemic fluoride ions from deep borewell sources. An automated smart-card dispensing interface ensures equitable household allocation while logging water consumption patterns. A demonstration plant will be commissioned in a high-fluoride rural habitation to measure health outcomes.',
      approach: 'Bipolar aluminum electrocoagulation cell powered by rooftop PV and automated RFID card dispensing.',
    },
    {
      title: 'Rural Feeder Phase Balancing & Reactive Power Compensator',
      summary: 'Develop an automatic low-voltage phase-balancing compensator that dynamically shifts single-phase rural loads to eliminate neutral wire overheating. The unit stabilizes household voltage levels and reduces energy dissipation across lengthy agricultural feeder lines. Prototype units can be deployed in selected agricultural pump clusters to prove grid stability.',
      approach: 'Thyristor-switched capacitor banks and solid-state transfer switches operating under autonomous micro-controllers.',
    },
  ],

  // Domain 2: IIT (ISM) Dhanbad (Mining, Environmental, Industrial Waste, Heavy Metals, Runoff)
  IIT_ISM: [
    {
      title: 'Automated Coal Mine Dust Suppression & Runoff Biofiltration System',
      summary: 'Deploy an integrated chemical-biological filtration unit to trap fine particulate coal dust and neutralize acidic runoff before it reaches community aquifers. Continuous optical turbidity sensors will track discharge purity and alert local environmental authorities. An initial pilot at a Dhanbad colliery boundary can establish baseline remediation metrics within ninety days.',
      approach: 'Multi-stage filtration combining coarse settling basins, activated biochar adsorption, and IoT-driven pH and turbidity telemetry.',
    },
    {
      title: 'Industrial Effluent Treatment & Environmental Groundwater Monitoring Unit',
      summary: 'Implement a multi-barrier permeable reactive wall coupled with electrochemical heavy-metal sensors to intercept industrial effluent migration into village wells. The system neutralizes dissolved sulfates and precipitates toxic ions using recycled fly ash adsorbents. A demonstration barrier along a mining watershed corridor will monitor water quality recovery.',
      approach: 'Subsurface permeable reactive barrier utilizing zero-valent iron and alkaline fly-ash composite media.',
    },
    {
      title: 'Mine Overburden Tailings Dam Seepage Telemetry & Soil Remediation',
      summary: 'Install piezometric pressure transmitters and satellite radar interferometry markers to detect structural seepage across coal mine overburden dumps. Deep-root vetiver grass stabilization is combined with bio-remediation agents to prevent slope slumping during heavy monsoon rains. A pilot on an active Dhanbad overburden bench will prove geotechnical stability.',
      approach: 'Piezometer sensor arrays integrated with differential satellite InSAR displacement analysis and bio-turfing.',
    },
    {
      title: 'Air Quality Particulate Matter Containment Barrier & Monitoring Grid',
      summary: 'Erect ultrasonic misting cannons synchronized with real-time PM2.5 and PM10 sensor towers along mineral transport transit routes to suppress fugitive road dust. The automated control system activates water misting only when dust thresholds are breached, conserving municipal water supplies. A test corridor around a coal loading siding will assess dust reduction efficacy.',
      approach: 'High-pressure atomized misting nozzles triggered by real-time laser scattering particulate monitors.',
    },
    {
      title: 'Colliery Acid Mine Drainage Neutralization & Metal Recovery Pilot',
      summary: 'Construct a decentralized limestone neutralization cascade that raises drainage pH and precipitates dissolved iron and manganese into recoverable sludge. Passive solar aeration ponds ensure sustainable operation without requiring dedicated grid connectivity or expensive chemical inputs. A field pilot at an abandoned opencast mine pit will verify water potability.',
      approach: 'Passive anoxic limestone drains coupled with successive alkalinity producing systems and constructed wetlands.',
    },
    {
      title: 'Heavy Metal Bioremediation & Subsurface Hydro-Geological Barrier',
      summary: 'Design a biological filtration trench using native fungal-bacterial consortia to capture lead, cadmium, and arsenic from industrial drainage ditches. Multi-depth soil moisture and contaminant probes track filtration efficiency and transmit alerts through a cellular uplink. A 200-meter test trench in an industrial cluster will validate contaminant retention capacity.',
      approach: 'Microbial bio-augmentation paired with multi-layer zeolite adsorption beds and telemetry probes.',
    },
  ],

  // Domain 3: Central University of Jharkhand, Ranchi (Tribal Healthcare, Vernacular Education, Rural Energy, Forest Livelihoods)
  CUJ: [
    {
      title: 'Telemedicine-Enabled Village Health Navigator for Tribal Blocks',
      summary: 'Establish a community health navigator network equipped with portable diagnostic tablets to deliver primary health screenings in remote tribal habitations. The kit connects frontline workers with specialist doctors via asynchronous store-and-forward telemedicine channels. Field testing across vulnerable tribal hamlets will measure consultation turnaround times and referral compliance.',
      approach: 'Low-bandwidth telemedicine platform integrated with point-of-care vital diagnostic devices and tribal language guidance.',
    },
    {
      title: 'Adaptive Foundational Literacy Platform for Out-of-School Children',
      summary: 'Build an offline-capable digital learning tablet application that teaches foundational numeracy and reading in tribal regional languages. The interactive modules use gamified local folktales and phonics exercises tailored for first-generation school attendees. Pilot learning pods can be established in selected anganwadis across rural blocks.',
      approach: 'Vernacular audio-visual pedagogy paired with offline progress sync for intermittent rural connectivity.',
    },
    {
      title: 'Decentralized Solar Cold Storage for Minor Forest Produce Collectives',
      summary: 'Design a low-cost, phase-change thermal storage cold room powered by rooftop solar panels to preserve collected mahua, tamarind, and lac. The temperature-regulated chamber prevents post-harvest spoilage and empowers tribal self-help groups to sell produce during favorable market windows. A demonstration facility at a rural primary collection center will track shelf-life extensions.',
      approach: 'Thermal phase-change energy storage coupled with DC variable-speed refrigeration compressors.',
    },
    {
      title: 'Decentralized Solar Microgrid for Energy-Deficit Tribal Hamlets',
      summary: 'Deploy a 25-kWp community solar microgrid with modular distribution lines to bring reliable domestic lighting and study power to unelectrified forest settlements. A prepaid smart meter token model administered by village self-help groups covers ongoing maintenance and battery depreciation. A pilot in an isolated tribal hamlet will demonstrate technical and economic viability.',
      approach: 'Community-governed microgrid architecture using hybrid inverters and low-voltage DC mini-grids.',
    },
    {
      title: 'Community Agro-Forestry Solar Irrigation & Water Lift System',
      summary: 'Install solar photovoltaic submersible pump sets paired with drip irrigation lines to irrigate terraced tribal agricultural plots on upland plateau slopes. Community water user committees are trained in equitable allocation and preventive system maintenance through vernacular visual manuals. A three-village demonstration will monitor crop yield improvements during dry seasons.',
      approach: 'Solar-direct DC brush-less submersible pumping coupled with gravity-fed micro-drip networks.',
    },
    {
      title: 'Tribal Community Traditional Medicine Botanical Documentation Platform',
      summary: 'Create a digital participatory archive that records indigenous medicinal plant usage and geo-locates rare herbal species across sacred groves. The platform secures community intellectual property while facilitating sustainable harvesting guidelines with the State Biodiversity Board. Field research teams will validate botanical specimens across selected forest villages.',
      approach: 'Crowdsourced participatory GIS mapping with cryptographically timestamped indigenous knowledge registers.',
    },
  ],

  // Domain 4: Ranchi University (Civic Sanitation, Waste Management, Rural Road Auditing, Community Health)
  RU: [
    {
      title: 'Ward-Level Dry Waste Segregation & Recycler Integration Network',
      summary: 'Introduce a localized waste collection and sorting workflow that connects municipal wards with informal recyclers at guaranteed fair rates. The program incorporates simple color-coded segregation bins and digital weigh-scale tracking to divert plastic and paper from open dumps. A pilot across two urban wards will measure daily diversion rates and informal worker earnings.',
      approach: 'Community-based source separation coupled with localized collection scheduling and digital material tracking.',
    },
    {
      title: 'Community-Based Rural Road Maintenance & Damage Monitoring System',
      summary: 'Deploy a citizen reporting and participatory auditing system to detect road degradation, culvert clogging, and surface washouts before monsoon seasons. Community volunteers record condition checkpoints that feed directly into a district road repair planning dashboard. Selected panchayat road stretches can test the inspection protocol prior to major monsoon cycles.',
      approach: 'Participatory geospatial auditing paired with localized priority ranking algorithms for block engineers.',
    },
    {
      title: 'Decentralized Municipal Organic Waste In-Vessel Composting Pilot',
      summary: 'Establish rapid aerobic composting drum units at vegetable market clusters to convert daily organic market waste into fortified compost for urban nurseries. Odor-control bio-filters and temperature data loggers ensure nuisance-free operation within dense commercial areas. An initial installation at a Ranchi weekly market will process two tons of vegetable refuse daily.',
      approach: 'Continuous-feed rotary drum bioreactors with bio-filter gas scrubbers and automated moisture regulation.',
    },
    {
      title: 'Civic Sanitation Facility Geo-Audit & Rapid Repair Dispatch Platform',
      summary: 'Implement a QR-code enabled feedback system installed inside public community toilets to allow citizens to report water shortages, broken taps, or cleanliness lapses. Maintenance dispatches are automatically triggered and tracked through service level agreements monitored by municipal health officers. A trial across twenty public sanitation complexes will assess service turnaround.',
      approach: 'QR-anchored mobile reporting interface triggering webhook alerts to verified local maintenance contractors.',
    },
    {
      title: 'Participatory Watershed Mapping & Rainwater Harvest Planning System',
      summary: 'Engage university student volunteers and local farmers in mapping traditional water harvesting structures (bunds, tanks, and recharge ponds) using handheld GPS tools. The collected hydrological data informs panchayat soil conservation plans and prioritizes check-dam construction. A pilot study across one block will identify critical recharge zones.',
      approach: 'Open-source mobile GIS data collection linked with digital elevation models for watershed delineation.',
    },
    {
      title: 'Pothole & Road Deterioration Community Inspection Pilot',
      summary: 'Deploy a community inspection workflow that combines vehicular vibration sensors on public buses with roadside visual surveys to flag early road distress. District public works engineers receive heatmaps of accelerating pavement wear to schedule preventive bitumen resealing. A 30-kilometer arterial route will demonstrate preventive road preservation.',
      approach: 'Smartphone accelerometer crowd-sensing combined with geo-spatial clustering for pavement roughness estimation.',
    },
  ],

  // Domain 5: IIIT Ranchi (AI, Machine Learning, Data Analytics, Grievance Intelligence, Computer Vision)
  IIIT_RANCHI: [
    {
      title: 'AI-Enabled Soil Health Advisory Platform for Smallholder Farmers',
      summary: 'Provide a mobile advisory tool that translates rapid field soil test results and satellite vegetation imagery into personalized crop nutrition plans. The platform generates actionable vernacular recommendations to guide fertilizer application and irrigation schedules. Selected farmer producer groups in Ranchi district can test the tool during upcoming sowing cycles.',
      approach: 'Edge machine learning models combined with multi-spectral satellite indices and vernacular text-to-speech audio advisories.',
    },
    {
      title: 'Grievance Intelligence Dashboard for Jharkhand State Portal',
      summary: 'Create an automated natural language processing engine to categorize, deduplicate, and route civic grievances filed across state portals. The platform identifies chronic department bottlenecks and visualizes recurring service failure hotspots for district collectors. A demonstration sandbox can be connected to sample municipal complaints before full integration.',
      approach: 'Transformer-based semantic text classification with automated escalation workflows and spatial clustering.',
    },
    {
      title: 'Computer Vision Infrastructure Defect Detection & Analytics Platform',
      summary: 'Implement an automated image recognition pipeline that analyzes smartphone and drone footage to identify structural fissures in civic assets. The system automatically classifies defect severity and populates a geo-tagged repair queue for public works engineers. Field trials across urban roads can validate defect classification accuracy under varying sunlight.',
      approach: 'YOLO-based edge defect detection model coupled with automated geospatial mapping and priority scoring.',
    },
    {
      title: 'Predictive Rural Road Deterioration Monitoring Using CV and Drone Survey',
      summary: 'Apply high-resolution drone photogrammetry and deep learning image segmentation to quantify surface distress and edge breakages along rural road networks. The system outputs predictive degradation curves that help department engineers prioritize resurfacing contracts before monsoon washouts. A 50-kilometer survey across rural roads will demonstrate cost savings.',
      approach: 'Convolutional neural networks fine-tuned on asphalt distress patterns with automated ortho-mosaic stitching.',
    },
    {
      title: 'Automated Civic Problem Clustering & Spatial Work Order Dispatcher',
      summary: 'Develop a spatial clustering algorithm that groups nearby citizen problem reports into single incident events to eliminate duplicate municipal dispatches. The backend links related citizen complaints with relevant engineering divisions while providing tracking updates to all submitters. A simulation using historical municipal data will test clustering precision.',
      approach: 'DBSCAN geo-spatial clustering coupled with NLP semantic similarity deduplication.',
    },
    {
      title: 'Multilingual Voice-to-Text Civic Grievance Intake Engine',
      summary: 'Build an acoustic speech recognition model optimized for regional dialects to allow non-literate citizens to file voice grievances over telephone helplines. The engine converts spoken audio into structured textual problem summaries and extracts key geographic landmarks. A test phone line will record acoustic accuracy across rural ambient noise levels.',
      approach: 'Fine-tuned multilingual Conformer acoustic models paired with named-entity recognition for village extraction.',
    },
  ],

  // Domain 6: Birla Institute of Technology, Mesra (Water Biofiltration, Remote Sensing, GIS, Biotechnology)
  BIT_MESRA: [
    {
      title: 'IoT-Enabled Multi-Stage Water Biofiltration & Quality Telemetry Unit',
      summary: 'Construct a gravity-assisted biofiltration system using locally sourced sand, gravel, and activated biochar to remove bacterial pathogens and suspended solids. Solar-powered sensors continuously test pH, turbidity, and electrical conductivity, transmitting safety indicators to a community display board. A pilot unit installed at a community borewell will verify drinking water compliance over three months.',
      approach: 'Multi-barrier biological filtration enhanced by low-power optical water quality monitoring and vernacular LCD alerts.',
    },
    {
      title: 'Municipal Water Distribution Acoustic Leak Detection Sensor Mesh',
      summary: 'Deploy surface-mounted acoustic sensors along urban drinking water distribution pipelines to identify pinhole leaks and pressure anomalies before surface washouts occur. Machine learning models distinguish pipe vibrations from traffic noise and map leak locations for municipal repair squads. A trial deployment across Ward 12 in Ranchi will quantify non-revenue water savings.',
      approach: 'Piezoelectric acoustic listening sensors linked via narrow-band IoT to continuous cross-correlation servers.',
    },
    {
      title: 'Village Borewell Water Purity Diagnostic & Telemetric Alert System',
      summary: 'Install compact dip-probe optical sensors directly inside community handpumps and borewells to monitor seasonal turbidity spikes and iron contamination. The self-powered sensing unit illuminates a clear color-coded LED beacon on the pump handle to inform villagers of safe potability. Five test borewells in rural blocks will evaluate probe resistance to sediment abrasion.',
      approach: 'Submersible multi-wavelength spectrophotometric probes operating on ultra-low-power microcontrollers.',
    },
    {
      title: 'Decentralized Battery Energy Storage & Frequency Regulation Buffer',
      summary: 'Design a modular lithium-iron-phosphate battery buffer that smooths intermittent power delivery from community solar arrays to sensitive medical devices. Microcontroller circuits continuously balance cell voltages while transmitting operating metrics to local health center staff. A containerized demonstration unit can be installed at a rural primary health center to guarantee 24/7 cold-chain power.',
      approach: 'Active cell-balancing battery management system communicating over CAN-bus with hybrid solar inverter stages.',
    },
    {
      title: 'Hybrid Solar-Biomass Microgrid Stabilization Unit',
      summary: 'Combine agricultural crop residue gasification with rooftop solar generation through a unified digital microgrid synchronizer. The system ensures continuous baseline power during monsoon overcast periods while converting surplus paddy straw into clean electricity. A working installation in a farming hamlet will measure fuel savings and generation consistency.',
      approach: 'Downdraft biomass gasifier paired with smart grid inverters and automated syngas air-fuel ratio controllers.',
    },
    {
      title: 'Edge Telemetry Unit for Rural Distribution Grid Tele-Monitoring',
      summary: 'Create an ultra-low-power telemetry gateway that logs voltage dips, lightning surges, and phase dropouts across remote rural power poles. The device harvests ambient electromagnetic energy to broadcast alert packets without requiring periodic battery replacements. Pilot nodes can be field-tested along a 10-kilometer rural distribution corridor to evaluate signal reliability.',
      approach: 'Electromagnetic energy harvesting power supply driving sub-GHz long-range telemetry transmitters.',
    },
  ],
};

async function ensureInstitutions() {
  const orgMap = new Map();

  for (const inst of INSTITUTIONS) {
    let org = (
      await client.query(
        `SELECT o.id, o.name FROM organizations o
         LEFT JOIN institution_profiles p ON p.organization_id = o.id
         WHERE o.name ILIKE $1 OR o.name ILIKE $2 OR o.name ILIKE $3 
         ORDER BY (p.id IS NOT NULL) DESC, o.created_at ASC
         LIMIT 1`,
        [inst.name, `%${inst.shortName}%`, inst.name === 'IIT (ISM) Dhanbad' ? '%Indian Institute of Technology (ISM) Dhanbad%' : inst.name]
      )
    ).rows[0];

    if (!org) {
      const res = await client.query(
        `INSERT INTO organizations (
          id, name, organization_type, geographic_reach, is_demo, description,
          district, state, website, email, verification_status, is_claimed,
          available_capacity, availability_status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'INSTITUTION', 'NATIONAL', false, $2,
          $3, $4, $5, $6, 'VERIFIED', true,
          5, 'AVAILABLE', NOW(), NOW()
        ) RETURNING id, name`,
        [inst.name, inst.description, inst.district, inst.state, inst.website, inst.email]
      );
      org = res.rows[0];
      console.log(`✅ Created organization: ${org.name} (${org.id})`);
    } else {
      await client.query(
        `UPDATE organizations SET
          name = $1,
          district = $2,
          state = $3,
          description = $4,
          website = $5,
          email = $6,
          verification_status = 'VERIFIED',
          is_claimed = true,
          available_capacity = 5,
          availability_status = 'AVAILABLE',
          updated_at = NOW()
        WHERE id = $7`,
        [inst.name, inst.district, inst.state, inst.description, inst.website, inst.email, org.id]
      );
      console.log(`✅ Verified organization: ${inst.name} (${org.id})`);
    }

    const profile = (
      await client.query('SELECT id FROM institution_profiles WHERE organization_id = $1 OR institution_code = $2 LIMIT 1', [org.id, inst.code])
    ).rows[0];

    if (!profile) {
      await client.query(
        `INSERT INTO institution_profiles (
          id, organization_id, institution_code, institution_category, established_year, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()
        )`,
        [org.id, inst.code, inst.category, inst.estYear]
      );
      console.log(`  └─ Created profile for ${inst.name}`);
    } else {
      await client.query(
        `UPDATE institution_profiles SET organization_id = $1 WHERE id = $2`,
        [org.id, profile.id]
      );
    }

    orgMap.set(inst.key, { id: org.id, name: inst.name, district: inst.district });
  }

  return orgMap;
}

// Select domain key based on challenge/solution properties, rotating within blueprints
function getDomainKeyForSolution(sol, counts) {
  const title = (sol.title || '').toLowerCase();
  const challengeTitle = (sol.challenge_title || '').toLowerCase();
  const cat = (sol.challenge_category || '').toUpperCase();
  const dist = (sol.challenge_district || '').toLowerCase();

  // 1. Mining / Industrial / Environmental -> IIT (ISM) Dhanbad
  if (
    title.includes('dust') ||
    title.includes('mine') ||
    title.includes('mining') ||
    title.includes('coal') ||
    challengeTitle.includes('dust') ||
    challengeTitle.includes('coal') ||
    challengeTitle.includes('mine') ||
    cat === 'ENVIRONMENT' ||
    dist.includes('dhanbad')
  ) {
    return 'IIT_ISM';
  }

  // 2. AI / Software / Machine Learning / Data -> IIIT Ranchi
  if (
    title.includes('ai-enabled') ||
    title.includes('grievance') ||
    title.includes('dashboard') ||
    title.includes('computer vision') ||
    title.includes('drone') ||
    challengeTitle.includes('grievance') ||
    title.includes('soil health')
  ) {
    return 'IIIT_RANCHI';
  }

  // 3. Rural Healthcare / Tribal / Vernacular Education / Forest Collectives -> Central University of Jharkhand
  if (
    title.includes('telemedicine') ||
    title.includes('tribal') ||
    title.includes('literacy') ||
    title.includes('health navigator') ||
    title.includes('village health') ||
    challengeTitle.includes('tribal') ||
    title.includes('cold storage') ||
    title.includes('forest')
  ) {
    return 'CUJ';
  }

  // 4. Waste / Sanitation / Recycling / Rural Road Auditing -> Ranchi University
  if (
    title.includes('waste') ||
    title.includes('recycler') ||
    title.includes('sanitation') ||
    title.includes('kachra') ||
    challengeTitle.includes('kachra') ||
    challengeTitle.includes('sanitation') ||
    title.includes('broken and people having') ||
    challengeTitle.includes('broken and people having') ||
    title.includes('road deterioration')
  ) {
    return 'RU';
  }

  // 5. Water / Biofiltration / Pipeline Leakage -> Alternate between BIT Mesra and NIT Jamshedpur
  if (
    title.includes('water') ||
    title.includes('filtration') ||
    title.includes('biofilter') ||
    title.includes('borewell') ||
    challengeTitle.includes('water') ||
    challengeTitle.includes('borewell') ||
    challengeTitle.includes('pipeline') ||
    cat === 'WATER_AND_SANITATION' ||
    cat === 'WATER & SANITATION'
  ) {
    // Balance between BIT Mesra and NIT Jamshedpur
    return (counts['BIT_MESRA'] || 0) <= (counts['NIT_JSR'] || 0) ? 'BIT_MESRA' : 'NIT_JSR';
  }

  // 6. Power, Energy, Electrical Sparks, Substation, Inverter -> Distribute between NIT Jamshedpur and BIT Mesra
  if (
    cat === 'POWER_AND_ENERGY' ||
    cat === 'ENERGY' ||
    title.includes('spark') ||
    title.includes('substation') ||
    title.includes('inverter') ||
    title.includes('microgrid') ||
    challengeTitle.includes('spark') ||
    challengeTitle.includes('bijli')
  ) {
    // If arc fault / substation spark / inverter -> NIT Jamshedpur preferred
    if (title.includes('spark') || title.includes('substation') || challengeTitle.includes('spark')) {
      return 'NIT_JSR';
    }
    // Rotate to keep healthy distribution across all institutions
    const candidates = ['NIT_JSR', 'BIT_MESRA', 'CUJ', 'RU', 'IIIT_RANCHI', 'IIT_ISM'];
    // Pick the candidate with lowest count
    candidates.sort((a, b) => (counts[a] || 0) - (counts[b] || 0));
    return candidates[0];
  }

  // General fallback: pick the institution with lowest count to ensure well-distributed cards
  const allInsts = ['NIT_JSR', 'IIT_ISM', 'CUJ', 'RU', 'IIIT_RANCHI', 'BIT_MESRA'];
  allInsts.sort((a, b) => (counts[a] || 0) - (counts[b] || 0));
  return allInsts[0];
}

async function updateAllSolutions(orgMap) {
  // Query all solutions ordered so that public/published/converted ones get priority assignment
  const solsRes = await client.query(`
    SELECT 
      s.id,
      s.title,
      s.status,
      s.executive_summary,
      s.proposing_organization_id,
      c.title as challenge_title,
      c.category as challenge_category,
      c.district as challenge_district,
      s.created_at
    FROM proposed_solutions s
    LEFT JOIN challenges c ON c.id = s.challenge_id
    ORDER BY s.created_at DESC
  `);

  console.log(`\n📋 Processing ${solsRes.rows.length} solutions for realistic diversification & improved descriptions...`);

  const instCounts = {};
  const blueprintUsage = {};
  for (const inst of INSTITUTIONS) {
    instCounts[inst.key] = 0;
    blueprintUsage[inst.key] = 0;
  }

  for (let i = 0; i < solsRes.rows.length; i++) {
    const sol = solsRes.rows[i];
    const targetKey = getDomainKeyForSolution(sol, instCounts);
    instCounts[targetKey] = (instCounts[targetKey] || 0) + 1;

    // Pick blueprint cyclically for this institution
    const availableBlueprints = BLUEPRINTS[targetKey];
    const bpIndex = blueprintUsage[targetKey] % availableBlueprints.length;
    blueprintUsage[targetKey]++;

    const bp = availableBlueprints[bpIndex];
    const targetOrg = orgMap.get(targetKey);

    await client.query(
      `UPDATE proposed_solutions SET
        title = $1,
        executive_summary = $2,
        proposed_approach = $3,
        technical_approach = $4,
        problem_understanding = $5,
        proposing_organization_id = $6,
        updated_at = NOW()
      WHERE id = $7`,
      [
        bp.title,
        bp.summary,
        bp.summary,
        bp.approach,
        bp.summary,
        targetOrg.id,
        sol.id,
      ]
    );
  }

  console.log('\n📊 Final Solution Distribution across Jharkhand Higher-Education Institutions:');
  for (const inst of INSTITUTIONS) {
    const count = instCounts[inst.key] || 0;
    const org = orgMap.get(inst.key);
    console.log(`  • ${org.name} (${org.district}): ${count} solutions`);
  }
}

async function main() {
  await client.connect();
  console.log('🔌 Connected to PostgreSQL database.');

  console.log('🏛️ Ensuring 6 premier Jharkhand Higher-Education Institutions...');
  const orgMap = await ensureInstitutions();

  console.log('🔄 Diversifying solutions & enhancing descriptions to 3-4 lines...');
  await updateAllSolutions(orgMap);

  await client.end();
  console.log('\n✨ Database solutions demo data successfully updated!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
