# EVE Market Web App

A Next.js 16 web application for analyzing profitable trading opportunities between EVE Online markets using real-time data from the EVE Swagger Interface (ESI) API.

## Overview

The EVE Market Web App helps traders identify arbitrage opportunities by comparing buy and sell prices across different EVE Online regions. It automatically fetches and caches market data every 30 minutes, calculates ROI opportunities, and presents them in a high-performance, sortable table.

### Key Features

- 🌍 **Region Selection** - Choose buy and sell markets from 60+ EVE regions with fuzzy autocomplete search
- 📊 **ROI Calculations** - Instant calculations showing profitable trading opportunities
- ⚡ **High-Performance Table** - Virtual scrolling handles 10,000+ opportunities smoothly
- 🔄 **Auto-Refresh** - Market data updates every 30 minutes via background jobs
- 🎨 **Theme Switching** - Light and dark themes with system preference detection
- ⌨️ **Keyboard Navigation** - Full keyboard support for power users
- ♿ **Accessibility** - WCAG AA compliant with ARIA support
- 📱 **Responsive Design** - Desktop-optimized layout (minimum 1280px width)

## Technology Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Frontend:** React 19.2.3, TypeScript 5.x, Tailwind CSS 4.x
- **Database:** PostgreSQL 16 (Docker for development)
- **ORM:** Prisma 7.4.0 with pg adapter
- **State Management:** TanStack Query 5.x
- **UI Components:** Headless UI 2.x, Heroicons 2.x
- **API Client:** Axios 1.x with rate limiting
- **Data Handling:** @tanstack/react-virtual 3.x, date-fns 4.x, zod 4.x

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** 20.9 or higher ([Download](https://nodejs.org/))
- **npm:** Comes with Node.js (or use pnpm/yarn)
- **Docker Desktop:** For local PostgreSQL database ([Download](https://www.docker.com/products/docker-desktop))
- **Git:** For version control ([Download](https://git-scm.com/))

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd eve-market-web-app
```

### 2. Start the Database

Start PostgreSQL using Docker Compose:

```bash
docker-compose up -d
```

Verify the database is running:

```bash
docker-compose ps
# Should show "eve-market-postgres" with status "healthy"
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the `webapp/` directory:

```bash
cd webapp
```

Create `webapp/.env.local` with the following content:

```env
# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eve_market"

# Admin Token (for manual job triggers)
ADMIN_TOKEN="your-secure-admin-token-here"

# Optional: ESI API Configuration
ESI_BASE_URL="https://esi.evetech.net/latest"
ESI_USER_AGENT="eve-market-web-app/0.1.0"
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Initialize the Database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

Optionally, seed the database with initial region data:

```bash
npx prisma db seed
```

### 6. Fetch Market Data (First Time)

Before starting the app, fetch initial market data:

```bash
npm run fetch-data
```

This will take a few minutes as it fetches market orders from all EVE regions (~444K orders).

### 7. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
eve-market-web-app/
├── webapp/                      # Next.js application
│   ├── src/
│   │   ├── app/                # Next.js App Router
│   │   │   ├── api/           # API routes
│   │   │   │   ├── admin/     # Admin endpoints (trigger-fetch)
│   │   │   │   ├── cron/      # Background jobs
│   │   │   │   ├── opportunities/  # ROI calculation endpoint
│   │   │   │   ├── regions/   # Region list endpoint
│   │   │   │   ├── health/    # Health check endpoint
│   │   │   │   └── data-freshness/  # Data age endpoint
│   │   │   ├── page.tsx       # Main application page
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── providers.tsx  # React Query provider
│   │   ├── components/        # React components
│   │   │   ├── RegionSelector.tsx      # Autocomplete region picker
│   │   │   ├── OpportunityTable.tsx    # Virtual scrolling table
│   │   │   ├── ThemeToggle.tsx         # Theme switcher
│   │   │   ├── StaleDataBanner.tsx     # Data freshness warning
│   │   │   └── DataFreshness.tsx       # Footer timestamp
│   │   ├── jobs/              # Background job logic
│   │   │   ├── fetch-market-data.ts   # ESI data fetcher
│   │   │   └── cleanup-old-data.ts    # Database cleanup
│   │   └── lib/               # Utilities and clients
│   │       ├── db.ts          # Prisma client singleton
│   │       ├── esi-client.ts  # ESI API wrapper
│   │       ├── rate-limiter.ts  # Token bucket rate limiter
│   │       └── logger.ts      # Structured logging
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   ├── migrations/        # Database migrations
│   │   └── seed.ts            # Database seeding
│   ├── scripts/               # CLI scripts
│   │   ├── test-fetch.ts      # Manual data fetch
│   │   ├── test-cleanup.ts    # Manual cleanup
│   │   ├── dev-cron.ts        # Local cron simulator
│   │   └── check-db-size.ts   # Database size checker
│   ├── public/                # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── tailwind.config.ts
├── docker-compose.yml         # PostgreSQL configuration
├── docs/                      # Project documentation
│   ├── eve-market-poc-requirements.md
│   └── eve-market-scanner-architecture.md
├── _bmad/                     # BMAD framework configuration
├── _bmad-output/              # Generated artifacts & progress logs
└── README.md                  # This file
```

## Available Scripts

Navigate to the `webapp/` directory to run these commands:

### Development

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management

```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Create and apply migrations
npx prisma migrate deploy  # Apply migrations (production)
npx prisma studio          # Open Prisma Studio GUI
npx prisma db seed         # Seed database with regions
npm run db-size            # Check database size
```

### Data Operations

```bash
npm run fetch-data   # Manually fetch market data from ESI
npm run cleanup      # Manually run cleanup job (remove data >7 days old)
npm run dev-cron     # Run local cron simulator (30-min fetch + cleanup)
```

## Configuration

### Database Configuration

The PostgreSQL database is configured in `docker-compose.yml`:

- **Host:** localhost
- **Port:** 5432
- **Database:** eve_market
- **User:** postgres
- **Password:** postgres

To change these settings, update both `docker-compose.yml` and `webapp/.env.local`.

### ESI API Configuration

The app respects EVE Online ESI API rate limits:

- **Rate Limit:** 150 requests/second (enforced by token bucket algorithm)
- **Retry Logic:** Exponential backoff starting at 5 seconds for 503 errors
- **Max Retries:** 3 attempts per request before marking as failed

Configure ESI settings in `webapp/src/lib/esi-client.ts`.

### Background Jobs

The app uses Vercel Cron for scheduled tasks in production:

- **Market Data Fetch:** Every 30 minutes (`/api/cron/fetch-markets`)
  - Each fetch **replaces all orders** for each region with fresh data from ESI
  - Old/expired orders are automatically removed during each fetch
  - Ensures data is always current (no stale orders remain)
- **Data Cleanup:** Daily at 2:00 AM (`/api/cron/cleanup`)
  - Removes orders older than 7 days (data retention policy)

For local development, use `npm run dev-cron` to simulate cron jobs.

### Data Retention & Freshness

**Automatic Data Refresh:**
- Every 30 minutes, the fetch job retrieves current active orders from ESI
- For each region, all existing orders are deleted and replaced with fresh data
- This ensures ROI calculations only use currently active market orders
- No stale or expired orders remain in the database between fetches

**Long-term Cleanup:**
Market orders older than 7 days are automatically purged to stay within the 0.5GB database limit (Neon free tier). This cleanup runs daily as an additional safety measure, though most data is already replaced during regular fetches.

## API Endpoints

### Public Endpoints

- `GET /api/regions` - List all EVE regions
- `GET /api/opportunities?buyRegion=X&sellRegion=Y` - Calculate ROI opportunities
- `GET /api/health` - System health check
- `GET /api/data-freshness` - Last data fetch timestamp

### Admin Endpoints

- `POST /api/admin/trigger-fetch` - Manually trigger market data fetch
  - Requires `X-Admin-Token` header matching `ADMIN_TOKEN` env variable

### Cron Endpoints (Scheduled)

- `GET /api/cron/fetch-markets` - Fetch all market data
- `GET /api/cron/cleanup` - Clean up old data

## Usage Guide

### 1. Select Markets

1. Open the application at http://localhost:3000
2. Click the "Buy Market" dropdown and search for a region (e.g., "Jita" or "The Forge")
3. Click the "Sell Market" dropdown and select a different region (e.g., "Amarr")

### 2. View Opportunities

The table automatically populates with profitable trading opportunities showing:

- **Item Name** - The tradeable item
- **Buy Station** - Where to buy (station ID)
- **Sell Station** - Where to sell (station ID)
- **Buy Price** - Purchase price per unit
- **Sell Price** - Selling price per unit
- **ROI %** - Return on investment percentage
- **Quantity** - Available volume
- **Volume** - Total m³

### 3. Sort Results

Click any column header to sort:

- **Default:** Sorted by ROI % (highest first)
- Click again to reverse sort direction
- Active column shows a blue arrow indicator

### 4. Theme Switching

Click the sun/moon icon in the top-right corner to toggle between light and dark themes.

### 5. Keyboard Navigation

- **Tab** - Navigate between elements
- **Shift+Tab** - Navigate backwards
- **Enter** - Select/activate
- **Escape** - Close dropdowns
- **Arrow Keys** - Navigate dropdown options

## Monitoring & Health

### Health Check

Visit http://localhost:3000/api/health to check system status:

```json
{
  "status": "healthy",
  "lastFetchTime": "2026-02-14T10:30:00.000Z",
  "dataAge": 15,
  "timestamp": "2026-02-14T10:45:00.000Z"
}
```

Status values:
- `healthy` - Data age < 45 minutes
- `degraded` - Data age 45-120 minutes (stale warning)
- `unhealthy` - Data age > 120 minutes or last job failed

### Logs

All background jobs produce structured JSON logs visible in the console:

```json
{
  "timestamp": "2026-02-14T10:30:00.000Z",
  "level": "info",
  "operation": "fetch-market-data",
  "region": "The Forge",
  "ordersCount": 52431,
  "duration": 2341
}
```

### Manual Job Trigger

Trigger a data fetch manually via API:

```bash
curl -X POST http://localhost:3000/api/admin/trigger-fetch \
  -H "X-Admin-Token: your-secure-admin-token-here"
```

## Troubleshooting

### Database Connection Errors

**Issue:** "Can't reach database server"

**Solution:**
1. Ensure Docker Desktop is running
2. Start PostgreSQL: `docker-compose up -d`
3. Check status: `docker-compose ps`
4. Verify connection: `docker-compose logs postgres`

### Port Already in Use

**Issue:** "Port 3000 is already in use"

**Solution:**
```bash
# Find and kill the process using port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Prisma Client Not Found

**Issue:** "Cannot find module '@prisma/client'"

**Solution:**
```bash
cd webapp
npx prisma generate
npm install
```

### No Market Data

**Issue:** Empty opportunity table

**Solution:**
1. Fetch initial data: `npm run fetch-data`
2. Wait 5-10 minutes for the job to complete
3. Check logs for any errors
4. Verify database has data: `npx prisma studio`

### Stale Data Warning

**Issue:** Yellow/red banner showing stale data

**Solution:**
- Data is older than 45 minutes
- Trigger manual fetch: `curl -X POST http://localhost:3000/api/admin/trigger-fetch -H "X-Admin-Token: your-token"`
- Or wait for the next scheduled fetch (every 30 minutes)

## Development Notes

### Hot Reload

Turbopack provides instant hot reload. Changes to React components update in <50ms without full page refresh.

### Type Safety

All API responses are validated using Zod schemas. Prisma provides full type safety for database operations.

### Performance Targets

- Initial page load: <2 seconds
- Table rendering (10K rows): <500ms
- Column sorting: <200ms
- Autocomplete response: <100ms
- API response time: <500ms

## Production Deployment

For production deployment instructions, please contact the **DevOps/Platform Engineering team** or your **System Architect**. They can provide guidance on:

- Hosting platform setup (Vercel, Railway, AWS, etc.)
- Environment variable configuration for production
- Database migration strategy (Neon PostgreSQL, AWS RDS, etc.)
- Vercel Cron setup for scheduled jobs
- SSL certificate configuration
- Domain setup and DNS configuration
- CI/CD pipeline configuration
- Monitoring and alerting setup

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes and test thoroughly
3. Run linter: `npm run lint`
4. Build to verify: `npm run build`
5. Commit changes: `git commit -m "Add your feature"`
6. Push to branch: `git push origin feature/your-feature`
7. Create a Pull Request

## License

[Your License Here]

## Support

For issues or questions:

- **Technical Issues:** Check the Troubleshooting section above
- **Feature Requests:** Create an issue in the project repository
- **Deployment Questions:** Contact DevOps/Platform Engineering team
- **EVE Online API:** Visit [ESI Documentation](https://esi.evetech.net/ui/)

---

**Built with ❤️ for EVE Online traders**
