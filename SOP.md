# Standard Operating Procedure (SOP)
## FinanceNeo — AI-Powered Personal Finance Management System

---

**Document ID:** SOP-FN-001  
**Version:** 1.0  
**Date:** April, 2026  
**Classification:** Project Examination — External Viva-Voce  

---

### 1. Document Control

| Field | Details |
|-------|---------|
| **Project Title** | FinanceNeo — AI-Powered Personal Finance Management System |
| **Candidate Name** | Abhijeet Gautam (23SCSE1670008) |
| **Program** | BCA (Data Analytics) |
| **Session** | 2025–26 |
| **Supervisor** | Dr. Rohit Kumar Gupta |
| **Institution** | School of Computer Applications and Technology, Galgotias University, Greater Noida, India |
| **Repository** | `https://github.com/Abhij134/finance-tracker` |
| **Live Deployment** | `https://financeneo.netlify.app` |

---

### 2. Purpose and Scope

This Standard Operating Procedure (SOP) provides step-by-step instructions for the installation, environment configuration, database initialization, and execution of the FinanceNeo full-stack web application. It is intended for use during the university project examination (Viva-Voce) to demonstrate the project in a running state on the examiner's or candidate's local development machine.

**Scope:**
- Local development environment setup
- Dependency installation and verification
- Secure environment variable configuration
- Database schema provisioning via Prisma ORM
- Development server startup and accessibility verification

**Out of Scope:**
- Production deployment to Vercel or Netlify
- CI/CD pipeline configuration
- SSL/TLS certificate generation for production

---

### 3. System Prerequisites

Before proceeding with installation, ensure that the host machine meets the following minimum hardware and software requirements.

#### 3.1 Operating System
- **Windows:** Windows 10/11 (64-bit) with Windows Subsystem for Linux (WSL2) recommended for native Unix tooling
- **macOS:** macOS Ventura (13.x) or later
- **Linux:** Ubuntu 22.04 LTS or equivalent Debian-based distribution

#### 3.2 Runtime Environment
| Component | Minimum Version | Recommended Version | Verification Command |
|-----------|-----------------|---------------------|----------------------|
| Node.js | v20.0.0 LTS | v20.11.0 LTS | `node --version` |
| npm | v10.0.0 | v10.2.4 | `npm --version` |
| pnpm (optional) | v8.0.0 | v8.15.0 | `pnpm --version` |
| Git | v2.40.0 | v2.43.0 | `git --version` |

> **Note:** Node.js v20.x LTS is strictly required because Next.js 14 App Router features and certain native APIs (e.g., `fetch` with `Request`/`Response` streaming) are not fully compatible with Node.js v18 or earlier.

#### 3.3 Browser Requirements
The application is optimized for the following modern browsers:
- Google Chrome v120+ (recommended for full feature support)
- Mozilla Firefox v121+
- Microsoft Edge v120+
- Safari v17+ (macOS only; limited Web Push support on iOS)

#### 3.4 Network Requirements
- Stable broadband connection (minimum 10 Mbps)
- Unrestricted outbound HTTPS (port 443) for Supabase, Vercel, and AI API endpoints
- Localhost access on port 3000 (development server)

#### 3.5 Development Hardware (Minimum)
| Component | Specification |
|-----------|---------------|
| Processor | Intel Core i5 / AMD Ryzen 5 (8th Gen+) or Apple Silicon M1+ |
| RAM | 8 GB minimum; 16 GB recommended for Next.js dev server with HMR |
| Storage | 20 GB free disk space (project + `node_modules` + build cache) |
| Display | 1280×720 minimum; 1920×1080 recommended for dashboard visualization |

---

### 4. Step 1: Project Installation

#### 4.1 Clone the Repository
Open a terminal and execute the following commands to clone the project source code from the remote repository to your local machine:

```bash
# Navigate to the directory where you wish to store the project
cd ~/Documents/projects

# Clone the repository
git clone https://github.com/Abhij134/finance-tracker.git

# Enter the project directory
cd finance-tracker
```

