import os
import sys
import json
from datetime import datetime, timezone
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import engine, SessionLocal
from db.models import Base, ResearchPaper, PaperSource, Dataset, DatasetSource

DOMAINS_PAPERS = [
    "Agriculture", "Healthcare", "Water Resources", "Environment",
    "Education", "Social Innovation", "Digital Platforms", "Crowdsourcing",
    "Citizen Science", "University-Industry Collaboration", "Collaborative Innovation",
    "Knowledge Sharing", "Technology Transfer", "Innovation Ecosystems",
    "Public Participation", "Challenge-Based Innovation", "EdTech",
    "Information Systems", "Community Development"
]

DOMAINS_DATASETS = [
    "Education", "Public Datasets", "Community Datasets", "Government Data",
    "Social", "Economic", "Agriculture", "Environment", "Water", "Healthcare"
]

LOCATIONS = [
    "Ranchi District, Jharkhand", "Dhanbad Municipal Corporation, Jharkhand",
    "Bokaro Steel City, Jharkhand", "East Singhbhum District, Jharkhand",
    "Bangalore Urban District, Karnataka", "Pune Metropolitan Region, Maharashtra",
    "Chennai Central District, Tamil Nadu", "Ahmedabad Municipal Area, Gujarat",
    "Lucknow Urban Agglomeration, Uttar Pradesh", "Jaipur District, Rajasthan",
    "Patna Municipal Corporation, Bihar", "Guwahati Municipal Area, Assam"
]

DOMAIN_KEYWORDS = {
    "Agriculture": ["soil monitoring", "crop yield", "precision irrigation", "pest detection", "smart farming", "drip irrigation", "fertilizer optimization", "drone remote sensing"],
    "Healthcare": ["telemedicine", "rural clinic", "maternal health", "diagnostic IoT", "vector borne disease", "health monitoring", "wearable sensors", "community healthcare"],
    "Water Resources": ["water contamination", "pipe leakage", "groundwater salinity", "arsenic detection", "potable water distribution", "flow rate sensor", "water quality index", "filtration system"],
    "Environment": ["air pollution", "PM2.5 monitoring", "solid waste management", "effluent treatment", "plastic recycling", "urban heat island", "carbon sequestration", "drainage overflow"],
    "Education": ["vernacular learning", "digital literacy", "rural school STEM", "adaptive assessment", "teacher training", "multilingual curriculum", "offline learning tablet", "inclusive education"],
    "Social Innovation": ["microfinance", "women self-help groups", "participatory governance", "grievance redressal", "community asset mapping", "social enterprise", "livelihood resilience"],
    "Digital Platforms": ["open civic data", "citizen service portal", "verifiable credentials", "low-bandwidth UI", "interoperable digital architecture", "mobile governance"],
    "Crowdsourcing": ["civic defect reporting", "geotagged problem reporting", "volunteer emergency response", "participatory sensing", "crowd-sourced validation", "micro-tasking"],
    "Citizen Science": ["community water sampling", "biodiversity mapping", "local weather stations", "participatory air monitoring", "citizen environmental audit"],
    "University-Industry Collaboration": ["technology incubator", "academic spin-off", "applied research consortium", "proof of concept validation", "industry-sponsored capstone"],
    "Collaborative Innovation": ["living labs", "multi-stakeholder partnership", "co-creation sprint", "civic hackathon to pilot", "quadruple helix ecosystem"],
    "Knowledge Sharing": ["open access repository", "institutional knowledge base", "practitioner best practices", "inter-university knowledge transfer", "open data commons"],
    "Technology Transfer": ["patent commercialization", "frugal engineering licensing", "grassroots innovation scaling", "technology readiness assessment", "pilot deployment"],
    "Innovation Ecosystems": ["regional startup cluster", "university innovation hub", "seed grant incubation", "student entrepreneurship", "urban prototyping testbed"],
    "Public Participation": ["deliberative town hall", "participatory budgeting", "civic engagement feedback", "community consultation", "neighborhood advisory council"],
    "Challenge-Based Innovation": ["civic grand challenges", "problem-driven university research", "hackathons for municipal solutions", "open innovation challenge", "challenge formulation"],
    "EdTech": ["gamified math learning", "assistive reading tool", "interactive vernacular LMS", "offline-first school server", "student engagement analytics"],
    "Information Systems": ["municipal ERP", "GIS urban mapping", "spatial asset tracking", "ticket routing automation", "public service level monitoring"],
    "Community Development": ["tribal village microgrid", "rural artisan marketing", "decentralized solar power", "watershed restoration", "community seed bank"]
}

