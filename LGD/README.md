# Local Government Directory (LGD) Authoritative Dataset & Directory

> **CRITICAL ARCHITECTURAL PRINCIPLE:**
> **"LGD verifies the existence/identity of the local government institution. It does not by itself verify that a person is employed by or authorized to represent that institution."**

This directory contains the official, authoritative Local Government Directory (LGD) datasets downloaded directly from the Ministry of Panchayati Raj / Government of India Local Government Directory portal for **Jharkhand (State Code: 20)**.

---

## 1. Directory Structure

```
d:\Projects\Crowdsource\LGD/
├── raw/                                           # Byte-for-byte authentic downloaded LGD archives
│   ├── manifest.json                              # SHA-256 hashes, byte sizes, and member mappings
│   ├── districtofSpecificState2026-09-23-22-44-32-839.xls  # 24 Districts of Jharkhand (28,552 bytes)
│   ├── blockofspecificState2026-09-23-22-44-39-462.xls     # 264 Development Blocks of Jharkhand (182,417 bytes)
│   ├── priLbSpecificState2026-09-23-22-44-33-257.xls       # 4,633 Panchayati Raj Institutions (3,640,257 bytes)
│   └── villageGramPanchayatMapping2026-09-23-22-44-39-072.xls # 32,733 Village-to-GP Mappings (46,094,399 bytes)
│
├── processed/                                     # Validated, normalized, structured canonical data
│   ├── districts.json                             # 24 Districts (LGD code, name EN/Local, census codes)
│   ├── blocks.json                                # 264 Blocks (Block LGD, District LGD, name EN/Local)
│   ├── pri_institutions.json                      # 4,633 Canonical PRI Institutions (ZP, PS, GP)
│   └── village_mapping_summary.json               # 32,733 village mapping summary across 4,345 GPs
│
└── README.md                                      # Authoritative dataset documentation & validation
```

---

## 2. Dataset Inventory & Analysis

### Dataset 1: Districts of State
- **Source Archive Member:** `districtofSpecificState2026:09:23:22:44:32:839.xls`
- **Extracted File:** `LGD/raw/districtofSpecificState2026-09-23-22-44-32-839.xls`
- **SHA-256:** `8984ec7ab6b8ec4b967ce2a370e445037d04f217eeebbfdae4ecfdb173dfcfb3`
- **Format:** Microsoft Excel 2003 XML SpreadsheetML (`urn:schemas-microsoft-com:office:spreadsheet`)
- **Entity Represented:** Administrative Districts of State (Jharkhand, State Code: 20)
- **Sheet Name:** `Report`
- **Total Rows:** 31 (5 header/title rows, 24 data rows, 1 timestamp row, 1 empty row)
- **Valid Data Count:** 24 Districts
- **Important Columns:**
  - Column 1: `S. No.`
  - Column 2: `District Code` (Authoritative LGD District Code, e.g., `322` for Bokaro, `340` for Ranchi)
  - Column 3: `District Version`
  - Column 4: `District Name (In English)`
  - Column 5: `District Name (In Local)` (Hindi Devanagari script)
  - Column 6: `Census 2001 Code`
  - Column 7: `Census 2011 Code`
- **Duplicate Records:** 0
- **Missing Values:** 0 in mandatory code and name fields
- **Validation Status:** `PASSED (100% Valid)`

### Dataset 2: Development Blocks of State
- **Source Archive Member:** `blockofspecificState2026:09:23:22:44:39:462.xls`
- **Extracted File:** `LGD/raw/blockofspecificState2026-09-23-22-44-39-462.xls`
- **SHA-256:** `c60e2d53a163a34a8b79b69b615197f26f2125f1b138e658e370a2ca7e0b57e6`
- **Format:** Microsoft Excel 2003 XML SpreadsheetML
- **Entity Represented:** Administrative Development Blocks within Districts
- **Sheet Name:** `Report`
- **Total Rows:** 271 (5 header/title rows, 264 data rows, 1 timestamp row, 1 empty row)
- **Valid Data Count:** 264 Development Blocks
- **Important Columns:**
  - Column 1: `S.No.`
  - Column 2: `District Code` (Foreign key pointing to District LGD Code)
  - Column 3: `District Name (In English)`
  - Column 4: `Block Code` (Authoritative LGD Block Code)
  - Column 5: `Block Version`
  - Column 6: `Block Name (In English)`
  - Column 7: `Block Name (In Local)`
- **Relationships:** 100% of the 264 blocks reference valid District Codes from Dataset 1.
- **Duplicate Records:** 0
- **Missing Values:** 0 in mandatory code and name fields
- **Validation Status:** `PASSED (100% Valid)`

