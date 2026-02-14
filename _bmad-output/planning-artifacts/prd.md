---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - 'docs/eve-market-poc-requirements.md'
  - 'docs/eve-market-scanner-architecture.md'
workflowType: 'prd'
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 2
classification:
  projectType: 'web_app'
  domain: 'general'
  complexity: 'medium'
  projectContext: 'brownfield'
---

# Product Requirements Document - eve-market-web-app

**Author:** Harry
**Date:** 2026-02-14

## Executive Summary

**Project:** EVE Market Web App - Region trading opportunity scanner for EVE Online
**Goal:** Enable EVE traders to identify profitable cross-region trades across ALL markets (60+ regions) in < 10 seconds
**Users:** Personal tool for Harry + 5-10 friends who actively trade
**Cost Target:** $0/month (free hosting tier deployment)

**Core Functionality:**
- Automated background job fetches market data from all EVE regions every 30 minutes via ESI API
- Users select 2 regions (buy market, sell market) and view ALL profitable trading opportunities
- ROI calculations displayed in sortable table (item, prices, stations, quantity, ROI %)
- Data freshness communicated via "Last updated" timestamp
- Clean SPA with light/dark theme, keyboard navigation, autocomplete region selection

**Technical Approach:**
- SPA frontend (React/Vue/Svelte) + REST API backend + PostgreSQL database
- Parallel API fetching respecting ESI rate limits (150 req/sec)
- Docker-based development environment
- Free hosting: Vercel/Netlify (frontend) + Railway/Render (backend)
- Minimal maintenance target: < 30 minutes/week

**MVP Timeline:** 3-4 weeks full-time equivalent (solo developer)

## Success Criteria

### User Success

**Primary Goal:** Enable EVE Online traders to easily identify profitable region trading opportunities.

**Success Indicators:**
- Users can select any two regions and immediately see all profitable trading opportunities
- Data is presented in a clean, sortable table that's easy to read at a glance
- Users understand "buy item X in region A, sell in region B for Y% ROI" without confusion
- Traders can identify actionable opportunities within 10 seconds of landing on the page
- Filtering and sorting capabilities allow users to quickly find relevant opportunities

**User Success Moment:**
When a trader opens the app, selects two regions, and immediately sees profitable trades they can act on.

### Business Success

**Target Audience:** Personal tool for Harry and 5-10 friends who actively trade in EVE Online.

**Success Metrics:**
- Tool is used regularly by Harry and friends for trade research
- Saves time compared to manual market research or other tools
- Provides value through comprehensive market coverage (ALL regions, not just major hubs)

**Value Measure:**
Success = "I use this regularly and it helps me find profitable trades I wouldn't have found otherwise."

### Technical Success

**Performance Targets:**
- Page load time: < 2 seconds
- ROI calculations and table rendering: Near-instant (< 500ms)
- Data freshness: Updates every 30 minutes via background jobs
- Parallel fetching: All EVE regions fetched efficiently (respecting ESI rate limits)

**Cost Target:**
- **$0/month hosting cost** (free-tier deployment only)

**Reliability:**
- Acceptable: Occasional downtime (not mission-critical)
- Target: 95% uptime (best effort with free hosting)
- Data integrity: Accurate ROI calculations, no stale data shown

**Technical Quality:**
- Clean, maintainable codebase
- Docker-based local development environment
- Efficient database queries for large datasets
- Respects EVE ESI API rate limits (150 req/sec)

### Measurable Outcomes

**MVP Success Criteria:**
1. ✅ Successfully fetches market data from ALL EVE Online regions via ESI API
2. ✅ Accurately calculates ROI between any two selected regions
3. ✅ Displays ALL opportunities (no arbitrary limits) with sorting capability
4. ✅ Page loads in under 2 seconds
5. ✅ Background job updates all region data every 30 minutes
6. ✅ Deployed at $0/month hosting cost
7. ✅ Used regularly by Harry and friends for trade research

## User Journeys

### Journey 1: Marcus "The Hauler" Chen - EVE Trader (Primary User)

**Persona:**
- **Name:** Marcus "The Hauler" Chen
- **Role:** EVE Online region trader with 2 billion ISK to invest
- **Situation:** Currently uses spreadsheets and manually checks markets, missing opportunities in smaller regions
- **Goal:** Find profitable trades across ALL regions without spending hours researching
- **Obstacle:** Limited time (30 minutes before corp ops), too many regions to check manually

**Journey Narrative:**

