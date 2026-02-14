---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# eve-market-web-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for eve-market-web-app, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR1:** System can fetch market order data from all EVE Online regions via ESI API

**FR2:** System can store fetched market data in database for query performance

**FR3:** System can automatically refresh market data every 30 minutes via background job

**FR4:** System can track timestamp of last successful data fetch for each region

**FR5:** System can handle ESI API failures gracefully and log errors for debugging

**FR6:** System can fetch market data in parallel across multiple regions to minimize total fetch time

**FR7:** System can respect ESI API rate limits (150 requests/second maximum)

**FR8:** System can skip private structures that require authentication

**FR9:** Users can select a "buy market" from a list of all available EVE regions

**FR10:** Users can select a "sell market" from a list of all available EVE regions

**FR11:** Users can search/filter region list using autocomplete functionality

**FR12:** Users can navigate region selection using keyboard (arrow keys, enter, escape)

**FR13:** System can prevent selection of same region for both buy and sell markets

**FR14:** System can calculate ROI for all items between selected buy and sell markets

**FR15:** System can display ALL profitable opportunities (no pagination or arbitrary limits)

**FR16:** Users can view opportunity details: item name, buy station, sell station, buy price, sell price, ROI %, quantity

**FR17:** Users can sort opportunities by any column (ROI, price, quantity, item name, station)

**FR18:** Users can re-sort dynamically by clicking column headers

**FR19:** System can render large datasets (10,000+ opportunities) efficiently

**FR20:** Users can see data freshness via "Last updated" timestamp display

**FR21:** Users can switch between light and dark visual themes

**FR22:** System can persist user theme preference across sessions

**FR23:** System can detect system theme preference (prefers-color-scheme) on first visit

**FR24:** Users can navigate the interface using keyboard (tab, enter, escape, arrows)

**FR25:** Administrators can view background job execution logs

**FR26:** Administrators can manually trigger data fetch jobs for recovery scenarios

**FR27:** System can display clear error messages when data fetch fails

**FR28:** System can communicate stale data state to users (show last successful update time)

**FR29:** Administrators can access system health indicators (job status, data age, error counts)

### NonFunctional Requirements

**NFR-P1:** Initial page load must complete in < 2 seconds on modern desktop browsers

**NFR-P2:** Time to Interactive (TTI) must be < 2.5 seconds

**NFR-P3:** First Contentful Paint (FCP) must occur within 1 second

**NFR-P4:** Table rendering with 10,000+ opportunities must complete in < 500ms

**NFR-P5:** Client-side sorting operations must complete in < 200ms

**NFR-P6:** Region selection autocomplete must respond in < 100ms

**NFR-P7:** ROI calculations for selected markets must complete in < 500ms server-side

**NFR-P8:** Initial JavaScript bundle must be < 500KB (gzipped)

**NFR-P9:** API response payload for ROI opportunities must be < 2MB per query

**NFR-I1:** System must respect ESI API rate limit of 150 requests/second maximum

**NFR-I2:** System must implement exponential backoff for ESI API 503 errors (starting at 5 seconds)

**NFR-I3:** Background job must retry failed API calls up to 3 times before marking job as failed

**NFR-I4:** System must log all ESI API errors with timestamps, endpoints, and error codes for debugging

**NFR-I5:** System must cache ESI responses to minimize redundant API calls

**NFR-I6:** Background job must complete full region data fetch within 30-minute window

**NFR-I7:** System must display timestamp of last successful data fetch prominently to users

**NFR-I8:** System must communicate stale data state when fetch age exceeds 45 minutes

**NFR-M1:** Local development environment must be reproducible via Docker Compose with single command startup

**NFR-M2:** Code must follow consistent style guide (enforced by linter) for long-term maintainability

**NFR-M3:** All background jobs must produce structured logs for debugging (JSON format with timestamps)

**NFR-M4:** System maintenance must require < 30 minutes per week on average

**NFR-M5:** Deployment process must be automated via CI/CD (one command deploy to production)

**NFR-M6:** Database migrations must be reversible for safe rollback scenarios

**NFR-M7:** System must provide health check endpoint for monitoring job status and data age

**NFR-M8:** Error logs must include sufficient context (stack traces, request IDs) for debugging without additional tools

**NFR-M9:** Administrators must be able to manually trigger background jobs for recovery scenarios

**NFR-R1:** System must maintain 95% uptime (acceptable: ~36 hours downtime per month)

**NFR-R2:** Planned maintenance windows acceptable with advance notice to users

**NFR-R3:** Frontend must display cached data with "stale data" warning if backend is unavailable

**NFR-R4:** System must continue serving ROI queries even if background job fails (using last successful fetch)

**NFR-R5:** User interface must display clear error messages (not technical stack traces) when failures occur

**NFR-R6:** Infrastructure must operate at $0/month for MVP (free hosting tiers only)

**NFR-R7:** If cost exceeds $0, solution must not exceed $5/month for backend hosting

### Additional Requirements

