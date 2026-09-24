# System Design Quest MVP 🚀

A gamified learning platform that helps developers master System Design through visual simulations, drag-and-drop architecture building, interactive challenges, and instant feedback.

---

## 🌟 Tech Stack

- **Framework**: Next.js 15 / 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + Cyber Glassmorphic Theme
- **Interactive Canvas**: React Flow (`@xyflow/react`)
- **Animation & Physics**: Framer Motion + Web Audio API Sound Generator + Confetti
- **Database**: PostgreSQL (Docker container) + Prisma ORM
- **Icons**: Lucide React

---

## 🚀 Quick Start Guide

### 1. Start PostgreSQL with Docker
```bash
docker compose up -d
```

### 2. Push Schema & Seed Curriculum Data
```bash
npx prisma db push
npx prisma db seed
```

### 3. Start Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🕹️ Features Implemented

### 1. Landing Page (`/`)
- Hero section: *"Learn System Design Visually. Build Instagram. Scale Netflix. Fix Crashes."*
- Interactive hero micro-simulation (test traffic spikes and observe instant CPU/latency reactions)
- Feature cards showcasing visual simulations, architecture builder, and outage triage challenges

### 2. Dashboard (`/dashboard`)
- User Level, Rank Title (*Novice Architect* -> *Principal Infrastructure Lead*)
- Real-time XP meter, daily learning streak, and curriculum progress tracker
- Quest roadmap for:
  - **Level 1**: Load Balancer
  - **Level 2**: Cache (Redis)
  - **Level 3**: Database Scaling & Read Replicas
- Badges & achievements showcase (*Traffic Controller*, *Speed Demon*, *Cluster Engineer*, *Outage Hero*, *System Design Ace*)

### 3. Interactive Guided Lessons (`/learn/[lessonId]`)
- Real-time interactive architecture stage with live packet flow animations
- Dynamically deploy components (e.g. Load Balancer, Redis Cache, Read Replicas)
- Live metric gauges (CPU Load %, Latency ms, Database Hits, Error Rate)
- Level-up celebration modal with confetti and Web Audio sound chimes

### 4. Incident Triage Challenges (`/challenge/[challengeId]`)
- Real-world production crisis scenarios (e.g. *Your Website Crashed!*, *Database Disk I/O Saturation*, *The 95/5 Read-Write Ratio*)
- Instant choice feedback with detailed architectural explanations and XP rewards

### 5. Architecture Builder Playground (`/builder`)
- Drag-and-drop React Flow canvas with custom styled nodes:
  - Client / Users Fleet
  - Load Balancer (Reverse Proxy)
  - Web & API Servers
  - Redis Cache
  - PostgreSQL Master Database
  - Read Replicas
  - Cloudflare CDN
- Live traffic load slider (1,000 to 50,000 req/s) with real-time bottleneck diagnostics engine!