**Opening Scene:**
Marcus logs into EVE after work with 30 minutes to find good trades before his corp's fleet op. He has 2 billion ISK ready but knows existing tools only show Jita → Amarr. Hidden gems exist in The Citadel, Metropolis, and other overlooked regions.

**Rising Action:**
He opens the EVE Market Scanner web app. Clean interface, two dropdown menus. He selects "The Forge" (Jita) as buy market and "Heimatar" (Rens) as sell market. Page loads instantly showing a sortable table of ALL profitable opportunities, sorted by ROI descending.

**Climax:**
There it is: "Compressed Veldspar" with 43% ROI, 1.2 million units available. High volume, solid profit, 3 jumps with his freighter. Nobody's talking about it in trade chat. He clicks the ROI column to re-sort, spots another opportunity at 38% ROI.

**Resolution:**
Marcus copies item names, logs into EVE, places buy orders. Over the next week, he makes 850 million ISK from that single trade found in 30 seconds. He bookmarks the app and checks it daily before trading sessions. He shares it with two corpmates who also start using it.

**Success Indicators:**
- Found actionable trade in < 10 seconds
- Data clarity: understood buy/sell/ROI immediately
- Sorting enabled quick comparison of opportunities
- Timestamp showed "Last updated: 9:02 AM" - data was fresh

### Journey 2: Harry - System Admin/Developer (Operations User)

**Persona:**
- **Name:** Harry
- **Role:** Developer and maintainer of the tool
- **Situation:** Built this for personal use and friends, needs reliable operation with minimal maintenance time
- **Goal:** Ensure background jobs fetch data reliably, database stays healthy, accurate ROI data delivered
- **Obstacle:** Limited time for maintenance, free hosting with potential resource constraints

**Journey Narrative:**

**Opening Scene - Normal Operations:**
Sunday morning. Harry wakes up, checks phone - no error alerts. Opens web app for quick health check before heading out. Wants to verify the 9:00 AM background job completed successfully.

**Rising Action:**
Opens app, sees "Last updated: 9:02 AM" in footer - scheduled job completed. Spot-checks data: selects "The Forge" and "Domain", ROI numbers look reasonable, no weird negatives or missing prices. Table loads in under 1 second. System healthy.

**Challenge Scenario:**
Wednesday afternoon. Friend messages: "Data looks stale - shows last updated 6 hours ago." Harry checks server logs on his phone during lunch. ESI API returned 503 errors this morning - background job failed.

**Recovery:**
He SSH into the server, checks logs, sees the ESI timeout. Manually triggers the fetch script. Within 10 minutes, data refreshed. User sees "Last updated: 2:15 PM". Harry adds todo: implement retry logic with exponential backoff.

**Resolution:**
Harry implements basic monitoring: if data age exceeds 45 minutes, send notification. System runs smoothly 95% of the time. When issues occur, he fixes them quickly because Docker makes debugging easy and codebase is clean. Maintenance takes < 30 minutes per week.

**Success Indicators:**
- Monitoring via "Last updated" timestamp
- Clear error logs for debugging
- Docker enables quick local reproduction of issues
- Manual job trigger capability for recovery
- System maintainable with minimal time investment

## Web Application Specific Requirements

### Project-Type Overview

**Architecture:** Single Page Application (SPA)
- Client-side routing and state management
- Dynamic UI updates without full page reloads
- Fast, responsive user interactions for sorting, filtering, region selection

**Target Platform:** Desktop web browsers
- Focus on desktop experience (where EVE players typically trade)
- No mobile-specific optimizations for MVP
- Responsive design not critical (desktop-first)

### Browser Support Matrix

**Supported Browsers:**
- **Chrome:** Latest 2 versions (primary target)
- **Firefox:** Latest 2 versions
- **Edge:** Latest 2 versions (Chromium-based)
- **Safari:** Latest 2 versions (for Mac users)

**NOT Supported:**
- Internet Explorer 11 (deprecated)
- Mobile browsers (iOS Safari, Chrome Mobile) - MVP excludes mobile optimization
- Legacy browsers

**Technical Implications:**
- Can use modern JavaScript (ES2020+) without transpilation concerns
- CSS Grid, Flexbox, native features fully supported
- No polyfills needed for IE11

### Performance Targets

**Page Load Performance:**
- Initial page load: < 2 seconds (as defined in success criteria)
- Time to Interactive (TTI): < 2.5 seconds
- First Contentful Paint (FCP): < 1 second

**Runtime Performance:**
- Table rendering with large datasets (10,000+ rows): < 500ms
- Sorting operations: < 200ms (client-side)
- Region selection dropdown (autocomplete): < 100ms response time
- Filtering operations: Instant (< 50ms)