**Architecture Requirements:**
- **Starter Template:** Next.js 16.1.6 with TypeScript 5.9.3, initialized via `npx create-next-app@latest eve-market-web-app --yes`
- **Frontend Stack:** React 19.2.4 + Tailwind CSS 4.1 + Headless UI 2.1 + @tanstack/react-virtual for table virtualization
- **Backend Stack:** Next.js API Routes (monolith architecture initially) with potential extraction to Railway for background jobs
- **Database:** Neon PostgreSQL (free tier: 0.5GB storage, serverless) with Prisma ORM
- **Key Dependencies:** axios (ESI client), zod (API validation), date-fns (timestamp formatting)
- **Development Environment:** Docker Compose for local PostgreSQL (postgres:16 image)
- **Hosting Strategy:** Vercel free tier for frontend, potential Railway ($5/month) for backend if serverless timeout exceeded
- **Database Indexes:** Composite indexes on (region_id, type_id) for query performance optimization
- **Data Retention:** Purge market orders older than 7 days to stay within 0.5GB database limit

**UX/Accessibility Requirements:**
- **WCAG AA Compliance:** Minimum 4.5:1 contrast ratios for all text, keyboard navigation for all interactive elements
- **Color System:** Dark theme default (space black #0A0E12 background, EVE blue #33B5E5 accent), light theme optional (#FFFFFF background)
- **Typography:** Inter font for UI text (14px base), JetBrains Mono for numerical data (monospace alignment in tables)
- **Keyboard Navigation:** Tab (navigate controls), Enter (confirm), Escape (cancel/close), Arrow keys (navigate dropdowns/autocomplete)
- **Focus States:** 2px solid #33B5E5 outline with 2px offset, visible only on keyboard focus (not mouse clicks)
- **Table Design:** Fixed/sticky header during scroll, alternating row backgrounds for scannability, 40px row height, 8px vertical + 16px horizontal cell padding
- **Font Scaling:** User-adjustable font sizes (75%, 100%, 125%, 150%) via CSS variables for accessibility
- **ARIA Support:** Labels on icon-only buttons, live regions for status updates, sort indicators on table headers, semantic HTML (proper heading hierarchy, table markup)
- **CSS Variables:** Theme switching via custom properties for instant visual transitions
- **Motion Preferences:** Respect prefers-reduced-motion media query, no animations (instant state changes only), transitions limited to color/opacity < 150ms
- **Responsive Behavior:** Desktop-first design, minimum width 1280px enforced, no mobile breakpoints for MVP

### FR Coverage Map

**FR1:** Epic 2 - Fetch market order data from all EVE Online regions via ESI API
**FR2:** Epic 2 - Store fetched market data in database for query performance
**FR3:** Epic 2 - Automatically refresh market data every 30 minutes via background job
**FR4:** Epic 2 - Track timestamp of last successful data fetch for each region
**FR5:** Epic 2 - Handle ESI API failures gracefully and log errors for debugging
**FR6:** Epic 2 - Fetch market data in parallel across multiple regions
**FR7:** Epic 2 - Respect ESI API rate limits (150 requests/second maximum)
**FR8:** Epic 2 - Skip private structures that require authentication
**FR9:** Epic 3 - Users can select a "buy market" from list of EVE regions
**FR10:** Epic 3 - Users can select a "sell market" from list of EVE regions
**FR11:** Epic 3 - Users can search/filter region list using autocomplete
**FR12:** Epic 3 - Users can navigate region selection using keyboard
**FR13:** Epic 3 - System prevents selection of same region for buy and sell
**FR14:** Epic 4 - Calculate ROI for all items between selected markets
**FR15:** Epic 4 - Display ALL profitable opportunities (no pagination)
**FR16:** Epic 4 - View opportunity details (item, stations, prices, ROI, quantity)
**FR17:** Epic 4 - Sort opportunities by any column
**FR18:** Epic 4 - Re-sort dynamically by clicking column headers
**FR19:** Epic 4 - Render large datasets (10,000+ opportunities) efficiently
**FR20:** Epic 4 - Display "Last updated" timestamp for data freshness
**FR21:** Epic 5 - Switch between light and dark visual themes
**FR22:** Epic 5 - Persist user theme preference across sessions
**FR23:** Epic 5 - Detect system theme preference on first visit
**FR24:** Epic 5 - Navigate interface using keyboard (tab, enter, escape, arrows)
**FR25:** Epic 6 - Administrators can view background job execution logs
**FR26:** Epic 6 - Administrators can manually trigger data fetch jobs
**FR27:** Epic 6 - Display clear error messages when data fetch fails
**FR28:** Epic 6 - Communicate stale data state to users
**FR29:** Epic 6 - Access system health indicators (job status, data age, errors)

**Architecture Requirements:** Epic 1
**UX/Accessibility Requirements:** Epic 1, Epic 4 (table design), Epic 5 (themes, keyboard navigation, WCAG AA)
**NFR-P (Performance):** Epic 2 (parallel fetching), Epic 4 (table rendering, sorting)
**NFR-I (Integration):** Epic 2 (ESI rate limiting, retries, caching)
**NFR-M (Maintainability):** Epic 1 (Docker), Epic 6 (logging, monitoring)
**NFR-R (Reliability):** Epic 2 (graceful degradation), Epic 6 (error handling)

## Epic List

### Epic 1: Project Foundation & Development Environment
Enable developers to run the app locally with all dependencies and begin feature development. This epic initializes the Next.js 16 starter template (`npx create-next-app@latest eve-market-web-app --yes`), configures Docker Compose for local PostgreSQL, sets up Tailwind CSS 4.1 + Headless UI 2.1 + TypeScript 5.9.3, installs key dependencies (@tanstack/react-virtual, axios, zod, date-fns, Prisma), and establishes the project structure for single-command startup (`docker-compose up`).

**FRs covered:** Architecture requirements (starter template, Docker environment, tech stack)
**NFRs addressed:** NFR-M1 (Docker Compose reproducibility)

### Epic 2: Market Data Collection Pipeline
Enable the system to automatically collect and cache fresh market data from all EVE regions every 30 minutes. This epic builds the background job scheduler that fetches market orders from ESI API in parallel (respecting 150 req/sec rate limit), stores data in Neon PostgreSQL with optimized indexes (region_id, type_id), handles failures with exponential backoff (5s starting delay) and 3 retry attempts, tracks fetch timestamps per region, and implements data retention policies (purge orders >7 days old) to stay within 0.5GB database limits.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8
**NFRs addressed:** NFR-I1, NFR-I2, NFR-I3, NFR-I4, NFR-I5, NFR-I6, NFR-M3 (structured logging), NFR-R4 (graceful degradation)

### Epic 3: Market Selection & Region Comparison
Enable traders to quickly select buy and sell markets using fast, keyboard-friendly autocomplete search. This epic delivers region selector dropdowns with fuzzy search across 60+ EVE regions (autocomplete responds <100ms), keyboard navigation (arrow keys, enter, escape), validation preventing same-region selection, and clean Headless UI components styled with Tailwind CSS following the UX design system (EVE blue #33B5E5 accent, dark theme).

**FRs covered:** FR9, FR10, FR11, FR12, FR13
**NFRs addressed:** NFR-P6 (autocomplete <100ms response), NFR-P8 (bundle size optimization)

### Epic 4: Trading Opportunity Analysis & Display
Enable traders to see ALL profitable opportunities between selected markets, sorted by any metric (ROI, price, quantity) in under 500ms. This epic implements server-side ROI calculation logic via Next.js API routes, high-performance table with @tanstack/react-virtual for rendering 10,000+ rows efficiently, client-side column sorting (<200ms), data freshness timestamp display ("Last updated" in footer), 8-column opportunity display (item name, buy/sell stations, buy/sell prices, ROI%, quantity), and table design matching UX specs (40px row height, alternating backgrounds, fixed header, JetBrains Mono font for numbers).

**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR20
**NFRs addressed:** NFR-P4 (table render <500ms), NFR-P5 (sorting <200ms), NFR-P7 (ROI calc <500ms), NFR-P9 (API payload <2MB), NFR-I7 (timestamp display)

### Epic 5: User Experience & Accessibility
Enable users to have comfortable, accessible viewing with customizable themes and complete keyboard-only navigation. This epic delivers light/dark theme switching via CSS variables (instant transition), theme persistence in localStorage, system preference detection (prefers-color-scheme), full keyboard navigation (tab, enter, escape, arrows) for all interactive elements, WCAG AA compliance (4.5:1 contrast ratios), keyboard focus states (2px solid #33B5E5 outline), ARIA labels on icon-only buttons, semantic HTML with proper table markup, and font scaling options (75%, 100%, 125%, 150%).

**FRs covered:** FR21, FR22, FR23, FR24
**NFRs addressed:** NFR-P1, NFR-P2, NFR-P3 (page load performance optimizations), UX/Accessibility requirements (WCAG AA, keyboard nav, color system)

### Epic 6: System Operations & Monitoring
Enable administrators to monitor system health, debug issues quickly, and manually recover from failures. This epic provides structured JSON logging with timestamps for all background jobs and API calls, health check endpoint exposing job status and data age, manual job trigger capability via admin API endpoint, stale data warnings when fetch age >45 minutes (yellow banner in UI), clear user-facing error messages (no stack traces), and monitoring dashboard showing fetch success/failure rates and data freshness per region.

**FRs covered:** FR25, FR26, FR27, FR28, FR29
**NFRs addressed:** NFR-I8 (stale data communication), NFR-M4 (maintainability <30 min/week), NFR-M7 (health check endpoint), NFR-M8 (error context), NFR-M9 (manual job trigger), NFR-R3 (stale data warning), NFR-R5 (clear error messages)

---

## Epic 1: Project Foundation & Development Environment

Enable developers to run the app locally with all dependencies and begin feature development.

### Story 1.1: Initialize Next.js 16 Project with Starter Template

As a developer,
I want to initialize the Next.js 16 project with TypeScript, Tailwind CSS, and recommended defaults,
So that I have a solid foundation to build the EVE Market Web App.

**Acceptance Criteria:**

**Given** I have Node.js 20.9+ installed
**When** I run `npx create-next-app@latest eve-market-web-app --yes`
**Then** a new Next.js 16.1.6 project is created with TypeScript 5.9.3, Tailwind CSS 4.1, ESLint, App Router, Turbopack, and src/ directory structure
**And** the project builds successfully with `pnpm build`
**And** the development server starts with `pnpm dev` on http://localhost:3000

### Story 1.2: Configure Docker Compose for Local PostgreSQL

As a developer,
I want to run PostgreSQL locally via Docker Compose with a single command,
So that I have a reproducible development environment without manual database setup.

**Acceptance Criteria:**

**Given** Docker Desktop is installed and running
**When** I create a `docker-compose.yml` file with postgres:16 image, environment variables (POSTGRES_USER=postgres, POSTGRES_PASSWORD=postgres, POSTGRES_DB=eve_market), port mapping (5432:5432), and volume persistence
**Then** running `docker-compose up -d` starts PostgreSQL container successfully
**And** I can connect to the database at localhost:5432 with the configured credentials
**And** the database persists data across container restarts
**And** running `docker-compose down` stops the container cleanly

### Story 1.3: Set Up Prisma ORM and Database Connection

As a developer,
I want to configure Prisma with a connection to Neon PostgreSQL (or local Docker PostgreSQL),
So that I can define database schemas and generate type-safe database clients.

**Acceptance Criteria:**

**Given** the Next.js project and Docker PostgreSQL are running
**When** I install Prisma (`pnpm add -D prisma @prisma/client`)
**Then** running `pnpm prisma init` creates a `prisma/schema.prisma` file and `.env` file
**And** I configure the DATABASE_URL in `.env` (postgresql://postgres:postgres@localhost:5432/eve_market for local dev)
**And** the schema.prisma file is configured with `provider = "postgresql"`
**And** running `pnpm prisma generate` succeeds without errors
**And** I can create a `lib/db.ts` file that exports a PrismaClient singleton

### Story 1.4: Install Design System and Core Dependencies

As a developer,
I want to install Headless UI, virtual scrolling, API client, and validation libraries,
So that I have all the dependencies needed to build the UI and backend features.

**Acceptance Criteria:**

**Given** the Next.js project is initialized
**When** I install production dependencies: `pnpm add axios zod date-fns @headlessui/react @tanstack/react-virtual`
**Then** all packages install successfully without peer dependency warnings
**And** I can import and use each package in a test component
**And** Tailwind CSS is already configured and working (from create-next-app)
**And** the project builds successfully with `pnpm build`
**And** the total bundle size remains under 500KB gzipped (verified with `pnpm build` output)

---

## Epic 2: Market Data Collection Pipeline

Enable the system to automatically collect and cache fresh market data from all EVE regions every 30 minutes.

### Story 2.1: Create Database Schema for Market Orders and Regions

As a developer,
I want to define Prisma schemas for storing EVE regions and market orders,
So that I can persist market data efficiently with proper indexing.

**Acceptance Criteria:**

**Given** Prisma is configured
**When** I define a `Region` model with fields: id (Int), regionId (Int unique), name (String), lastFetchedAt (DateTime nullable)
**And** I define a `MarketOrder` model with fields: id (Int), regionId (Int), typeId (Int), orderId (BigInt unique), price (Decimal), volumeRemain (Int), locationId (BigInt), isBuyOrder (Boolean), issued (DateTime), fetchedAt (DateTime)
**And** I add composite index @@index([regionId, typeId]) on MarketOrder for query optimization
**Then** running `pnpm prisma migrate dev --name init` creates the database tables successfully
**And** running `pnpm prisma generate` generates TypeScript types for both models
**And** I can query both tables using the Prisma client without errors

### Story 2.2: Build ESI API Client with Rate Limiting

As a developer,
I want to create an ESI API client that respects the 150 req/sec rate limit,
So that I can fetch market data without violating CCP's API terms.

**Acceptance Criteria:**

**Given** axios is installed
**When** I create `lib/esi-client.ts` with a class ESIClient that wraps axios
**Then** the client has a base URL of `https://esi.evetech.net/latest`
**And** the client implements a request queue that limits to 150 requests per second
**And** the client has a method `getRegionOrders(regionId: number): Promise<MarketOrder[]>` that fetches all orders for a region
**And** the client validates responses using zod schemas
**And** failed requests throw errors with context (regionId, status code, error message)
**And** I can successfully fetch market orders for region 10000002 (The Forge) in a test

### Story 2.3: Implement Market Data Fetch Logic with Error Handling

As a developer,
I want to fetch market orders for all regions and store them in the database,
So that the system has fresh data for ROI calculations.

**Acceptance Criteria:**

**Given** the ESI client and database schema exist
**When** I create `jobs/fetch-market-data.ts` with a function `fetchAllRegions()`
**Then** the function fetches a list of all public EVE regions from ESI API endpoint `/universe/regions/`
**And** for each region, it fetches market orders using the ESI client in parallel (with rate limiting)
**And** fetched orders are inserted into the MarketOrder table using Prisma (upsert on orderId)
**And** the Region table is updated with the lastFetchedAt timestamp for each region
**And** ESI API 503 errors trigger exponential backoff starting at 5 seconds
**And** each region fetch is retried up to 3 times on failure before logging and continuing
**And** the function logs progress (JSON format) with timestamps, region counts, success/failure counts
**And** running the function manually successfully populates the database with market data

### Story 2.4: Create Background Job Scheduler for 30-Minute Refresh

As a developer,
I want to schedule the market data fetch to run automatically every 30 minutes,
So that the data stays fresh without manual intervention.

**Acceptance Criteria:**

**Given** the fetch-market-data job exists
**When** I configure a cron job or scheduled task (using Vercel Cron or node-cron for local dev)
**Then** the job runs automatically every 30 minutes in production
**And** for local development, I can manually trigger the job via `pnpm run fetch-data`
**And** the job logs start time, end time, total duration, and success/failure status
**And** if the job fails, it logs the error with full context (region, error message, stack trace)
**And** the lastFetchedAt timestamps in the Region table update correctly after each run
**And** the job completes within 30 minutes even with 60+ regions

### Story 2.5: Implement Data Retention Cleanup Job

As a developer,
I want to automatically purge market orders older than 7 days,
So that the database stays within the 0.5GB Neon free tier limit.

**Acceptance Criteria:**

**Given** the MarketOrder table contains data from multiple fetch cycles
**When** I create `jobs/cleanup-old-data.ts` with a function `cleanupOldOrders()`
**Then** the function deletes all MarketOrder records where fetchedAt is older than 7 days
**And** the function logs the number of records deleted
**And** I can schedule this function to run daily (or after each fetch cycle)
**And** running the function manually successfully removes old records
**And** the database size remains under 0.5GB after cleanup (verified with Prisma Migrate or Neon dashboard)

---

## Epic 3: Market Selection & Region Comparison

Enable traders to quickly select buy and sell markets using fast, keyboard-friendly autocomplete search.

### Story 3.1: Load EVE Region Names and Create Region Data Source

As a developer,
I want to load all EVE region names and IDs at build time or server startup,
So that the region selectors have data to display.

**Acceptance Criteria:**

**Given** the database schema has a Region table
**When** I create `lib/regions.ts` with a function `getAllRegions(): Promise<Region[]>`
**Then** the function queries the Region table and returns all regions (id, regionId, name)
**And** I create an API route `/api/regions` that returns all regions as JSON
**And** calling GET `/api/regions` returns an array of region objects with regionId and name fields
**And** the response time is under 100ms
**And** the data includes all 60+ EVE regions

### Story 3.2: Build Autocomplete Region Selector Component

As a developer,
I want to create a reusable region selector component with fuzzy autocomplete,
So that traders can quickly find and select regions.

**Acceptance Criteria:**

**Given** Headless UI is installed and region data is available
**When** I create `components/RegionSelector.tsx` using Headless UI's Combobox component
**Then** the component accepts props: value (selected region), onChange (callback), label (string), placeholder (string)
**And** the component displays a searchable dropdown with fuzzy matching on region names
**And** typing "for" shows "The Forge" as a match
**And** typing "hei" shows "Heimatar" as a match
**And** the autocomplete responds within 100ms of typing
**And** the component is styled with Tailwind CSS following the UX design system (EVE blue #33B5E5 accent, dark theme)
**And** selected regions display clearly with a checkmark or highlight

### Story 3.3: Add Keyboard Navigation to Region Selectors

As a developer,
I want region selectors to be fully keyboard-navigable,
So that power users can select markets without using a mouse.

**Acceptance Criteria:**

**Given** the RegionSelector component exists
**When** a user focuses on the input field
**Then** pressing the down arrow key opens the dropdown and highlights the first option
**And** pressing up/down arrow keys navigates through the list of region options
**And** pressing Enter selects the highlighted region and closes the dropdown
**And** pressing Escape closes the dropdown without selecting
**And** pressing Tab moves focus to the next element (buy market → sell market)
**And** keyboard focus states are visible (2px solid #33B5E5 outline)
**And** all keyboard interactions work consistently in Chrome, Firefox, Edge, and Safari

### Story 3.4: Implement Region Selection Validation and Main Page Layout

As a developer,
I want to display two region selectors (buy market and sell market) with validation preventing same-region selection,
So that traders can only compare different markets.

**Acceptance Criteria:**

**Given** the RegionSelector component exists with keyboard navigation
**When** I create the main page at `app/page.tsx` with two RegionSelector instances
**Then** the layout displays "Buy Market" and "Sell Market" labels with their respective selectors horizontally spaced by 24px
**And** both selectors fetch region data from `/api/regions` on page load
**And** when the user selects the same region for both buy and sell, an error message appears: "Buy and sell markets must be different"
**And** the error message is styled with warning color (#FFB800) and displayed below the selectors
**And** the selectors are disabled from triggering ROI calculations until different regions are selected
**And** the page layout follows the UX design system (dark theme, Inter font, proper spacing)

---

## Epic 4: Trading Opportunity Analysis & Display

Enable traders to see ALL profitable opportunities between selected markets, sorted by any metric in under 500ms.

### Story 4.1: Create API Endpoint for ROI Opportunity Calculations

As a developer,
I want to build an API endpoint that calculates ROI opportunities between two selected regions,
So that traders can see profitable trades.

**Acceptance Criteria:**

**Given** market data exists in the database for multiple regions
**When** I create `/api/opportunities` that accepts query params `buyRegion` and `sellRegion` (both region IDs)
**Then** the endpoint validates that buyRegion !== sellRegion (return 400 if same)
**And** the endpoint queries MarketOrder table for buy orders in buyRegion (isBuyOrder = false, selling orders)
**And** the endpoint queries MarketOrder table for sell orders in sellRegion (isBuyOrder = true, buying orders)
**And** the endpoint calculates ROI for each matching typeId: ROI = ((sellPrice - buyPrice) / buyPrice) * 100
**And** the endpoint returns only profitable opportunities (ROI > 0)
**And** the response includes: itemName (from typeId lookup), buyPrice, sellPrice, buyStation (locationId), sellStation (locationId), ROI%, volumeAvailable
**And** the response payload is under 2MB (use pagination or limit if needed)
**And** the calculation completes in under 500ms for typical datasets
**And** testing with real data (Jita → Amarr) returns valid profitable opportunities

### Story 4.2: Build High-Performance Opportunity Table with Virtual Scrolling

As a developer,
I want to render large opportunity datasets (10,000+ rows) efficiently using virtual scrolling,
So that the UI remains responsive with massive datasets.

**Acceptance Criteria:**

**Given** @tanstack/react-virtual is installed
**When** I create `components/OpportunityTable.tsx` that accepts opportunities data as props
**Then** the component uses @tanstack/react-virtual to render only visible rows
**And** the table displays 8 columns: Item Name, Buy Station, Sell Station, Buy Price, Sell Price, ROI%, Quantity, Volume
**And** the table follows UX design specs: 40px row height, 8px vertical + 16px horizontal cell padding, alternating row backgrounds (#151921 and #1E252E)
**And** the table header is fixed/sticky during scroll
**And** numerical columns (prices, ROI%, quantity) use JetBrains Mono font for alignment
**And** ROI% values are displayed with 2 decimal places and a "%" suffix
**And** the table renders 10,000 rows without lag or jank (<500ms initial render)
**And** scrolling is smooth at 60fps

### Story 4.3: Add Client-Side Column Sorting to Opportunity Table

As a developer,
I want traders to sort the opportunity table by any column with a single click,
So that they can quickly find the best opportunities by their preferred metric.

**Acceptance Criteria:**

**Given** the OpportunityTable component exists with data
**When** a user clicks a column header (e.g., "ROI%")
**Then** the table sorts descending by that column (highest ROI first)
**And** clicking the same header again toggles to ascending sort (lowest ROI first)
**And** the active sort column shows a visual indicator (arrow icon or highlight, EVE blue #33B5E5)
**And** sorting completes in under 200ms regardless of dataset size
**And** sorting is client-side only (no API calls)
**And** all columns are sortable: Item Name (alphabetical), Buy Price (numerical), Sell Price (numerical), ROI% (numerical), Quantity (numerical)
**And** after sorting, the virtual scroller scrolls back to the top

### Story 4.4: Display Data Freshness Timestamp in Footer

As a developer,
I want to show a "Last updated" timestamp prominently in the UI,
So that traders know how fresh the market data is.

**Acceptance Criteria:**

**Given** the Region table tracks lastFetchedAt timestamps
**When** I create a footer component that fetches the most recent lastFetchedAt from any region
**Then** the footer displays "Last updated: [timestamp]" in small text (12px, low emphasis color #6B7785)
**And** the timestamp is formatted as "Feb 14, 2026 9:02 AM" using date-fns
**And** if the data is older than 45 minutes, the text turns yellow (#FFB800) with a warning icon
**And** if the data is older than 2 hours, the text turns red (#FF4757) with a "Stale data" label
**And** the footer is positioned at the bottom of the page with 12px vertical + 16px horizontal padding
**And** the timestamp updates when the page is refreshed

### Story 4.5: Integrate Opportunity Table with Region Selectors

As a developer,
I want the table to populate with opportunities when traders select buy and sell markets,
So that the complete user flow works end-to-end.

**Acceptance Criteria:**

**Given** the RegionSelector components and OpportunityTable exist
**When** the user selects different regions for buy and sell markets
**Then** the page automatically calls `/api/opportunities?buyRegion=[id]&sellRegion=[id]`
**And** while loading, a loading spinner appears (< 500ms should be barely visible)
**And** when data returns, the OpportunityTable populates instantly with all opportunities
**And** if no opportunities are found, an empty state message displays: "No profitable trades found between [Region A] and [Region B]"
**And** if the API call fails, an error message displays: "Unable to load opportunities. Please try again."
**And** the default sort is ROI% descending (highest profit first)
**And** the complete flow (select regions → see opportunities) takes under 2 seconds total from the user's perspective

---

## Epic 5: User Experience & Accessibility

Enable users to have comfortable, accessible viewing with customizable themes and complete keyboard-only navigation.

### Story 5.1: Implement Theme Switching System with localStorage Persistence

As a user,
I want to switch between light and dark themes with instant visual transition,
So that I can use the app comfortably regardless of lighting conditions.

**Acceptance Criteria:**

**Given** the app is styled with Tailwind CSS
**When** I implement theme switching using CSS variables (--background, --text-primary, --accent, etc.)
**Then** the app defaults to dark theme on first visit
**And** the app detects system preference using `prefers-color-scheme` media query on first visit
**And** a theme toggle button (sun/moon icon) appears in the top-right corner of the page
**And** clicking the toggle instantly switches between light and dark themes (< 50ms transition)
**And** the selected theme is stored in localStorage as `theme: 'light' | 'dark'`
**And** the theme persists across page refreshes and browser sessions
**And** both themes meet WCAG AA contrast requirements (dark: 14.2:1 high emphasis text, light: 15.8:1 high emphasis text)

### Story 5.2: Add Full Keyboard Navigation Support

As a user,
I want to navigate the entire interface using only my keyboard,
So that I can use the app efficiently without touching my mouse.

**Acceptance Criteria:**

**Given** all interactive elements exist (region selectors, table, theme toggle)
**When** I press Tab from page load
**Then** focus moves to the first region selector (buy market)
**And** pressing Tab again moves to the second region selector (sell market)
**And** pressing Tab again moves to the table (if populated)
**And** pressing Tab again moves to the theme toggle button
**And** all focused elements show a visible focus indicator (2px solid #33B5E5 outline with 2px offset)
**And** pressing Shift+Tab navigates backwards through elements
**And** Enter key activates buttons and confirms selections
**And** Escape key closes open dropdowns or menus
**And** arrow keys navigate within dropdowns and autocomplete options
**And** focus indicators are only visible on keyboard focus, not mouse clicks (`:focus-visible` CSS)

### Story 5.3: Apply WCAG AA Accessibility Standards with ARIA Support

As a developer,
I want the app to meet WCAG AA accessibility standards,
So that users with disabilities can use the tool effectively.

**Acceptance Criteria:**

**Given** all UI components are implemented
**When** I audit the app with accessibility tools (Lighthouse, axe DevTools)
**Then** all text meets minimum 4.5:1 contrast ratio for WCAG AA compliance
**And** the theme toggle button has an aria-label: "Toggle theme" (since it's icon-only)
**And** the opportunity table uses semantic HTML (<table>, <thead>, <tbody>, <th>, <td>)
**And** sortable column headers have aria-sort attributes indicating current sort direction
**And** the stale data warning uses an aria-live="polite" region for screen reader announcements
**And** headings use proper hierarchy (h1 for page title, h2 for sections)
**And** interactive elements have visible focus states on keyboard navigation
**And** the page achieves a Lighthouse accessibility score of 90+ for both themes

### Story 5.4: Add Font Scaling Feature for User Customization

As a user,
I want to adjust the text size throughout the app,
So that I can optimize readability for my screen size and vision needs.

**Acceptance Criteria:**

**Given** the app uses CSS variables for font sizing
**When** I implement a font scale selector (75%, 100%, 125%, 150%)
**Then** selecting a scale instantly adjusts all text sizes proportionally
**And** the default scale is 100%
**And** at 75% scale: page title 18px, table data 10px, row height 30px (compact view)
**And** at 150% scale: page title 36px, table data 19px, row height 60px (accessibility view)
**And** the selected scale persists in localStorage as `fontScale: number`
**And** the table remains functional and readable at all scales
**And** the layout doesn't break at any scale (no overlapping text, clipped content)

---

## Epic 6: System Operations & Monitoring

Enable administrators to monitor system health, debug issues quickly, and manually recover from failures.

### Story 6.1: Implement Structured JSON Logging for All Operations

As an administrator,
I want all background jobs and API calls to produce structured JSON logs,
So that I can debug issues quickly without digging through unformatted text.

**Acceptance Criteria:**

**Given** the background jobs and API routes exist
**When** I implement logging using `console.log` with JSON.stringify (or a logging library like pino)
**Then** every background job logs start/end events with timestamps in ISO 8601 format
**And** each log entry includes: timestamp, level (info/warn/error), operation (e.g., "fetch-market-data"), context (regionId, counts, duration)
**And** ESI API errors log: timestamp, level (error), endpoint, regionId, status code, error message, stack trace
**And** API route calls log: timestamp, level (info), route (e.g., /api/opportunities), query params, response time
**And** logs are output to stdout (console) for easy capture in production environments
**And** I can filter logs by level or operation in production log aggregation tools

### Story 6.2: Create Health Check Endpoint for Monitoring

As an administrator,
I want a health check endpoint that reports system status and data freshness,
So that I can monitor the app's health programmatically.

**Acceptance Criteria:**

**Given** the app is running in production
**When** I create `/api/health` endpoint
**Then** calling GET `/api/health` returns JSON with: status ("healthy" | "degraded" | "unhealthy"), lastFetchTime (most recent lastFetchedAt from Region table), dataAge (duration in minutes), jobStatus (summary of recent job success/failures)
**And** the endpoint responds in under 200ms
**And** status is "healthy" if dataAge < 45 minutes
**And** status is "degraded" if dataAge between 45-120 minutes (stale warning threshold)
**And** status is "unhealthy" if dataAge > 120 minutes or last job failed
**And** the endpoint returns HTTP 200 for healthy/degraded, HTTP 503 for unhealthy
**And** I can use this endpoint with uptime monitoring services (UptimeRobot, Pingdom, etc.)

### Story 6.3: Add Manual Job Trigger Endpoint for Recovery

As an administrator,
I want to manually trigger the market data fetch job from an API endpoint,
So that I can quickly recover from job failures without SSH access.

**Acceptance Criteria:**

**Given** the background job fetch-market-data exists
**When** I create `/api/admin/trigger-fetch` endpoint (POST method)
**Then** calling POST `/api/admin/trigger-fetch` immediately starts the fetch job
**And** the endpoint returns HTTP 202 (Accepted) with a message: "Fetch job triggered successfully"
**And** the endpoint validates a simple auth token in headers (X-Admin-Token) matching an environment variable ADMIN_TOKEN
**And** if the token is missing or invalid, the endpoint returns HTTP 401 (Unauthorized)
**And** the triggered job runs asynchronously (doesn't block the API response)
**And** the job logs indicate it was manually triggered (vs. scheduled)
**And** I can verify the job ran by checking the lastFetchedAt timestamps in the database

### Story 6.4: Build Stale Data Warning UI Banner

As a user,
I want to see a clear warning when market data is stale,
So that I don't make trading decisions based on outdated information.

**Acceptance Criteria:**

**Given** the data age can be calculated from lastFetchedAt timestamps
**When** data age exceeds 45 minutes
**Then** a yellow banner appears at the top of the page with message: "Market data may be stale (Last updated: [timestamp]). Verify prices in-game before trading."
**And** the banner uses warning color (#FFB800) with high contrast black text
**And** the banner is dismissible with an X button but reappears on page refresh if data is still stale
**And** if data age exceeds 120 minutes (2 hours), the banner turns red (#FF4757) with message: "Market data is stale (Last updated: [timestamp]). Trading opportunities may be inaccurate."
**And** the timestamp in the banner uses date-fns to format as "2 hours ago" or "45 minutes ago"
**And** the banner is positioned below the page header and above the region selectors

### Story 6.5: Create Error Handling and User-Friendly Error Messages

As a user,
I want to see clear, helpful error messages when something goes wrong,
So that I understand what happened and what to do next.

**Acceptance Criteria:**

**Given** various error scenarios can occur (API failures, network issues, no data)
**When** the `/api/opportunities` call fails with a 500 error
**Then** the UI displays: "Unable to load opportunities. The server encountered an error. Please try refreshing in a few minutes."
**And** when the `/api/opportunities` call fails with a network error (timeout, no connection)
**Then** the UI displays: "Network error. Please check your connection and try again."
**And** when no opportunities are found (valid response but empty results)
**Then** the UI displays: "No profitable trades found between [Region A] and [Region B] with current market conditions. Try different regions."
**And** all error messages are displayed in a styled error box with red accent (#FF4757)
**And** error messages never show technical details like stack traces or raw error objects
**And** users can dismiss error messages or they auto-dismiss when the user retries
**And** errors are logged to the console/server logs for administrator debugging

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic {{N}}: {{epic_title_N}}

{{epic_goal_N}}

<!-- Repeat for each story (M = 1, 2, 3...) within epic N -->

### Story {{N}}.{{M}}: {{story_title_N_M}}

As a {{user_type}},
I want {{capability}},
So that {{value_benefit}}.

**Acceptance Criteria:**

<!-- for each AC on this story -->

**Given** {{precondition}}
**When** {{action}}
**Then** {{expected_outcome}}
**And** {{additional_criteria}}

<!-- End story repeat -->
