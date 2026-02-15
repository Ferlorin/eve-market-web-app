# EVE Market Web App — Infrastructure & Architecture Brief

## Project Overview

**App:** eve-market-web-app  
**Stack:** Node.js (coupled frontend + backend)  
**Data pattern:** Shared market data consumed by all users — no per-user data storage  
**Data ingestion:** Background job fetches EVE market data on a schedule  
**User profile:** Mix of casual browsers and active traders  
**Target scale:** Up to 1,000 concurrent users  
**Budget:** $0/month ideal, $5/month hard ceiling

---

## Current Problem

The app is currently hosted with a **Neon PostgreSQL** free tier database. Neon's free plan caps storage at **0.5 GB per project**. The app has already hit **100% of its 0.54 GB allowance**, causing the database to be at risk of suspension — inserts, updates, and queries will error until the allowance resets next month or the plan is upgraded.

---

## Why the Current Architecture Is Inefficient for This Use Case

- The data model is **read-heavy, shared data** — every user sees the same market information. There are no relational joins, user-specific rows, or complex SQL queries that justify a relational database.
- A background cron job is the **only write source**. Users only read.
- PostgreSQL (and its per-GB storage billing) is overkill for what is essentially a document/cache retrieval pattern.

---

## Recommended Architecture — $0/Month Stack

### Hosting: Fly.io (Free Tier)

- **3 free shared VMs** (256 MB RAM each) — enough for a Node.js app serving cached data
- Always-on, no cold starts (unlike Render free tier which sleeps after 15 min)
- Deploy the coupled Node.js app as a single service
- Background job / cron runs inside the app process

### Database: MongoDB Atlas (Free M0 Cluster)

- **512 MB storage**, no credit card required, never expires, commercial use allowed
- **500 concurrent connections** — more than enough for 1,000 users
- **No read/write operation limits** — no daily caps on queries
- Document-based model fits market data naturally (items, prices, history as JSON documents)
- Shared RAM/CPU on free tier, but reads on cached shared data are lightweight

### Caching Layer: In-Memory (Node.js)

This is the critical piece that makes the $0 stack viable at 1,000 users.

- Implement a simple in-memory cache (JS `Map` with TTL) inside the Node.js app
- Since the background job updates market data on a fixed schedule (e.g., every 5–15 minutes), cache all DB responses for the duration of that interval
- **Result:** 99% of user requests are served from memory. The database is only queried once per cache refresh cycle, not once per user request
- This dramatically reduces DB load, keeps response times fast, and makes the 512 MB storage limit the only real constraint

### Summary Table

| Layer            | Service              | Cost   | Key Limit                     |
|------------------|----------------------|--------|-------------------------------|
| App Hosting      | Fly.io (free VM)     | $0     | 256 MB RAM, 3 free VMs        |
| Database         | MongoDB Atlas (M0)   | $0     | 512 MB storage, 500 connections |
| Caching          | In-memory (Node.js)  | $0     | Bounded by app RAM             |
| Background Job   | Runs inside app      | $0     | N/A                           |
| **Total**        |                      | **$0** |                               |

---

## Scaling Path — If $0 Stack Hits Limits

### If storage exceeds 512 MB

**Option A — Optimize first (stay at $0):**

- Implement data retention policies: only keep N days of market history in the DB, archive older data as JSON to Cloudflare R2 (10 GB free, zero egress fees)
- Drop unused indexes, compress documents, remove redundant fields
- Only store what the frontend actually displays

**Option B — Upgrade to Neon Launch ($3–5/month):**

- Switch back to Neon PostgreSQL on the Launch plan
- Fully usage-based pricing: storage is $0.35/GB-month, compute is $0.106/CU-hour
- No minimum spend enforced (if you use $3, you pay $3)
- Scale-to-zero reduces compute costs during off-peak hours
- 5 GB of storage = ~$1.75/month. 10 GB = ~$3.50/month
- This stays well under the $5/month ceiling even with growth

