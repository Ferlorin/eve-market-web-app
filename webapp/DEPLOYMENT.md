# Deployment Guide

## Automatic Region Seeding

The application now automatically seeds EVE region names on deployment.

### How It Works

1. **Build Process** (`package.json`):
   ```bash
   npm run build
   # Runs: prisma migrate deploy && prisma db seed && next build
   ```

2. **Smart Seeding** (`prisma/seed.ts`):
   - Checks if regions already exist in database
   - Only seeds if regions table is empty or missing names
   - Uses `upsert` for idempotency (safe to run multiple times)
   - Fetches all 113+ EVE regions from ESI API

3. **Deployment Flow**:
   ```
   Deploy → Migrations → Seed Regions → Build App → Start
   ```

### Vercel Deployment

When deploying to Vercel with Neon database:

1. **Environment Variables** (Vercel Dashboard):
   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

2. **Automatic Seeding**:
   - Runs during `vercel build` or `npm run build`
   - Skips seeding if regions already populated
   - Takes ~1-2 minutes on first deploy

3. **Manual Seeding** (if needed):
   ```bash
   # In Vercel CLI or local environment with production DATABASE_URL
   npm run build  # Includes seed step
   # or
   npx prisma db seed
   ```

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

The fetch-market-data workflow already has DATABASE_URL configured:
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

No additional changes needed for region seeding in CI/CD.
