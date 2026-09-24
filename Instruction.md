# System Design Quest MVP

## Vision

System Design Quest is a gamified learning platform that helps beginners learn System Design through visual simulations, drag-and-drop architecture building, challenges, and instant feedback.

### Mission

Make System Design as engaging as Duolingo and as practical as real engineering systems.

---

# Target Audience

- College Students
- SDE Interview Preparation Candidates
- Backend Beginners
- Self-Taught Developers

---

# MVP Goal

Validate whether users can learn:

- Load Balancer
- Cache
- Database Scaling

through interactive visual learning instead of video lectures.

---

# Success Metrics

- 100+ User Signups
- 50% Lesson Completion Rate
- Average Session Time > 15 Minutes
- 30% Users Reach Level 3

---

# Tech Stack

## Frontend

- Next.js 15 (but no serveside rendring can be hot like stati site)
- TypeScript
- Tailwind CSS
- Shadcn UI
- React Flow
- Framer Motion

## Backend

- Nest.js API Routes

## Database

- PostgreSQL
- Prisma ORM

## Authentication

- NextAuth
- Google Login

## Hosting

- Vercel
- Neon PostgreSQL

---

# MVP Features

## Included

- User Authentication
- Dashboard
- Learning Lessons
- Interactive Simulations
- Architecture Builder
- Scoring Engine
- Progress Tracking
- XP System

## Excluded

- AI Mentor
- Payments
- Multiplayer
- Mobile App
- Video Courses

---

# Project Structure

```txt
src

├── app
│   ├── dashboard
│   ├── learn
│   ├── builder
│   ├── challenge
│   └── profile
│
├── components
│   ├── ui
│   ├── lesson
│   ├── simulation
│   ├── builder
│   └── challenge
│
├── lib
│   ├── prisma
│   ├── scoring
│   ├── simulation
│   └── lessons
│
├── data
│   └── lessons.json
│
└── types
```

---

# Database Schema

## User

```prisma
model User {
  id String @id @default(cuid())

  name String?
  email String @unique

  progress Progress[]

  createdAt DateTime @default(now())
}
```

## Lesson

```prisma
model Lesson {

 id String @id @default(cuid())

 title String

 description String

 level Int

 content Json

 challenges Challenge[]
}
```

## Challenge

```prisma
model Challenge {

 id String @id @default(cuid())

 question String

 options Json

 answer String

 lessonId String
}
```

## Progress

```prisma
model Progress {

 id String @id @default(cuid())

 userId String

 lessonId String

 completed Boolean

 score Int
}
```

---

# Screen 1

## Landing Page

### Hero Section

```txt
Learn System Design Visually

Build Instagram.
Scale Netflix.
Fix Crashes.

[ Start Learning ]
```

### Features

```txt
Interactive Simulations

Drag and Drop Builder

Real System Challenges
```

---

# Screen 2

## Dashboard

### User Stats

```txt
Level
XP
Lessons Completed
Progress
```

### Lesson Cards

```txt
Level 1
Load Balancer

Level 2
Cache

Level 3
Database Scaling
```

---

# Lesson System

Every lesson contains:

1. Concept Explanation
2. Visual Diagram
3. Interactive Simulation
4. Mini Quiz
5. Reward

---

# Lesson 1

## Load Balancer

### Initial State

```txt
1000 Users
      |
      ▼
    Server
```

### Metrics

```txt
CPU: 95%
Latency: 3 Seconds
```

### Learning Objective

Understand why a single server becomes overloaded.

### Action

```txt
Add Load Balancer
```

### Updated System

```txt
1000 Users

      |
      ▼

Load Balancer

   /       \

Server   Server
```

### Updated Metrics

```txt
CPU: 40%
Latency: 300 ms
```

---

# Lesson 2

## Cache

### Scenario

```txt
10000 Users Request Same Product Page
```

### Without Cache

```txt
DB Hits = 10000
```

### Add Cache

```txt
DB Hits = 100
```

### Learning Objective

Understand why cache reduces database load.

---

# Lesson 3

## Database Scaling

### Scenario

```txt
Traffic Increased 10x
```

### Before

```txt
Single Database
```

### Problem

```txt
Database Bottleneck
```

### Add Read Replica

```txt
Read Queries Distributed Across Replicas
```

### Learning Objective

Understand horizontal read scaling.

---

# Challenge System

Every lesson ends with a challenge.

Example:

```txt
Your Website Crashed

What Should Be Added?

A. Cache
B. Load Balancer
C. CDN
```

### Correct Answer

```txt
Load Balancer
```

### Output

```txt
Correct ✅

Explanation:
Traffic overload was caused by a single 