#### 4.2 Install Dependencies
Install all required Node.js packages using the project's lockfile to ensure version consistency:

```bash
# Using npm (recommended for examination consistency)
npm install

# OR using pnpm (if pnpm is installed globally)
pnpm install
```

> **Expected Output:** The terminal will display a progress bar indicating package resolution and installation. Upon completion, a `node_modules` directory will be created in the project root, and the terminal will return to the prompt without error messages.

#### 4.3 Verify Installation
Confirm that all critical packages are installed correctly:

```bash
# Verify Next.js installation
npx next --version
# Expected: 14.x.x

# Verify Prisma installation
npx prisma --version
# Expected: 5.x.x

# Verify TypeScript compiler
npx tsc --version
# Expected: 5.x.x
```

---

### 5. Step 2: Environment Configuration

FinanceNeo requires several external service credentials and configuration variables to function correctly. These values are **never** hard-coded in the source code and must be supplied via environment variables at runtime.

#### 5.1 Create the Environment File
In the project root directory, create a new `.env` file by copying the provided template:

```bash
cp .env.example .env
```

#### 5.2 Required Environment Variables
Open `.env` in any text editor and populate the following variables. **Do not commit this file to version control.**

```ini
# ============================================
# Supabase Configuration
# ============================================
# Supabase project URL (found in Supabase Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co

# Supabase anonymous/public API key (found in Supabase Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# ============================================
# Database Connection
# ============================================
# PostgreSQL connection string with pgbouncer compatibility
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true
DATABASE_URL=<your-supabase-connection-string>

# ============================================
# Web Push Notification (VAPID)
# ============================================
# VAPID public key (generated via web-push CLI or online VAPID generator)
VAPID_PUBLIC_KEY=<your-vapid-public-key>

# VAPID private key (keep secret; never expose to client)
VAPID_PRIVATE_KEY=<your-vapid-private-key>

# ============================================
# AI Service Providers (Primary + Fallback)
# ============================================
# Google Gemini API key (primary LLM provider)
GEMINI_API_KEY=<your-gemini-api-key>

# Optional: Novita AI API key (fallback provider)
NOVITA_API_KEY=<your-novita-api-key>

# Optional: Open Router API key (fallback aggregator)
OPENROUTER_API_KEY=<your-openrouter-api-key>

# ============================================
# Application Configuration
# ============================================
# Base URL for absolute link generation in exports and notifications
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 6. Step 3: Database Initialization

FinanceNeo uses Prisma ORM v5.x to manage the PostgreSQL database schema hosted on Supabase. The following steps generate the type-safe Prisma Client and synchronize the database schema.

#### 6.1 Generate the Prisma Client
The Prisma Client is a type-safe database client auto-generated from the `prisma/schema.prisma` file. It provides TypeScript types for all database models (User, Transaction, Budget, WebPushSubscription).

```bash
npx prisma generate
```

> **Expected Output:** The terminal will display: `✔ Generated Prisma Client (v5.x.x | library)` followed by a list of generated model types.

#### 6.2 Push the Database Schema
Push the schema defined in `prisma/schema.prisma` to the connected Supabase PostgreSQL instance. This creates all required tables, indexes, and constraints without requiring manual SQL execution.

```bash
npx prisma db push
```

> **Expected Output:** The terminal will display a diff of schema changes and prompt for confirmation. Type `y` and press Enter. Upon success, the message `🚀 Your database is now in sync with your Prisma schema.` will appear.

#### 6.3 Verify Database Connectivity
Confirm that the application can connect to the database by running the Prisma Studio GUI:

```bash
npx prisma studio
```

> **Expected Behavior:** A browser window opens at `http://localhost:5555` displaying the Prisma Studio interface with tables for `Transaction`, `Budget`, and `WebPushSubscription`. If the tables are visible and empty, the schema push was successful.

