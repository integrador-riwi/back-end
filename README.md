#  TeamUp — Project Management Platform

> Platform for managing teams, projects, evaluations, and public voting at  tech events.

 **Live project:** [https://team-up.crudzaso.com](https://team-up.crudzaso.com)

---

##  Table of Contents

- [What is TeamUp?](#-what-is-teamup)
- [General Architecture](#-general-architecture)
- [System Modules](#-system-modules)
- [Technologies](#-technologies)
- [Environment Variables](#-environment-variables)
- [Running Locally](#-running-locally)
- [Main API Endpoints](#-main-api-endpoints)
- [Live Demo](#-live-demo)
- [Team](#-team)

---

## What is TeamUp?

**TeamUp** is a full-stack Single Page Application built to centralize the management of collaborative events such as hackathons, integrative projects, and innovative coding challenges. From team formation and GitHub repository automation to AI-powered project search and real-time QR voting — everything lives in one platform.

The main roles are **ADMIN**, **TEAM_LEAD**, and **USER**. Each role has differentiated access to the system's features.

---
## Overview

TeamUp was built to solve a real pain point at **RIWI**: collaborative events like the *Proyecto Integrador* were managed through a fragmented collection of spreadsheets, discord groups, and manual processes. TeamUp replaces all of that with a single, role-aware platform.

**The problem it solves:**

| Before TeamUp | With TeamUp |
|---|---|
| Scattered information across tools | Single source of truth for the entire event |
| Manual GitHub repo setup per team | Automatic repo + permissions via n8n workflow |
| Paper/spreadsheet evaluations | Structured rubric-based scoring with area TLs |
| No public participation mechanism | QR code voting with live real-time results |
| No ranking transparency | Weighted automatic ranking (80/20 formula) |
| Duplicate/redundant projects go undetected | AI-powered semantic similarity search |


## General Architecture

The project is split into three independent repositories:

```
/
├── back-end/        → REST API with Node.js + Express + PostgreSQL
└── front-end/       → SPA with Vanilla JavaScript + Vite
└── docs/            → Docusaurus Documentation
```

The backend exposes a REST API at `/api/*` and also manages real-time connections via **Socket.IO**. The frontend consumes the API and communicates with the socket server to update voting results live.

Backend and Frontend repositories, both run independently in development and integrate through CORS configured on the backend.

---

## System Modules

### Auth
User registration, login, and token refresh with JWT. OAuth support for **GitHub** and **Google (Firebase)**. Tokens are managed via `httpOnly` cookies.

### Users
User profile management. Profile photo upload via Cloudinary.

### Teams
Team creation and administration. Email invitations and join requests.

### Projects
Each team registers their project with a name, description, and preview photo. Projects are linked to an event.

### Events
Admins create and configure events. Each event groups teams, projects, and evaluation sessions.

### Evaluations
Criteria-based evaluation system. Evaluators grade projects and the system calculates the weighted final score.

### Ranking
Automatic team ranking calculated from evaluations. Used to determine finalists for each event.

### Finalists
Module for approving and publishing the finalists podium for an event.

### QR Votes
Public voting via QR code. The admin generates a QR pointing to a public page where attendees vote for their favorite project. Results update in real time with Socket.IO. Includes IP-based anti-fraud.

### Comments
Comments on projects, visible in the project detail view.

### Emails
Transactional email sending with Nodemailer for invitation and assignment notifications.

### Upload
File and image uploads to Cloudinary.

### GitHub Integration
Webhook to record activity from GitHub repositories linked to projects. GitHub OAuth authentication support.

---
## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Vanilla JS (ES Modules) | ES2023 | Core SPA logic — no framework overhead |
| Vite | 5.x | Build tool, HMR, environment variables |
| Bootstrap 5 | 5.3 | Responsive layout and components |
| Socket.IO Client | 4.x | Real-time bi-directional communication |
| i18next | 25.x | Internationalization (ES/EN) |
| SileoToast | custom | Notification system |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 20.x / 4.x | REST API server |
| PostgreSQL | 16 | Primary relational database |
| pgvector | 0.7 | Vector similarity search for AI features |
| Socket.IO | 4.x | Real-time event broadcasting |
| JSON Web Token | 9.x | Stateless auth with refresh token rotation |
| Cloudinary SDK | 2.x | Media storage and transformation |
| n8n | cloud | GitHub automation workflow |
| OpenAI API | v1 | Text embeddings for semantic search |

### Infrastructure
| Service | Role |
|---|---|
| **Vercel** | Frontend hosting with preview deployments per branch |
| **Railway** | Backend API + PostgreSQL database |
| **Cloudinary** | Media CDN for deliverables and profile images |
| **GitHub** | Source control + OAuth provider + project repositories |

---

### Custom SPA Router
```
Router
  ├── route registry     ← maps paths to view functions
  ├── ROUTE_PERMISSIONS  ← maps paths to allowed roles
  ├── navigate(path)     ← pushState + view rendering
  └── onLangChange()     ← re-renders current view on language switch
```

The router enforces **RBAC at the client level** (mirrored server-side). Unauthenticated or unauthorized users are redirected before any view renders.

### View Lifecycle
```
navigate(path)
  → matchRoute()
    → checkPermissions()
      → destroyCurrentView()     ← cleanup listeners & sockets
        → renderView()           ← inject HTML into #app
          → initView()           ← bind events, fetch data, connect sockets
```

### Backend Structure
```
src/
  ├── routes/         ← Express routers per resource
  ├── controllers/    ← Request handlers
  ├── services/       ← Business logic
  ├── middlewares/    ← Auth, RBAC, validation
  ├── models/         ← DB query functions (raw SQL + pg)
  └── sockets/        ← Socket.IO event handlers
```
---

### Database

Migrations are located in `back-end/src/db/migrations/`. Run them in order against your PostgreSQL database:

```
001_initial.sql
002_refresh_tokens.sql
003_github_tokens.sql
004_teams_invitations.sql
005_projects_fields.sql
005_team_join_requests.sql
006_events_table.sql
007_events_github_org.sql
008_create_crudzaso_event.sql
009_project_submitted.sql
```

You can run them from the Supabase SQL Editor or with `psql`:

```bash
psql $DATABASE_URL -f src/db/migrations/001_initial.sql
```

---
## Roles & Permissions

| Role | Description | Key Capabilities |
|---|---|---|
| `ADMIN` | Event organizer | Full platform control, close/open evaluations, manage finalists, generate QR |
| `STAFF` | Support staff | View all projects and results, assist with event operations |
| `TL_DEVELOPMENT` | Dev area lead | Evaluate projects in the Development rubric area |
| `TL_SOFT_SKILLS` | Soft skills lead | Evaluate projects in the Soft Skills rubric area |
| `TL_ENGLISH` | English area lead | Evaluate projects in the English rubric area |
| `CODER` | Participant | Create teams, register projects, vote, view rankings |
| `PUBLIC` | Unauthenticated | Access QR voting page and public finalist view |

> **Note:** A maximum of **3 evaluators per area** is enforced. Once 3 TLs from the same area have submitted evaluations for a team, the area is locked.

---

## Main API Endpoints

All endpoints are under the `/api` prefix.

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/health` | Server status | No |
| POST | `/auth/register` | User registration | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/refresh` | Refresh access token | Cookie |
| GET | `/users` | List users | JWT |
| GET | `/teams` | List teams | JWT |
| POST | `/teams` | Create team | JWT |
| GET | `/projects` | List projects | JWT |
| GET | `/events` | List events | JWT |
| POST | `/events` | Create event | JWT (ADMIN) |
| GET | `/events/:eventId/ranking` | Event ranking | JWT |
| POST | `/evaluations` | Submit evaluation | JWT |
| POST | `/qr-votes` | Create QR voting session | JWT |
| GET | `/qr-votes/event/:id` | List QRs for an event | JWT |
| GET | `/qr-votes/event/:eventId/results` | Vote results | JWT |
| PATCH | `/qr-votes/:id/toggle` | Enable/disable QR | JWT |
| DELETE | `/qr-votes/event/:eventId/votes` | Delete all votes for event | JWT (ADMIN) |
| GET | `/qr-votes/vote/:eventId/projects` | Projects available for voting | No |
| POST | `/qr-votes/vote` | Register public vote | No |
| POST | `/finalists` | Calculate finalists | JWT |

---

## Environment Variables

### Backend — `.env`

Create the `.env` file at the root of the `back-end/` project:

```env
# Server
PORT=3010
NODE_ENV=development

# Database (PostgreSQL / Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
DB_HOST=db.[project].supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=a_very_secure_secret
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3010/api/auth/github/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_URL=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# n8n (optional)
N8N_WEBHOOK_URL=

# Frontend URL (for email links and QR codes)
CLIENT_URL=http://localhost:5173
PUBLIC_URL=http://localhost:5173

# Moodle (optional)
MOODLE_URL=
MOODLE_TOKEN=

# Google AI (optional)
OPENAI_API_KEY=
```

### Frontend — `.env`

Create the `.env` file at the root of the `front-end/` project:

```env
VITE_API_URL=http://localhost:3010/api
VITE_SOCKET_URL=http://localhost:3010
```

---

## Running Locally

### Prerequisites

- Node.js >= 20
- pnpm (`npm install -g pnpm`)
- Access to a PostgreSQL database (you can use Supabase on the free plan)

---

### 1. Clone the repositories

```bash
git clone https://github.com/your-org/back-end.git
git clone https://github.com/your-org/front-end.git
```

---

### 2. Set up and run the Backend

```bash
cd back-end

# Install dependencies
pnpm install

# Create the environment variables file
cp .env.example .env
# → Edit .env with your credentials (see Environment Variables section)

# Start in development mode (with nodemon)
pnpm dev
```

The server will be running at `http://localhost:3010`.

You can verify it's working at: `http://localhost:3010/api/health`

---

### 3. Set up and run the Frontend

```bash
cd front-end

# Install dependencies
pnpm install

# Create the environment variables file
# Create a .env file with the content from the section above

# Start in development mode
pnpm dev
```

The frontend will be available at `http://localhost:5173`.

---


## Team

Developed by **Team Up**

| Name |
|---|
| Daniela Quinto Rios |
| Veronica Martinez Cadavid |
| Sebastian Vargas Ramirez |
| Diego Alejandro Morales Montoya |