PAPER_TEMPLATES = [
    ("A Machine Learning Approach to {topic} in Developing Regions", "This research investigates novel algorithmic frameworks for {topic}. Through extensive empirical validation across municipal deployments, the proposed method demonstrates significant performance improvements and robustness against missing sensor observations.", 0.88),
    ("IoT-Driven Low-Cost Sensing Systems for {topic}", "We propose an end-to-end IoT sensor architecture targeting {topic}. The hardware and firmware design minimizes energy consumption while delivering high-frequency telemetry suitable for local civic authorities.", 0.85),
    ("Empirical Evaluation of Community-Driven Interventions in {topic}", "Field study analyzing the operational impact of {topic} across urban and semi-rural wards. Results reveal measurable gains in service delivery, citizen satisfaction, and maintenance turnaround times.", 0.79),
    ("Optimization Strategies and Distributed Control for {topic}", "Mathematical modeling and algorithmic optimization applied to municipal {topic}. We formulate a constrained objective function and demonstrate computational efficiency in real-time edge environments.", 0.83),
    ("Framework for Inter-Institutional Collaboration on {topic}", "A policy and implementation framework connecting universities, civic bodies, and regional industry to address critical issues in {topic}. Case studies validate sustained technology adoption.", 0.80),
    ("Spatio-Temporal Analysis and Predictive Modeling of {topic}", "Leveraging geospatial intelligence and multi-temporal remote sensing to model dynamics of {topic}. The pipeline detects anomalies with high statistical significance.", 0.86),
    ("Frugal Innovation and Open Source Solutions for {topic}", "Design science study on low-cost, open-source technological interventions for {topic}. We provide complete schematics, open-access code, and field benchmark evaluations.", 0.90),
    ("Resilient Municipal Infrastructure Design: Addressing {topic}", "Comprehensive engineering review and prototype testing of resilient urban systems addressing {topic}. Demonstrates fault tolerance under peak stress conditions.", 0.82),
    ("Real-Time Telemetry and Automated Alerting for {topic}", "Describes an automated monitoring platform for {topic} integrating cloud and edge processing. Deployed across local administration monitoring hubs with positive efficacy.", 0.84),
    ("Participatory Sensing and Citizen Engagement Models in {topic}", "Investigates the intersection of civic crowdsourcing and sensor telemetry for {topic}. Demonstrates that citizen-in-the-loop validation increases anomaly resolution speed.", 0.87)
]

DATASET_TEMPLATES = [
    ("Municipal High-Frequency Telemetry Dataset for {domain}", "Time-series observations collected from distributed telemetry nodes monitoring {kw1} and {kw2}. Includes quality-controlled sensor streams, calibrated readings, and temporal timestamps.", "CSV, GeoJSON", 120),
    ("Civic Monitoring and Spatial Asset Registry: {domain}", "Comprehensive spatial dataset identifying public infrastructure, baseline health indicators, and operational status for {kw1} across wards.", "Shapefile, GeoJSON", 85),
    ("Citizen Grievance and Service Level Response Archive: {domain}", "Detailed incident log recording civic problems, response durations, localized interventions, and resolution efficacy regarding {kw2}.", "CSV, Parquet", 210),
    ("Multi-Ward Environmental and Utility Sensor Data: {domain}", "Continuous monitoring data measuring environmental indices, ambient parameters, and network flow characteristics related to {kw1}.", "NetCDF, CSV", 340),
    ("Baseline Socio-Economic and Infrastructure Inventory for {domain}", "Granular survey and census-linked indicators capturing demographic density, service accessibility, and vulnerability metrics for {kw2}.", "CSV, XLSX", 95)
]

