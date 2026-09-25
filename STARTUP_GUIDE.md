# SamadhanSetu — Platform Startup Guide

This guide provides simple, step-by-step instructions to start all **4 platform services**: the **PostgreSQL Database**, **NestJS Backend API**, **Next.js Web Portal**, and the **Expo SDK 57 Mobile Application**.

---

## 🚀 Quick Overview: 4 Terminals to Launch

| Terminal | Service | Working Directory | Command | Port / URL |
| :--- | :--- | :--- | :--- | :--- |
| **Terminal 1** | **PostgreSQL Database** | `backend` | `node scripts/run-dev-postgres.js` | `localhost:5432` |
| **Terminal 2** | **Backend API (NestJS)** | `backend` | `npm run start:dev` | [http://localhost:3001/api](http://localhost:3001/api) |
| **Terminal 3** | **Web Frontend (Next.js)** | `frontend` | `npm run dev` | [http://localhost:3000](http://localhost:3000) |
| **Terminal 4** | **Mobile App (Expo SDK 57)** | `mobile` | `npx expo start` | Metro `http://localhost:8081` |

---

## Step 1: Start the PostgreSQL Database

Open **Terminal 1**:

```powershell
cd backend
node scripts/run-dev-postgres.js
```
*(Or if using Docker: `docker compose up -d postgres`)*

> **Database Credentials:** Host: `localhost`, Port: `5432`, User: `postgres`, Password: `postgres_password`, Database: `samadhan_setu`.

---

## Step 2: Database Migration & Seeds (First-Time Setup Only)

If starting on a fresh database, run migrations and seeds in `backend/`:

```powershell
cd backend
npm run migration:run
npm run seed:run
```

---

## Step 3: Start the Backend API

Open **Terminal 2**:

```powershell
cd backend
npm run start:dev
```
- **API URL:** [http://localhost:3001/api](http://localhost:3001/api)
- **Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## Step 4: Start the Web Frontend

Open **Terminal 3**:

```powershell
cd frontend
npm run dev
```
- **Web Portal:** [http://localhost:3000](http://localhost:3000)

---

## Step 5: Start the Mobile Application (Expo SDK 57)

Open **Terminal 4**:

```powershell
cd mobile
npx expo start
```

### Running on Your Device or Emulator:
- **Expo Go (Physical Phone):**
  1. Open the **Expo Go** app on your phone (Expo SDK 57).
  2. Ensure your phone is connected to the same Wi-Fi network as this PC.
  3. Scan the QR code displayed in the terminal or enter `exp://<YOUR_PC_IP>:8081` (e.g. `exp://10.143.51.59:8081`).
- **Android Emulator:** Press `a` in the terminal (automatically routes to `http://10.0.2.2:3001/api`).
- **iOS Simulator:** Press `i` in the terminal.
- **Web Preview:** Press `w` in the terminal.

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Primary Interface & Workflow |
| :--- | :--- | :--- | :--- |
| **Citizen (Mobile)** | `citizen@example.com` | `Password123!` | Mobile App (`report/new` wizard, my reports, alerts) |
| **Citizen (Web)** | `citizen@dev.local` | `CitizenDev123!` | Web Portal (`/challenges/new`, `/my-challenges`) |
| **Government Officer** | `officer@jharkhand.gov.in` | `Officer123!` | Web Portal (`/reviewer-queue` for Problem Intelligence & Clusters) |
| **Platform Admin** | `admin@dev.local` | `AdminDev123!` | Web Portal (`/government-dashboard` analytics & management) |
| **University Researcher** | `dean@nitjsr.ac.in` | `NitJsr123!` | Web Portal (Open Solution Workspace, Multidisciplinary Teams) |
| **Industry Partner** | `contact@tatasteel.com` | `TataSteel123!` | Web Portal (Consortium co-funding & contribution delivery) |

---

## 🧪 System Verification & Regression Tests

To verify all 14 test suites (backend foundation, AI clustering, problem intelligence, and mobile citizen E2E flow):

```powershell
cd backend
npx ts-node -r tsconfig-paths/register test/run-all-tests.ts
```
**Expected Result:** `14 / 14 suites passed, 622 / 622 assertions passed (100%)`.

To verify Mobile TypeScript types:
```powershell
cd mobile
npm run typecheck
```
**Expected Result:** `0 errors`.