### Dataset 3: PRI Local Bodies of State
- **Source Archive Member:** `priLbSpecificState2026:09:23:22:44:33:257.xls`
- **Extracted File:** `LGD/raw/priLbSpecificState2026-09-23-22-44-33-257.xls`
- **SHA-256:** `e3538af123984ca5362e742ea351cc9fa7eaee95b36719e71e3db30ecf9fb02c`
- **Format:** Microsoft Excel 2003 XML SpreadsheetML
- **Entity Represented:** 3-Tier Panchayati Raj Institutions (PRI)
  - **Tier 1 (Apex):** Zila Panchayat (Zilla Parishad) — 24 institutions (Type Code 1)
  - **Tier 2 (Intermediate):** Panchayat Samiti — 264 institutions (Type Code 2)
  - **Tier 3 (Base):** Gram Panchayat — 4,345 institutions (Type Code 3)
- **Total Records:** 4,633 PRI Institutions
- **Important Columns:**
  - Column 1: `S.No.`
  - Column 2: `Localbody Type Code` (`1` = ZP, `2` = PS, `3` = GP)
  - Column 3: `Localbody Type Name`
  - Column 4: `Localbody Code` (Canonical LGD Local Body Code)
  - Column 5: `Localbody Version`
  - Column 6: `Localbody Name (In English)`
  - Column 7: `Localbody Name (In Local)`
  - Column 8: `Parent Localbody Code`
- **Relationships:**
  - 24 Zila Panchayats have no parent in PRI hierarchy (root tier).
  - 264 Panchayat Samitis reference valid Zila Panchayat codes (100% relational integrity).
  - 4,345 Gram Panchayats reference valid Panchayat Samiti parent codes (100% relational integrity).
- **Duplicate LGD Codes:** 0 duplicates across all 4,633 local body codes.
- **Missing Values:** 0 in mandatory identity fields.
- **Validation Status:** `PASSED (100% Valid)`

### Dataset 4: Village to Gram Panchayat Mapping
- **Source Archive Member:** `villageGramPanchayatMapping2026:09:23:22:44:39:072.xls`
- **Extracted File:** `LGD/raw/villageGramPanchayatMapping2026-09-23-22-44-39-072.xls`
- **SHA-256:** `8e54b56ca42fa00b1e4c34d58017c6691c2f90a59b6fe155799a674fa7731998`
- **Format:** Microsoft Excel 2003 XML SpreadsheetML
- **Entity Represented:** Granular Village to Gram Panchayat administrative jurisdiction mapping
- **Total Mapping Rows:** 32,733 valid mappings
- **Unique Villages:** 32,526 unique village LGD codes
- **Gram Panchayats Mapped:** 4,345 Gram Panchayats (100.0% coverage of the 4,345 Gram Panchayats in PRI dataset)
- **Important Columns:**
  - Column 2: `District Code`
  - Column 6: `Subdistrict Code` (Tehsil/Subdistrict LGD Code)
  - Column 10: `Village Code` (Authoritative LGD Village Code)
  - Column 11: `Village Name`
  - Column 14: `Local Body Code` (Gram Panchayat LGD Code)
  - Column 15: `Local Body Name`
- **Validation Status:** `PASSED (100% Valid)`

### Dataset 5: Urban Local Bodies (ULB)
- **Presence in Supplied Archive:** **NOT PRESENT** in `LGD.zip`.
- **Handling per Specification:** Under Rule 4 ("DO NOT fabricate a dataset that is not present... If ULB data does not exist: -> do NOT create fake ULB records"), no fake ULB records are created or imported into the authoritative LGD directory. Only the 4,633 authentic PRI institutions are imported into the authoritative PRI registry.

---

## 3. Administrative Hierarchy Model

```
State: Jharkhand (LGD Code: 20)
 │
 ├── District (24 Districts, LGD Codes: 322 - 345)
 │    │
 │    ├── Development Block (264 Blocks, e.g. Bermo, Kanke, Chas)
 │    │
 │    └── Zila Panchayat (24 Apex District PRIs, e.g. Bokaro ZP LGD: 281, Ranchi ZP LGD: 294)
 │         │
 │         └── Panchayat Samiti (264 Intermediate Block PRIs, e.g. Kanke PS LGD: 2351)
 │              │
 │              └── Gram Panchayat (4,345 Base PRIs, e.g. Armo GP LGD: 111122)
 │                   │
 │                   └── Village (32,526 Villages mapped to GPs)
```

---

## 4. Verification Decoupling Principle

1. **Layer 1 — Institution Verification (LGD-Backed):**
   - Establishes that the local government body exists legally in the Government of India Local Government Directory.
   - Authoritative identity is the unique numeric LGD code (e.g. `111122`).
   - Name matching and fuzzy search are discoverability aids only; canonical resolution is always strictly by LGD code.

2. **Layer 2 — Representative Authority Verification:**
   - Establishes whether a specific authenticated user is an authorized officer, elected representative, or authorized staff of that specific institution.
   - Cannot be granted solely by selecting an institution, entering an LGD code, or having a government email domain.
   - Requires formal review of appointment orders, official ID, or official gazette notifications.
   - Enforced by server-side zero-trust check on every institutional challenge submission.