def seed_database():
    print("=== SEEDING KNOWLEDGE BASE POSTGRESQL ===")
    session = SessionLocal()

    # Clear existing
    session.query(PaperSource).delete()
    session.query(ResearchPaper).delete()
    session.query(DatasetSource).delete()
    session.query(Dataset).delete()
    session.commit()

    print("Cleared existing knowledge base tables.")

    # 1. Seed 1,381 Research Papers
    TARGET_PAPERS = 1381
    papers_to_insert = []
    paper_sources_to_insert = []

    for i in range(1, TARGET_PAPERS + 1):
        domain = DOMAINS_PAPERS[(i - 1) % len(DOMAINS_PAPERS)]
        kws = DOMAIN_KEYWORDS.get(domain, ["civic tech", "innovation"])
        kw1 = kws[(i * 3) % len(kws)]
        kw2 = kws[(i * 5) % len(kws)]
        tpl_title, tpl_desc, base_score = PAPER_TEMPLATES[(i * 7) % len(PAPER_TEMPLATES)]

        title = tpl_title.format(topic=kw1.title())
        abstract = tpl_desc.format(topic=f"{kw1} and {kw2}")
        year = 2018 + (i % 8)
        citations = int(5 + ((i * 17) % 380))
        doi = f"10.1016/j.{domain.lower().replace(' ', '')}.20{year%100}.{100000 + i}"
        venue = f"Journal of {domain} & Civic Innovation" if (i % 2 == 0) else f"IEEE International Conference on {domain} Systems"

        paper = ResearchPaper(
            id=i,
            title=title,
            abstract=abstract,
            authors=[f"Dr. Researcher {i}", f"Prof. Collaborator {(i*2)%50 + 1}"],
            publication_year=year,
            venue=venue,
            doi=doi,
            paper_url=f"https://doi.org/{doi}",
            publisher_url=f"https://publisher.example.org/{doi}",
            open_access_url=f"https://arxiv.org/abs/240{i%9}.{10000+i}",
            pdf_url=f"https://arxiv.org/pdf/240{i%9}.{10000+i}.pdf",
            is_open_access=True,
            citation_count=citations,
            keywords=[kw1, kw2, domain.lower(), "civic intervention"],
            topics=[domain, kw1, kw2],
            domain=domain,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        papers_to_insert.append(paper)

        paper_source = PaperSource(
            id=i,
            paper_id=i,
            source_name="OpenAlex" if (i % 2 == 0) else "Semantic Scholar",
            source_id=f"W{3000000000 + i}",
            last_source_update=datetime.now(timezone.utc)
        )
        paper_sources_to_insert.append(paper_source)

    session.bulk_save_objects(papers_to_insert)
    session.bulk_save_objects(paper_sources_to_insert)
    session.commit()
    print(f"Seeded {len(papers_to_insert)} Research Papers with IDs 1..{TARGET_PAPERS}")

    session.execute(text(f"SELECT setval('research_papers_id_seq', {TARGET_PAPERS}, true);"))
    session.execute(text(f"SELECT setval('paper_sources_id_seq', {TARGET_PAPERS}, true);"))
    session.commit()

    # 2. Seed 175 Datasets
    TARGET_DATASETS = 175
    datasets_to_insert = []
    ds_sources_to_insert = []

    for i in range(1, TARGET_DATASETS + 1):
        domain = DOMAINS_DATASETS[(i - 1) % len(DOMAINS_DATASETS)]
        kws = DOMAIN_KEYWORDS.get(domain, DOMAIN_KEYWORDS.get("Water Resources"))
        kw1 = kws[(i * 2) % len(kws)]
        kw2 = kws[(i * 4) % len(kws)]
        loc = LOCATIONS[(i * 3) % len(LOCATIONS)]
        tpl_name, tpl_desc, fmt, rec_count = DATASET_TEMPLATES[(i * 5) % len(DATASET_TEMPLATES)]

        name = f"{tpl_name.format(domain=domain)} - {loc}"
        description = f"{tpl_desc.format(kw1=kw1, kw2=kw2)} Deployed under municipal jurisdiction of {loc}."

        ds = Dataset(
            id=i,
            name=name,
            description=description,
            domain=domain,
            keywords=[kw1, kw2, domain.lower(), "open data"],
            features=["timestamp", "latitude", "longitude", "sensor_reading_raw", "calibrated_value", "anomaly_flag"],
            geographic_scope=loc,
            size_description=f"{rec_count * 100} observations, {fmt}",
            format=fmt.split(",")[0].strip(),
            license="Open Data Commons Open Database License (ODbL)",
            source_url=f"https://data.gov.in/resource/dataset-{domain.lower()}-{i}",
            access_url=f"https://data.gov.in/download/dataset-{domain.lower()}-{i}.csv",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        datasets_to_insert.append(ds)

        ds_source = DatasetSource(
            id=i,
            dataset_id=i,
            source_name="Data.gov" if (i % 2 == 0) else "DCAT Open Data Portal",
            source_id=f"DS-CAT-{1000 + i}",
            last_source_update=datetime.now(timezone.utc)
        )
        ds_sources_to_insert.append(ds_source)

    session.bulk_save_objects(datasets_to_insert)
    session.bulk_save_objects(ds_sources_to_insert)
    session.commit()
    print(f"Seeded {len(datasets_to_insert)} Datasets with IDs 1..{TARGET_DATASETS}")

    session.execute(text(f"SELECT setval('datasets_id_seq', {TARGET_DATASETS}, true);"))
    session.execute(text(f"SELECT setval('dataset_sources_id_seq', {TARGET_DATASETS}, true);"))
    session.commit()

    session.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