**Data Transfer:**
- Initial bundle size: < 500KB (gzipped)
- API response for ROI data: < 2MB per query
- Lazy loading for non-critical assets

### SEO Strategy

**SEO: NOT REQUIRED**
- This is a tool for authenticated/known users (you and friends)
- No public discoverability needed via search engines
- No meta tags, sitemaps, or structured data required for MVP
- Can use client-side routing without server-side rendering (SSR)

**Future Consideration:**
- If product goes public, may need basic SEO (title, description, og:tags)

### Accessibility Level

**Target Level:** Basic Accessibility (AA-lite)

**Required Accessibility Features:**
- **Theming:** Light and dark theme support (user preference toggle)
- **Keyboard Navigation:**
  - Tab: Navigate between regions dropdowns, table, controls
  - Enter: Trigger actions (region selection, sorting)
  - Arrow keys: Navigate dropdown autocomplete options
  - Escape: Close dropdowns/modals

- **Autocomplete for Selection Inputs:**
  - Region dropdowns with type-ahead search
  - Keyboard-accessible autocomplete (arrow up/down, enter to select)

- **Color Contrast:**
  - Ensure readable text in both light and dark themes
  - Minimum 4.5:1 contrast ratio for text

**NOT Required for MVP:**
- Full WCAG 2.1 AA compliance
- Screen reader optimization (ARIA labels, live regions)
- High contrast mode beyond light/dark theme
- Keyboard shortcuts beyond basic navigation

### Responsive Design

**Primary Target:** Desktop (1920x1080, 1440x900, 1366x768)
- Fixed or fluid layout optimized for desktop viewports
- No mobile breakpoints required for MVP
- Table should be readable on minimum desktop width (1280px)

**NOT Required:**
- Mobile-responsive layouts (< 768px)
- Touch-optimized UI elements
- Progressive Web App (PWA) features

### Technical Architecture Considerations

**Frontend Stack:**
- SPA framework (React, Vue, or Svelte recommended)
- State management for selected regions and fetched data
- Client-side routing (React Router, Vue Router, etc.)
- Autocomplete component library for region selection
- Table library for large dataset rendering (virtualization)

**Backend Integration:**
- REST API endpoints for fetching ROI opportunities
- WebSocket/SSE NOT needed for MVP (no real-time updates)
- API returns JSON data for frontend consumption

**Future Enhancements (Post-MVP):**
- Real-time notifications when new high-ROI opportunities appear
- WebSocket connection for live data updates
- Push notifications (browser notifications API)

### Implementation Considerations

**Theme Implementation:**
- CSS variables for light/dark theme switching
- User preference stored in localStorage
- System preference detection (prefers-color-scheme media query)

**Autocomplete Implementation:**
- Fuzzy search for region names (60+ EVE regions)
- Keyboard navigation (up/down arrows, enter, escape)
- Highlight matching characters in search results

**Large Dataset Rendering:**
- Virtual scrolling or windowing for tables with 10,000+ rows
- Client-side sorting and filtering (all data loaded at once)
- Efficient re-rendering on sort/filter operations

**Deployment:**
- Static site hosting (Vercel, Netlify, GitHub Pages - all free tiers)
- No server-side rendering needed (SPA architecture)
- CDN for asset delivery

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- **Focus:** Solve one problem exceptionally well - finding profitable region trades across ALL EVE markets
- **Target:** Personal tool for Harry + 5-10 friends (not mass market)
- **Success Metric:** Tool is used regularly and saves time finding trades

**Resource Requirements:**
- **Team Size:** Solo developer (Harry) with potential friend contributions
- **Time Estimate:** 3-4 weeks full-time equivalent (or 2-3 months part-time)
- **Skills Needed:**
  - Frontend: React/Vue/Svelte, TypeScript, state management
  - Backend: Node.js/Python, REST APIs, background job scheduling
  - Database: PostgreSQL/MySQL, query optimization
  - DevOps: Docker, free hosting deployment (Vercel/Netlify + Railway/Render)

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
1. **Marcus (Trader):** Find profitable trades in < 10 seconds
2. **Harry (Admin):** Monitor system health, minimal maintenance

**Must-Have Capabilities:**

**Frontend:**
- Region selection via autocomplete dropdown (60+ EVE regions)
- Display ALL ROI opportunities in sortable table with columns: item name, buy station, sell station, buy price, sell price, ROI %, quantity
- Sorting by any column (click header to sort ascending/descending)
- **"Last updated" timestamp** prominently displayed (critical for data trust)
- Light/dark theme support with localStorage persistence
- Keyboard navigation (tab, enter, escape, arrows)
- Fast page load (< 2 seconds initial, < 500ms table render)