> **To exit Prisma Studio:** Return to the terminal and press `Ctrl + C`.

---

### 7. Step 4: Application Execution

#### 7.1 Start the Development Server
Launch the Next.js development server with Hot Module Replacement (HMR) enabled:

```bash
npm run dev
```

> **Alternative with pnpm:** `pnpm dev`

#### 7.2 Access the Running Application
Once the server initializes, open a web browser and navigate to:

```
http://localhost:3000
```

> **Expected Behavior:** The FinanceNeo landing page loads, displaying the application title, feature highlights, and a "Get Started" or "Sign In" button. The terminal will show compilation logs, and the browser will display a fully interactive application.

#### 7.3 Verify Key Endpoints
After the application loads, verify the following critical endpoints are accessible:

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `http://localhost:3000` | Landing page | FinanceNeo homepage with marketing content |
| `http://localhost:3000/login` | Authentication | Supabase Auth login/registration form |
| `http://localhost:3000/dashboard` | Main dashboard | Stat cards, charts, and transaction list (requires login) |
| `http://localhost:3000/api/health` | Health check | JSON response `{ "status": "ok" }` (if implemented) |

#### 7.4 Stopping the Server
To terminate the development server, return to the terminal window and press:

```bash
Ctrl + C
```

Confirm the shutdown by typing `Y` when prompted.

---

### 8. Troubleshooting Guide

| Symptom | Probable Cause | Resolution |
|---------|---------------|------------|
| `npm install` fails with EACCES | Insufficient permissions on `node_modules` | Run `sudo npm install` (Linux/macOS) or delete `node_modules` and retry |
| `npx prisma generate` throws "Cannot find module" | Prisma CLI not installed globally | Run `npm install -g prisma` or use `npx prisma generate` from project root |
| `npx prisma db push` times out | Invalid `DATABASE_URL` or firewall blocking port 5432 | Verify `.env` DATABASE_URL format; ensure outbound port 5432 is open |
| `npm run dev` shows "Port 3000 already in use" | Another process occupies port 3000 | Kill existing process: `npx kill-port 3000` or specify alternate port: `npm run dev -- --port 3001` |
| Dashboard shows "Authentication required" | Supabase credentials missing or invalid | Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env` |
| PDF upload fails silently | Browser lacks WebAssembly support | Use Chrome v120+; verify `pdfjs-dist` loaded in browser DevTools Network tab |
| AI chatbot returns generic error | AI API keys missing or rate-limited | Verify `GEMINI_API_KEY` in `.env`; check provider dashboard for quota status |

---

### 9. Post-Execution Checklist for Viva-Voce

Use this checklist to ensure the system is fully operational before the examination begins:

- [ ] Repository cloned successfully from `https://github.com/Abhij134/finance-tracker`
- [ ] `node_modules` installed without errors (`npm install` completed)
- [ ] `.env` file created from `.env.example` with all required variables populated
- [ ] `npx prisma generate` executed successfully (Prisma Client types generated)
- [ ] `npx prisma db push` executed successfully (database schema synchronized)
- [ ] `npm run dev` started without compilation errors
- [ ] Application accessible at `http://localhost:3000` in browser
- [ ] User registration/login functional via Supabase Auth
- [ ] Dashboard loads with stat cards, charts, and transaction list
- [ ] Manual transaction entry functional (add income/expense)
- [ ] PDF bank statement upload and AI extraction functional
- [ ] Budget creation and Safe-to-Spend calculator displaying values
- [ ] AI chatbot responding to natural language financial queries
- [ ] Web Push notification toggle accessible in settings (optional for demo)

---

### 10. Document Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | April 2026 | Abhijeet Gautam | Initial SOP for ETE Viva-Voce examination |

---

**End of Document**

---

*Prepared by Abhijeet Gautam (23SCSE1670008), BCA (Data Analytics), Session 2025–26, under the supervision of Dr. Rohit Kumar Gupta, School of Computer Applications and Technology, Galgotias University, Greater Noida, India.*
