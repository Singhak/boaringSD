# MVP Enhancements
## Making System Design Non-Boring

---

# Problem Statement

Most learners know System Design concepts:

- Cache
- Load Balancer
- CDN
- Database Replication
- Message Queues

But during interviews they cannot design complete systems.

Reason:

Learning is passive.

Users watch videos and read articles but never practice thinking through architecture decisions.

---

# MVP Goal

Transform System Design from:

```txt
Theory Consumption
```

into

```txt
Interactive Decision Making
```

Users should learn by:

- Building
- Breaking
- Fixing
- Scaling

systems.

---

# Core Enhancement 1

## Guided Thinking Mode

### Problem

Users become blank when given open-ended questions.

Example:

```txt
Design Twitter
```

Most users don't know where to start.

---

## Solution

Break design process into guided steps.

---

### Step 1

Requirements Discovery

Question:

```txt
What should users be able to do?

A. Create Tweet
B. Read Feed
C. Follow Users
D. All Of The Above
```

---

### Step 2

Identify Core Entities

Question:

```txt
Which entities are needed?

User
Tweet
Follow
Like
```

---

### Step 3

API Design

Question:

```txt
Which API should we create first?

POST /tweet

GET /feed
```

---

### Step 4

High Level Architecture

Question:

```txt
Choose architecture components
```

Available:

```txt
Load Balancer

Server

Database

Cache
```

---

### Outcome

Users learn the System Design thinking process.

Not just concepts.

---

# Core Enhancement 2

## Crash First Learning

### Problem

Definitions are boring.

Example:

```txt
What Is Cache?
```

Users lose attention quickly.

---

### Solution

Show problems first.

---

Scenario:

```txt
Traffic = 10000 requests/sec

Database CPU = 99%

Status:

💥 CRASHED
```

Question:

```txt
How do you fix it?

A. Cache
B. More Database Connections
C. CDN
```

Correct Answer:

```txt
Cache
```

---

### Outcome

Users understand concepts through problem solving.

---

# Core Enhancement 3

## Architecture Evolution Mode

### Goal

Show how systems evolve over time.

---

### Level 1

```txt
100 Users

Users
 |
Server
```

Works ✅

---

### Level 2

```txt
10000 Users

Users
 |
Server

CPU = 95%
```

Warning ⚠

---

### Level 3

```txt
Users
 |
Load Balancer
 |
Servers
```

Works ✅

---

### Level 4

```txt
1M Users
```

Database Bottleneck ⚠

---

### Level 5

```txt
Users
 |
LB
 |
Servers
 |
Cache
 |
Database
```

Works ✅

---

### Outcome

Users see why architecture grows.

Instead of memorizing diagrams.

---

# Core Enhancement 4

## Traffic Simulation Slider

### Feature

Interactive slider.

---

```txt
100 Users
```

Everything healthy.

---

```txt
1000 Users
```

CPU increases.

---

```txt
10000 Users
```

Latency increases.

---

```txt
100000 Users
```

Server crashes.

---

User can add:

```txt
Cache

Load Balancer

CDN

Replica
```

to solve problems.

---

### Outcome

Users understand scaling visually.

---

# Core Enhancement 5

## Mini Interview Mode

### Goal

Reduce interview anxiety.

---

Question:

```txt
Design URL Shortener
```

Timer:

```txt
10 Minutes
```

---

User builds architecture.

After submission:

---

Expected Design:

```txt
Users

↓

Load Balancer

↓

Application Servers

↓

Database

↓

Cache
```

---

User Design:

```txt
Users

↓

Server

↓

Database
```

---

Feedback:

```txt
Missing Load Balancer

Missing Cache

Single Point Of Failure
```

---

### Outcome

Users practice actual interviews.

---

# Core Enhancement 6

## Hint System

Instead of revealing answers directly.

---

Example

```txt
System Crash
```

Hint 1:

```txt
Traffic is unevenly distributed.
```

Hint 2:

```txt
Multiple servers can help.
```

Hint 3:

```txt
Think about a Load Balancer.
```

---

### Outcome

Better retention.

---

# Core Enhancement 7

## Build - Break - Fix Loop

Most Important Learning Cycle

---

Phase 1

Build System

```txt
Users
 |
Server
 |
DB
```

---

Phase 2

Break System

```txt
1M Users

💥 Server Down
```

---

Phase 3

Fix System

```txt
+ Load Balancer
```