**Backend:**
- Background job scheduler (runs every 30 minutes)
- Parallel API fetching (all EVE regions concurrently, respecting 150 req/sec limit)
- Database caching (efficient storage & querying of millions of market orders)
- REST API endpoints for frontend data fetching
- Error handling for ESI API failures (503, timeouts) with retry logic
- Detailed logging for debugging (JSON format with timestamps)
- Data freshness tracking (timestamp of last successful fetch)
- Stale data communication (show last successful update if job fails)

**Infrastructure:**
- Docker-based development environment (Docker Compose single-command startup)
- $0/month deployment (free hosting tiers: Vercel/Netlify frontend + Railway/Render backend)
- Public markets only (skip private structures requiring authentication)

### Post-MVP Features

**Phase 2 (Growth) - Months 4-6:**
- Color-coding by ROI level (visual clarity: high=green, medium=yellow, low=gray)
- Filtering capabilities (by item name, ROI threshold, minimum quantity)
- UI/UX polish (better error messages, loading states, empty states)
- Mobile-friendly responsive design (support traders on tablets/phones)
- Performance optimizations (query caching, bundle size reduction)

**Phase 3 (Vision/Expansion) - 6+ Months:**
- Multi-market comparison (3+ regions simultaneously)
- Historical price trends (track ROI changes over time)
- Price change alerts/notifications (high-ROI opportunities)
- Export opportunities to CSV/spreadsheet
- **ESI Authentication** (EVE SSO integration)
- Personal buy/sell order tracking (character-specific)
- Character-specific trade recommendations
- Private structure access (non-public stations with authentication)
- Portfolio management

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Parallel fetching takes too long** (> 30 min for all regions) | High | Start with major regions only for MVP, expand gradually; optimize concurrency settings |
| **Free hosting can't handle load** (10 concurrent users) | Medium | Monitor usage, have paid tier upgrade path ($5/mo Railway/Render) ready |
| **Database query performance** (millions of orders) | High | Implement database indexing on region_id + type_id; use query result caching |
| **ESI API rate limiting** (150 req/sec exceeded) | Medium | Implement rate limiter with queue; add exponential backoff on failures |

**Market Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Friends don't use it** (no adoption) | Low | It's personal tool - if Harry uses it, MVP succeeds; friend usage is bonus |
| **EVE ESI API changes** (breaking changes) | Medium | Monitor ESI changelogs; build abstraction layer for API client |
| **Existing tools improve** (competition) | Low | Focus on differentiation: ALL regions, free hosting, simple UX |

**Resource Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Limited development time** (side project) | Medium | Ruthlessly prioritize MVP; cut Growth features if needed |
| **Solo developer burnout** | Medium | Use proven tech stack; avoid over-engineering; Docker for easy debugging |
| **Maintenance burden** | Low | Design for minimal maintenance (< 30 min/week); good logging + monitoring |

**Contingency Plan:**
- If resources are 50% less than planned: Cut filtering and mobile from Growth, focus on core MVP + timestamp
- If technical challenges exceed estimates: Deploy with fewer regions initially (top 10 trade hubs), expand later
- If hosting costs exceed $0: Accept $5/month for backend hosting (Railway/Render), keep frontend free (Vercel/Netlify)

## Functional Requirements

### Market Data Management

- **FR1:** System can fetch market order data from all EVE Online regions via ESI API
- **FR2:** System can store fetched market data in database for query performance
- **FR3:** System can automatically refresh market data every 30 minutes via background job
- **FR4:** System can track timestamp of last successful data fetch for each region
- **FR5:** System can handle ESI API failures gracefully and log errors for debugging
- **FR6:** System can fetch market data in parallel across multiple regions to minimize total fetch time
- **FR7:** System can respect ESI API rate limits (150 requests/second maximum)
- **FR8:** System can skip private structures that require authentication

### Market Comparison & Selection

- **FR9:** Users can select a "buy market" from a list of all available EVE regions
- **FR10:** Users can select a "sell market" from a list of all available EVE regions
- **FR11:** Users can search/filter region list using autocomplete functionality
- **FR12:** Users can navigate region selection using keyboard (arrow keys, enter, escape)
- **FR13:** System can prevent selection of same region for both buy and sell markets

### Opportunity Display & Analysis

