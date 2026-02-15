# Deployment Guide

## Automatic Region Seeding

The application now automatically seeds EVE region names on deployment.

### How It Works

1. **Build Process** (`package.json`):
   ```bash
   npm run build
   # Runs: prisma migrate deploy && next build
   ```

2. **Smart Seeding** (`prisma/seed.ts`):
   - Checks if regions already exist in database
   - Only seeds if regions table is empty or missing names
   - Uses `upsert` for idempotency (safe to run multiple times)
   - Fetches all 113+ EVE regions from ESI API

3. **Deployment Flow**:
   ```
   Vercel: Deploy → Migrations → Build App → Start
   GitHub Actions: Seed Regions → Fetch Market Data (chunks)
   ```

### Vercel Deployment

When deploying to Vercel with Neon database:

1. **Environment Variables** (Vercel Dashboard):
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

2. **Build Process**:
   - Runs migrations during build (`prisma migrate deploy`)
   - Does NOT seed regions during build (prevents timeout issues)
   - Takes 1-2 minutes to build

3. **Initial Seeding** (required for first deploy):
   ```bash
   # After first deploy, manually seed regions:
   npx prisma db seed
   # or use Vercel CLI:
   vercel env pull .env.production
   npm run build  # This will fail if regions aren't seeded yet
   # So run seed separately:
   npx prisma db seed
   ```

4. **GitHub Actions Handles Seeding**:
   - The `fetch-market-data.yml` workflow seeds regions automatically
   - Runs on first execution before fetching market data
   - No manual intervention needed after first action run

### Local Development

```bash
# Initial setup
npm install
npx prisma migrate dev
npx prisma db seed

# Subsequent builds
npm run build  # Includes seed, but skips if already populated
```

### Neon Database Setup

1. **Create Neon Project** at https://neon.tech
2. **Copy Connection String** from Neon dashboard
3. **Add to Vercel**:
   - Settings → Environment Variables
   - Add `DATABASE_URL` with Neon connection string
   - Include `?sslmode=require` parameter

4. **Deploy**:
   ```bash
   git push
   # or
   vercel deploy
   ```

### Troubleshooting

**Region names not showing in UI:**
```bash
# Check if regions are seeded
npx prisma studio
# Navigate to Region table and verify names are populated

# If empty, manually run seed:
npx prisma db seed
```

**Seed fails during build:**
- Check ESI API is accessible (https://esi.evetech.net)
- Verify DATABASE_URL is set correctly
- Check Vercel build logs for errors

**Seed takes too long (>5 minutes):**
- ESI API might be slow/down
- Consider pre-seeding production database manually
- Update seed script rate limiting if needed

### GitHub Actions

The `fetch-market-data.yml` workflow handles region seeding automatically:

**Workflow Structure:**
1. **seed-regions** job (runs first):
   - Checks if regions exist in database
   - Seeds all EVE region names from ESI API
   - Idempotent - safe to run multiple times
   - Takes ~1-2 minutes

2. **fetch-high-volume** and **fetch-data** jobs:
   - Wait for seed-regions to complete (`needs: seed-regions`)
   - Run in parallel to fetch market data
   - Have region names available for queries

**Environment Variables Required:**
- `DATABASE_URL` - Set in repository secrets

**Manual Trigger:**
```bash
# Use GitHub UI: Actions → Fetch Market Data → Run workflow
# or via GitHub CLI:
gh workflow run fetch-market-data.yml
```
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

No additional changes needed for region seeding in CI/CD.