### If user count grows beyond 1,000

- The in-memory caching pattern scales linearly — 10,000 users reading from cache costs the same as 100
- Fly.io free VMs have 256 MB RAM; if the app needs more, the smallest paid VM is ~$2/month
- MongoDB Atlas free tier's 500 concurrent connection limit becomes the bottleneck around 2,000+ simultaneous users — at that point, upgrade to Flex tier ($8/month) or switch to Neon Launch

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                   Fly.io (Free VM)               │
│                                                   │
│  ┌─────────────┐    ┌──────────────────────────┐ │
│  │  Background  │    │     Node.js App Server    │ │
│  │  Cron Job    │───▶│                          │ │
│  │  (fetches    │    │  ┌────────────────────┐  │ │
│  │  EVE market  │    │  │  In-Memory Cache   │  │ │
│  │  data)       │    │  │  (TTL = cron       │  │ │
│  └──────┬───────┘    │  │   interval)        │  │ │
│         │            │  └────────┬───────────┘  │ │
│         │ writes     │           │ serves 99%   │ │
│         ▼            │           ▼ of requests  │ │
│  ┌──────────────┐    │     ┌──────────┐         │ │
│  │ MongoDB Atlas │◀───────│  Users   │         │ │
│  │ (Free M0)    │    │     │ (1,000)  │         │ │
│  │ 512 MB       │    │     └──────────┘         │ │
│  └──────────────┘    └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Migration Steps (Neon → MongoDB Atlas)

1. **Export data from Neon** — `pg_dump` or query and export as JSON
2. **Create MongoDB Atlas M0 cluster** — select closest region to Fly.io deployment
3. **Transform schema** — convert relational tables to document collections (market items, price history, etc.)
4. **Import to MongoDB** — use `mongoimport` or the Atlas UI
5. **Update app code** — replace PostgreSQL client/ORM with MongoDB driver (`mongodb` npm package or Mongoose)
6. **Implement in-memory cache** — wrap DB reads with a TTL cache that refreshes on cron interval
7. **Deploy to Fly.io** — configure `fly.toml`, deploy via `fly deploy`
8. **Verify and decommission Neon** — confirm everything works, then delete the Neon project

---

## Key Decisions for the Architect

1. **Cache invalidation strategy** — simple TTL matching the cron interval, or pub/sub notification from the background job when new data lands?
2. **Data retention policy** — how many days/months of market history should live in the DB vs. archived to cold storage?
3. **Document schema design** — flatten vs. nest price history within item documents (affects query patterns and storage efficiency)
4. **Failover** — if MongoDB Atlas free tier has an outage, should the app serve stale cached data or show an error?
5. **Future auth** — if user accounts are added later (watchlists, portfolios), where does that data live? Separate collection in Atlas, or a second service like Supabase Auth?

---

## Alternatives Considered and Rejected

| Option | Why Rejected |
|--------|-------------|
| **Vercel (all-in-one)** | Vercel no longer bundles its own database — uses Neon underneath (same 0.5 GB limit). Serverless functions have 10-second timeout on free tier. Not ideal for coupled backend. |
| **Render free tier** | Free web services sleep after 15 min of inactivity — unacceptable for 1,000 users. Paid tier starts at ~$7/month, exceeds budget. |
| **Supabase free tier** | 500 MB Postgres — same storage ceiling problem. Good if we need auth later, but not solving the core storage issue alone. |
| **Firebase Firestore** | 1 GB storage but 50k reads/day limit. With 1,000 active users refreshing frequently, this cap would be hit quickly. |
| **Staying on Neon Free** | Already maxed out at 0.54 GB. Would require splitting data across multiple projects (hacky, complex, fragile). |
| **Neon Launch ($5/month)** | Viable fallback. Keeps Postgres, fully usage-based, ~$3-5/month for moderate storage. Recommended as Plan B if MongoDB migration is too costly in dev time. |