# Retention plan: what would keep me coming back every day?

## Product goal
Increase daily return intent by making the app feel:
- varied enough to avoid boredom
- challenging enough to feel mastery-focused
- personal enough to feel relevant
- rewarding enough to create a streak

## Core retention problem
The app already has strong onboarding and momentum, but the biggest risk is repetition:
- same pattern loop
- similar system-fix challenges
- limited open-ended design thinking
- fewer reasons to come back once the novelty fades

The fix is to create 3 layers of daily value:
1. quick win
2. meaningful challenge
3. personal progression

## North-star daily experience
Every day, the user should be able to do one of these:
- a fast 5–10 minute challenge
- a deeper design exercise
- a review or defense task
- a “build a better architecture” mini-lab
- a comparison against a prior solution

The app should feel like a daily practice ritual, not a monthly campaign.

## Feature plan

### 1. Daily challenge rotation
Create a rotating set of daily prompts across several domains.

Examples:
- chat systems
- payments
- news feed
- search
- notifications
- video streaming
- auth at scale
- global inventory

Each daily challenge should vary by:
- scale
- latency target
- cost sensitivity
- consistency requirement
- failure mode

This keeps the app from feeling like the same “incident repair” routine.

Deliverable:
- one challenge per day
- 5–7 challenge archetypes
- randomized constraints
- difficulty-based progression

### 2. Open-ended design tasks
The app should not only ask “choose the right fix,” but also:
- “design this from scratch”
- “what would you optimize first?”
- “which constraint matters most?”
- “what tradeoff would you accept?”

This introduces real system design thinking instead of pattern matching.

Deliverable:
- 3–5 open-ended scenario templates
- answer format with structured reasoning
- rubric-based scoring
- feedback on tradeoff quality

### 3. Decision pressure and constraint variation
Make each challenge feel different by varying the priority:
- optimize for uptime
- optimize for cost
- optimize for low latency
- optimize for consistency
- optimize for simplicity

This prevents the user from learning one static blueprint.

Deliverable:
- reusable challenge metadata model
- constraint tags
- scoring weights tied to goals

### 4. Compare design vs. ideal design
This is one of the highest-value retention features.

After solving a problem, show:
- what a strong design likely emphasizes
- where the user was strong
- where the design was weak
- how the tradeoff differs from the ideal answer

This creates learning feedback immediately instead of only score-based reward.

Deliverable:
- post-solution comparison panel
- tradeoff breakdown
- “why this was strong/weak” explanations

### 5. Streak-based daily rituals
The app already has streak logic, but it needs stronger ritual behavior:
- daily 5-minute “warmup”
- deeper 20-minute “challenge”
- weekly master challenge
- review day
- defense/reflection day

This turns learning into a repeatable system.

Deliverable:
- daily challenge queue
- 3-level daily plan
- automatic next action recommendation
- streak milestones

## Implementation phases

### Phase 1: retention foundation
Focus:
- daily challenge engine
- challenge taxonomy
- randomized constraints
- streak loop

Goals:
- make the app feel fresh each day
- keep the first 10 minutes engaging

### Phase 2: strategic variety
Focus:
- open-ended design exercises
- multi-domain challenge library
- tradeoff-based evaluation

Goals:
- reduce repeat fatigue
- make deeper learning more rewarding

### Phase 3: personalization and adaptive review
Focus:
- recommend challenge types based on user weak spots
- surface spaced review prompts
- track repeated mistakes and weakness clusters

Goals:
- make the app feel tailored
- improve retention by relevance

### Phase 4: social and competitive retention
Focus:
- leaderboard or compare mode
- challenge of the week
- “design against peer” prompts

Goals:
- boost motivation beyond intrinsic learning

## Success metrics
Evaluate this by:
- daily active return rate
- average session count per user per week
- completion of 3+ challenge types per week
- proportion of users who return after week 2
- time spent in open-ended design flows
- ratio of replay vs new challenge

A healthy target:
- users feel the app is worth opening daily
- no single challenge type dominates the experience
- the design tasks feel like real engineering decisions, not a memorization game

## Build order
1. daily challenge rotation
2. constraint variation
3. open-ended design tasks
4. compare/feedback layer
5. adaptive recommendation
6. social leaderboard or weekly challenge

This order creates immediate retention improvements without overbuilding too early.

## Final product principle
The app should not just teach architecture patterns.
It should teach:
- how to reason under constraints
- how to choose tradeoffs
- how to recover from imperfect designs
- how to think like a real system designer

That is the real reason someone comes back every day.