- **FR14:** System can calculate ROI for all items between selected buy and sell markets
- **FR15:** System can display ALL profitable opportunities (no pagination or arbitrary limits)
- **FR16:** Users can view opportunity details: item name, buy station, sell station, buy price, sell price, ROI %, quantity
- **FR17:** Users can sort opportunities by any column (ROI, price, quantity, item name, station)
- **FR18:** Users can re-sort dynamically by clicking column headers
- **FR19:** System can render large datasets (10,000+ opportunities) efficiently
- **FR20:** Users can see data freshness via "Last updated" timestamp display

### User Preferences & Theming

- **FR21:** Users can switch between light and dark visual themes
- **FR22:** System can persist user theme preference across sessions
- **FR23:** System can detect system theme preference (prefers-color-scheme) on first visit
- **FR24:** Users can navigate the interface using keyboard (tab, enter, escape, arrows)

### System Monitoring & Operations

- **FR25:** Administrators can view background job execution logs
- **FR26:** Administrators can manually trigger data fetch jobs for recovery scenarios
- **FR27:** System can display clear error messages when data fetch fails
- **FR28:** System can communicate stale data state to users (show last successful update time)
- **FR29:** Administrators can access system health indicators (job status, data age, error counts)

## Non-Functional Requirements

### Performance

**Page Load Performance:**
- **NFR-P1:** Initial page load must complete in < 2 seconds on modern desktop browsers
- **NFR-P2:** Time to Interactive (TTI) must be < 2.5 seconds
- **NFR-P3:** First Contentful Paint (FCP) must occur within 1 second

**Runtime Performance:**
- **NFR-P4:** Table rendering with 10,000+ opportunities must complete in < 500ms
- **NFR-P5:** Client-side sorting operations must complete in < 200ms
- **NFR-P6:** Region selection autocomplete must respond in < 100ms
- **NFR-P7:** ROI calculations for selected markets must complete in < 500ms server-side

**Data Transfer:**
- **NFR-P8:** Initial JavaScript bundle must be < 500KB (gzipped)
- **NFR-P9:** API response payload for ROI opportunities must be < 2MB per query

### Integration & API Reliability

**EVE ESI API Integration:**
- **NFR-I1:** System must respect ESI API rate limit of 150 requests/second maximum
- **NFR-I2:** System must implement exponential backoff for ESI API 503 errors (starting at 5 seconds)
- **NFR-I3:** Background job must retry failed API calls up to 3 times before marking job as failed
- **NFR-I4:** System must log all ESI API errors with timestamps, endpoints, and error codes for debugging
- **NFR-I5:** System must cache ESI responses to minimize redundant API calls

**Data Freshness:**
- **NFR-I6:** Background job must complete full region data fetch within 30-minute window
- **NFR-I7:** System must display timestamp of last successful data fetch prominently to users
- **NFR-I8:** System must communicate stale data state when fetch age exceeds 45 minutes

### Maintainability & Developer Experience

**Development Environment:**
- **NFR-M1:** Local development environment must be reproducible via Docker Compose with single command startup
- **NFR-M2:** Code must follow consistent style guide (enforced by linter) for long-term maintainability
- **NFR-M3:** All background jobs must produce structured logs for debugging (JSON format with timestamps)

**Operational Simplicity:**
- **NFR-M4:** System maintenance must require < 30 minutes per week on average
- **NFR-M5:** Deployment process must be automated via CI/CD (one command deploy to production)
- **NFR-M6:** Database migrations must be reversible for safe rollback scenarios

**Debugging & Monitoring:**
- **NFR-M7:** System must provide health check endpoint for monitoring job status and data age
- **NFR-M8:** Error logs must include sufficient context (stack traces, request IDs) for debugging without additional tools
- **NFR-M9:** Administrators must be able to manually trigger background jobs for recovery scenarios

### Reliability & Availability

**Uptime Targets:**
- **NFR-R1:** System must maintain 95% uptime (acceptable: ~36 hours downtime per month)
- **NFR-R2:** Planned maintenance windows acceptable with advance notice to users

**Graceful Degradation:**
- **NFR-R3:** Frontend must display cached data with "stale data" warning if backend is unavailable
- **NFR-R4:** System must continue serving ROI queries even if background job fails (using last successful fetch)
- **NFR-R5:** User interface must display clear error messages (not technical stack traces) when failures occur

**Cost Constraints:**
- **NFR-R6:** Infrastructure must operate at $0/month for MVP (free hosting tiers only)
- **NFR-R7:** If cost exceeds $0, solution must not exceed $5/month for backend hosting
