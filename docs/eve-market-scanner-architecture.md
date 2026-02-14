# EVE Market Scanner - Architectural Design Document

**Version:** 1.0
**Date:** 2026-02-13
**Status:** Approved for Implementation
**Project Owner:** S-nar

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Technology Stack](#technology-stack)
4. [Architecture Design](#architecture-design)
5. [Data Model](#data-model)
6. [API Integration](#api-integration)
7. [UI/UX Design](#uiux-design)
8. [Implementation Plan](#implementation-plan)
9. [Cost Analysis](#cost-analysis)
10. [Future Considerations](#future-considerations)

---

## Executive Summary

### Project Goal
Build a Windows desktop proof-of-concept application that analyzes EVE Online market data to identify profitable trading opportunities between two markets/stations, with zero infrastructure cost and clear path to web migration.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Desktop Framework** | Electron | Zero-cost deployment, web migration path, single codebase |
| **Frontend** | React + TypeScript | Modern, maintainable, large ecosystem |
| **Backend** | Node.js | Electron compatibility, ESI API client libraries |
| **Database** | SQLite | Local caching, no server costs, respects rate limits |
| **Deployment** | GitHub Releases | Free distribution, version control integrated |

### Success Metrics
- ✅ Fetches market data from EVE Online ESI API
- ✅ Calculates ROI between two selected markets
- ✅ Displays sortable, paginated results
- ✅ Zero hosting/infrastructure costs
- ✅ Runs on Windows without issues
- ✅ Web-portable codebase

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                       │
│              (Electron Desktop Window)                  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼────────┐
│  REACT UI      │      │  ELECTRON MAIN  │
│  (Renderer)    │◄─────┤   PROCESS       │
│                │ IPC  │                 │
│ - Market Select│      │ - DB Init       │
│ - Data Grid    │      │ - Window Mgmt   │
│ - Sorting      │      └─────────────────┘
└───────┬────────┘
        │
┌───────▼────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER                   │
│                                                 │
│  ┌──────────────┐      ┌──────────────────┐   │
│  │ ESI API      │      │ Market Analyzer  │   │
│  │ Client       │─────►│                  │   │
│  │              │      │ - Calculate ROI  │   │
│  │ - Regions    │      │ - Filter Results │   │
│  │ - Orders     │      │ - Sort by Profit │   │
│  │ - Stations   │      └──────────────────┘   │
│  └──────┬───────┘                              │
│         │                                      │
│  ┌──────▼───────┐                              │
│  │ Rate Limiter │                              │
│  │ (150 req/s)  │                              │
│  └──────┬───────┘                              │
└─────────┼──────────────────────────────────────┘
          │
┌─────────▼─────────┐
│   SQLITE CACHE    │
│                   │
│ - market_orders   │
│ - stations        │
│ - items           │
│ - cache_metadata  │
└───────────────────┘
```

### Data Flow

```
1. User selects Market A (Buy) and Market B (Sell)
          ↓
2. UI triggers data fetch request
          ↓
3. ESI Client checks SQLite cache (TTL: 15 minutes)
          ↓
4. If stale/missing → Fetch from ESI API
          ↓
5. Rate limiter enforces 150 requests/second
          ↓
6. Store responses in SQLite cache
          ↓
7. Market Analyzer processes data:
   - Match buy orders (Market A) with sell orders (Market B)
   - Calculate: ROI = ((SellPrice - BuyPrice) / BuyPrice) * 100
   - Filter: ROI > 0%
   - Sort: ROI DESC
          ↓
8. React UI renders results in TanStack Table
          ↓
9. User can sort, paginate, and explore opportunities
```

---

## Technology Stack

### Core Technologies

#### Frontend (Renderer Process)
```json
{
  "framework": "React 18+",
  "language": "TypeScript 5+",
  "stateManagement": "React Context API",
  "uiLibrary": "shadcn/ui (or Material-UI)",
  "dataGrid": "TanStack Table v8",
  "styling": "Tailwind CSS",
  "icons": "Lucide React"
}
```

#### Desktop Shell
```json
{
  "runtime": "Electron 28+",
  "builder": "Electron Builder",
  "ipc": "Electron IPC (contextBridge)"
}
```

#### Backend (Main Process + Services)
```json
{
  "runtime": "Node.js 20+",
  "httpClient": "Axios",
  "database": "better-sqlite3",
  "rateLimiter": "bottleneck"
}
```

#### Development Tools
```json
{
  "bundler": "Vite",
  "linter": "ESLint",
  "formatter": "Prettier",
  "testing": "Vitest + React Testing Library",
  "cicd": "GitHub Actions"
}
```

### Why This Stack?

**Zero Cost:**
- All packages are open-source and free
- No cloud hosting required (runs locally)
- GitHub provides free CI/CD and distribution

**Fastest Delivery:**
- Vite provides instant HMR (Hot Module Replacement)
- TypeScript catches bugs at compile time
- React has massive component ecosystem

**Web Migration Ready:**
- Same React codebase works in browser
- Replace Electron shell with web server
- SQLite → PostgreSQL/MySQL migration path clear

---

## Architecture Design

### Layered Architecture Pattern

#### Layer 1: Presentation Layer (React UI)

**Components Structure:**
```
src/renderer/
├── components/
│   ├── MarketSelector.tsx       # Dual dropdown for market selection
│   ├── RefreshButton.tsx        # Manual data refresh trigger
│   ├── OpportunitiesGrid.tsx    # TanStack Table with opportunities
│   ├── StatusBar.tsx            # Last updated, API status
│   └── common/
│       ├── Button.tsx
│       ├── Dropdown.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── useMarketData.ts         # Fetch and manage market data
│   ├── useESIApi.ts             # ESI API interaction hook
│   └── useOpportunities.ts      # ROI calculation and filtering
├── context/
│   └── AppContext.tsx           # Global state (selected markets, data)
├── types/
│   └── market.types.ts          # TypeScript interfaces
└── App.tsx                      # Root component
```

**Key Design Patterns:**
- **Container/Presenter Pattern**: Separate logic from UI
- **Custom Hooks**: Encapsulate data fetching and business logic
- **Context API**: Share selected markets across components
- **Compound Components**: MarketSelector manages its own state

#### Layer 2: Business Logic Layer (Services)

**Services Structure:**
```
src/services/
├── esiClient.ts                 # ESI API client
│   ├── getRegions()
│   ├── getMarketOrders(regionId, itemIds?)
│   ├── getStationInfo(stationId)
│   └── getItemInfo(itemId)
├── marketAnalyzer.ts            # ROI calculation engine
│   ├── calculateOpportunities(marketA, marketB)
│   ├── filterByMinROI(opportunities, minROI)
│   └── sortOpportunities(opportunities, sortBy)
├── rateLimiter.ts               # API rate limiting
│   └── createLimiter(maxRequests, interval)
└── cacheManager.ts              # SQLite cache interaction
    ├── getCachedOrders(regionId)
    ├── setCachedOrders(regionId, orders)
    └── isCacheValid(regionId, ttl)
```

**Business Logic Examples:**

```typescript
// ROI Calculation Algorithm
interface Opportunity {
  buyStation: string;
  sellStation: string;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  roi: number;
}

function calculateOpportunities(
  buyOrders: MarketOrder[],
  sellOrders: MarketOrder[]
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // For each item in buy market
  for (const buyOrder of buyOrders.filter(o => o.is_buy_order === false)) {
    // Find matching sell orders in sell market
    const matchingSellOrders = sellOrders.filter(
      o => o.type_id === buyOrder.type_id && o.is_buy_order === true
    );

    for (const sellOrder of matchingSellOrders) {
      // Calculate ROI: (Sell Price - Buy Price) / Buy Price * 100
      const roi = ((sellOrder.price - buyOrder.price) / buyOrder.price) * 100;

      if (roi > 0) {
        opportunities.push({
          buyStation: buyOrder.location_id,
          sellStation: sellOrder.location_id,
          itemName: getItemName(buyOrder.type_id),
          buyPrice: buyOrder.price,
          sellPrice: sellOrder.price,
          quantity: Math.min(buyOrder.volume_remain, sellOrder.volume_remain),
          roi: roi
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.roi - a.roi); // Sort by ROI DESC
}
```

#### Layer 3: Data Access Layer (SQLite)

**Database Schema:**

```sql
-- Market orders cache
CREATE TABLE market_orders (
    order_id INTEGER PRIMARY KEY,
    region_id INTEGER NOT NULL,
    type_id INTEGER NOT NULL,        -- Item ID
    location_id INTEGER NOT NULL,     -- Station ID
    price REAL NOT NULL,
    volume_remain INTEGER NOT NULL,
    is_buy_order BOOLEAN NOT NULL,
    issued TEXT NOT NULL,             -- ISO timestamp
    cached_at TEXT NOT NULL,          -- When we cached this
    INDEX idx_region_type (region_id, type_id)
);

-- Station metadata
CREATE TABLE stations (
    station_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    region_id INTEGER NOT NULL
);

-- Item metadata
CREATE TABLE items (
    type_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

-- Cache metadata for TTL tracking
CREATE TABLE cache_metadata (
    region_id INTEGER PRIMARY KEY,
    last_updated TEXT NOT NULL,       -- ISO timestamp
    record_count INTEGER DEFAULT 0
);
```

**Cache Strategy:**
- **TTL (Time To Live):** 15 minutes per region
- **Invalidation:** Automatic on manual refresh
- **Storage:** ~50MB for 2 regions with full order books
- **Query Performance:** Indexed by region_id + type_id

#### Layer 4: Electron Main Process

**Responsibilities:**
```typescript
// src/main/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow;
let db: Database.Database;

// Initialize database on app ready
app.on('ready', () => {
  db = new Database('market-cache.db');
  initializeSchema(db);
  createWindow();
});

// IPC handlers for renderer communication
ipcMain.handle('fetch-market-data', async (event, marketA, marketB) => {
  // Coordinate ESI API calls and cache management
  return await fetchAndCacheMarketData(marketA, marketB);
});

ipcMain.handle('get-cached-data', async (event, regionId) => {
  return getCachedData(db, regionId);
});
```

---

## Data Model

### Core Entities

#### Market Order
```typescript
interface MarketOrder {
  order_id: number;
  type_id: number;           // EVE item ID
  location_id: number;       // Station ID
  price: number;
  volume_remain: number;
  is_buy_order: boolean;
  issued: string;            // ISO timestamp
  region_id: number;
}
```

#### Trading Opportunity
```typescript
interface TradingOpportunity {
  buyStation: string;        // Station name
  sellStation: string;       // Station name
  itemName: string;
  itemId: number;            // For future filtering
  buyPrice: number;
  sellPrice: number;
  quantity: number;          // Available volume
  roi: number;               // ROI percentage
  profit: number;            // Absolute profit (calculated)
}
```

#### Market Region
```typescript
interface MarketRegion {
  region_id: number;
  region_name: string;
  station_count: number;
}
```

### Data Relationships

```
Region (1) ────── (N) Stations
                      │
                      │
Station (1) ────── (N) Market Orders
                      │
                      │
Item (1) ──────────── (N) Market Orders

Trading Opportunity
    ├── Buy Order (from Market A)
    └── Sell Order (from Market B)
```

---

## API Integration

### EVE Online ESI API

**Base URL:** `https://esi.evetech.net/latest/`

**Key Endpoints:**

#### 1. Get Universe Regions
```http
GET /universe/regions/
Response: [10000001, 10000002, 10000003, ...]
```

#### 2. Get Region Details
```http
GET /universe/regions/{region_id}/
Response: {
  "region_id": 10000002,
  "name": "The Forge",
  "description": "..."
}
```

#### 3. Get Market Orders for Region
```http
GET /markets/{region_id}/orders/
Query Params:
  - order_type: all | buy | sell
  - page: 1
Response: [
  {
    "order_id": 5630681224,
    "type_id": 34,              // Tritanium
    "location_id": 60003760,    // Jita 4-4
    "price": 5.24,
    "volume_remain": 1000000,
    "is_buy_order": false,
    "issued": "2026-02-13T15:30:00Z"
  },
  ...
]
```

#### 4. Get Station Info
```http
GET /universe/stations/{station_id}/
Response: {
  "station_id": 60003760,
  "name": "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
  "system_id": 30000142
}
```

#### 5. Get Item Info
```http
GET /universe/types/{type_id}/
Response: {
  "type_id": 34,
  "name": "Tritanium",
  "description": "..."
}
```

### Rate Limiting Strategy

**ESI Limits:**
- 150 requests per second
- Error rate limiting if exceeded

**Implementation:**
```typescript
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  maxConcurrent: 20,           // Max parallel requests
  minTime: 10,                 // Min 10ms between requests (100/sec)
  reservoir: 150,              // Total tokens
  reservoirRefreshAmount: 150,
  reservoirRefreshInterval: 1000  // Refill every second
});

export const rateLimitedGet = limiter.wrap(axios.get);
```

### Error Handling

```typescript
async function fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await rateLimitedGet(url);
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Rate limited - wait and retry
        await sleep(5000);
        continue;
      }
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## UI/UX Design

### Design Principles

1. **Clarity over Complexity:** Traders need information fast
2. **Dark Theme Default:** EVE players expect dark interfaces
3. **Data Density:** Show maximum information without clutter
4. **One-Click Actions:** Minimize clicks to value

### Component Specifications

#### Market Selector Component

**Visual Design:**
```
┌──────────────────────────────────────────────────┐
│  🎯 Select Markets for Comparison                │
│                                                   │
│  Buy Market          →→→       Sell Market       │
│  ┌──────────────┐             ┌──────────────┐  │
│  │ The Forge ▼  │             │ Domain    ▼  │  │
│  └──────────────┘             └──────────────┘  │
│   (Jita 4-4)                   (Amarr)          │
│                                                   │
│  [🔄 Refresh Market Data]  ⏱ Updated 3 mins ago │
└──────────────────────────────────────────────────┘
```

**Behavior:**
- Dropdown populated from ESI `/universe/regions`
- Default: Jita (The Forge) ↔ Amarr (Domain)
- Validation: Prevent same region selection
- Auto-refresh: Optional 5-minute polling (disabled by default)

#### Opportunities Data Grid

**Column Configuration:**

| Column | Width | Sortable | Format | Default Sort |
|--------|-------|----------|--------|--------------|
| Buy Station | 25% | Yes | String | - |
| Sell Station | 25% | Yes | String | - |
| Item Name | 20% | Yes | String | - |
| Buy Price | 10% | Yes | `123.45 ISK` | - |
| Sell Price | 10% | Yes | `123.45 ISK` | - |
| Quantity | 10% | Yes | `1,234` | - |
| ROI % | 10% | Yes | `56.7%` | DESC ⬇ |

**Visual Features:**
- ROI column color-coded:
  - 🟢 Green: ROI > 50%
  - 🟡 Yellow: ROI 25-50%
  - ⚪ Gray: ROI < 25%
- Hover row highlights
- Click row to copy item name to clipboard
- Pagination: 50 items per page

**Empty State:**
```
┌────────────────────────────────────┐
│                                     │
│        📊 No Opportunities          │
│                                     │
│  Select two markets and click       │
│  "Refresh Market Data" to find      │
│  profitable trading opportunities   │
│                                     │
└────────────────────────────────────┘
```

**Loading State:**
```
┌────────────────────────────────────┐
│                                     │
│          ⏳ Loading...              │
│                                     │
│   Fetching market data from ESI    │
│   This may take 10-30 seconds      │
│                                     │
└────────────────────────────────────┘
```

#### Status Bar

```
┌──────────────────────────────────────────────────────┐
│ 🟢 Connected to ESI  │  📊 234 opportunities found  │
│ ⏱ Last updated: 2026-02-13 15:45:32                 │
└──────────────────────────────────────────────────────┘
```

### Color Palette (Dark Theme)

```css
:root {
  --background: #0a0a0a;
  --surface: #1a1a1a;
  --surface-elevated: #2a2a2a;

  --primary: #00d4ff;      /* EVE blue */
  --primary-hover: #00b8e6;

  --success: #10b981;      /* High ROI */
  --warning: #f59e0b;      /* Medium ROI */
  --danger: #ef4444;       /* Errors */

  --text-primary: #ffffff;
  --text-secondary: #a3a3a3;
  --text-muted: #737373;

  --border: #404040;
}
```

### Accessibility

- **Keyboard Navigation:**
  - Tab: Navigate between markets and refresh button
  - Arrow Keys: Navigate grid rows
  - Enter: Trigger refresh or copy item name

- **Screen Readers:**
  - ARIA labels on all interactive elements
  - Status announcements for data loading/errors

- **High Contrast Mode:**
  - Ensure 4.5:1 contrast ratio minimum
  - Maintain color-coded ROI with patterns (not just color)

---

## Implementation Plan

### Phase 1: Foundation (Days 1-2)

**Tasks:**
1. Initialize GitHub repository
2. Setup Electron + React + TypeScript with Vite
3. Configure project structure
4. Install dependencies
5. Setup ESLint + Prettier
6. Create basic Electron window

**Deliverables:**
- Working Electron app that displays "Hello World"
- All dependencies installed
- Development environment ready

### Phase 2: ESI Integration (Days 2-3)

**Tasks:**
1. Create ESI API client service
2. Implement rate limiter
3. Add region and station fetching
4. Add market orders fetching
5. Write unit tests for API client

**Deliverables:**
- Functional ESI API client
- Rate limiting working
- Ability to fetch market data for Jita

### Phase 3: Data Layer (Days 3-4)

**Tasks:**
1. Initialize SQLite database
2. Create schema
3. Implement cache management
4. Build Market Analyzer service
5. Test ROI calculation logic

**Deliverables:**
- SQLite caching working
- ROI calculations accurate
- Cache TTL functioning

### Phase 4: UI Development (Days 4-5)

**Tasks:**
1. Build MarketSelector component
2. Build OpportunitiesGrid with TanStack Table
3. Build RefreshButton
4. Build StatusBar
5. Wire components together

**Deliverables:**
- Functional UI displaying market opportunities
- Sorting and pagination working
- Refresh functionality operational

### Phase 5: Polish & Release (Days 5-6)

**Tasks:**
1. Error handling and user feedback
2. Loading states
3. Empty states
4. Configure Electron Builder
5. Generate Windows installer
6. Write README
7. Create GitHub Release

**Deliverables:**
- `.exe` installer for Windows
- Complete documentation
- Public GitHub repository

---

## Cost Analysis

### Infrastructure Costs: $0

| Component | Service | Cost |
|-----------|---------|------|
| **Hosting** | N/A (local desktop app) | $0 |
| **Database** | SQLite (local) | $0 |
| **API** | EVE Online ESI (public) | $0 |
| **Distribution** | GitHub Releases | $0 |
| **CI/CD** | GitHub Actions (free tier) | $0 |
| **Domain** | N/A (no web hosting) | $0 |
| **SSL Certificate** | N/A | $0 |

**Total Monthly Cost:** $0

### Development Costs

| Resource | Estimate |
|----------|----------|
| **Development Time** | 5-6 days (full-time) |
| **Testing** | 1-2 days |
| **Documentation** | 1 day (concurrent) |

**Total Development:** ~7-8 days

### Open Source Dependencies: $0

All packages are MIT/Apache licensed and free to use:
- Electron (MIT)
- React (MIT)
- TypeScript (Apache 2.0)
- Vite (MIT)
- TanStack Table (MIT)
- better-sqlite3 (MIT)
- Axios (MIT)

---

## Future Considerations

### Web Migration Path

**Step 1: Extract Business Logic**
- Move `services/` to shared package
- Ensure no Electron-specific dependencies

**Step 2: Replace Electron**
- Swap Electron main process with Express.js server
- Replace IPC with REST API endpoints

**Step 3: Replace SQLite**
- Migrate to PostgreSQL or MySQL
- Same schema, different driver

**Step 4: Deploy**
- Host frontend on Vercel/Netlify (free tier)
- Host backend on Railway/Render (free tier possible)

**Estimated Migration Time:** 2-3 days

### Potential Enhancements (Post-PoC)

1. **Multi-Region Analysis**
   - Compare more than 2 markets
   - Matrix view of all major trade hubs

2. **Profit Calculator**
   - Account for broker fees (0.3-1%)
   - Account for sales tax (0-2%)
   - Calculate jump distance and time

3. **Historical Tracking**
   - Store opportunity history
   - Show price trends over time
   - Alert on high ROI opportunities

4. **Item Filtering**
   - Filter by item category
   - Minimum ROI threshold
   - Minimum volume threshold

5. **Auto-Refresh**
   - Background polling (user configurable)
   - Desktop notifications for high ROI

6. **Export Functionality**
   - CSV export
   - Copy table to clipboard
   - Share opportunity links

### Scalability Considerations

**Current Design Handles:**
- 2 regions
- ~50,000 market orders per region
- ~5,000 calculated opportunities
- 1 concurrent user (local desktop)

**To Scale to Web:**
- Add Redis for shared caching
- Add PostgreSQL for multi-user support
- Add WebSocket for real-time updates
- Add authentication (OAuth with EVE SSO)

---

## Appendix

### Glossary

- **ESI:** EVE Swagger Interface - Official EVE Online API
- **ROI:** Return on Investment - Profit percentage
- **ISK:** Interstellar Kredits - EVE Online currency
- **Station Trading:** Buying low in one market, selling high in another
- **Order Book:** List of all buy/sell orders for an item

### References

- [EVE Online ESI Documentation](https://esi.evetech.net/ui/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TanStack Table](https://tanstack.com/table/latest)

### Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-13 | Use Electron over native desktop | Web migration path, faster development |
| 2026-02-13 | SQLite over in-memory cache | Persistence between sessions, cache TTL |
| 2026-02-13 | TanStack Table over custom grid | Battle-tested, sorting/pagination built-in |
| 2026-02-13 | Manual refresh over auto-polling | Simpler PoC, respects ESI rate limits |
| 2026-02-13 | Dark theme only | EVE player expectations, reduce scope |

---

**Document Prepared By:**
🏗️ Winston (Architect) + 📚 Paige (Technical Writer)

**Reviewed By:**
📋 John (Product Manager) + 📊 Mary (Business Analyst) + 🎨 Sally (UX Designer)

**Approved By:**
S-nar (Project Owner)

---

*This document is a living specification and will be updated as implementation progresses.*
