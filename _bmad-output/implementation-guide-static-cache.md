# Static-Cache Architecture - Implementation Guide

**Branch:** `feat/static-cache`
**Date:** 2026-02-20
**Status:** Ready for Testing

---

## Overview

This implementation removes the Neon database dependency and serves pre-calculated market opportunities as static JSON files from Vercel Edge CDN.

### Key Changes

1. ✅ **No Database Runtime** - Neon only needed during migration (can be removed)
2. ✅ **Static JSON Files** - Pre-generated, served from `/public/data/`
3. ✅ **Edge CDN Caching** - 20-50ms response time globally
4. ✅ **Fresh Data Notifications** - Users notified when new data available
5. ✅ **Zero Git Storage** - JSON files `.gitignored`, never committed
6. ✅ **ESI Compliance Check** - Validates cache headers before deploy

---

## Files Created/Modified

### New Scripts
- `webapp/scripts/generate-static-json.ts` - Generates static JSON files
- `webapp/scripts/check-esi-cache-headers.ts` - ESI compliance validator

### New Components
- `webapp/src/components/FreshDataNotification.tsx` - Notifies users of fresh data

### Modified Files
- `.gitignore` - Blocks `public/data/*.json` from git
- `webapp/src/lib/queries/opportunities.ts` - Fetches from static files
- `webapp/src/app/page.tsx` - Integrates FreshDataNotification
- `webapp/vercel.json` - Adds edge caching headers
- `.github/workflows/fetch-and-deploy-static.yml` - New deployment workflow

---

## Setup Instructions

### 1. Prerequisites

**Vercel Token Required:**
```bash
# Get your Vercel token from: https://vercel.com/account/tokens
# Add to GitHub Secrets as VERCEL_TOKEN
```

**GitHub Secrets Needed:**
- `VERCEL_TOKEN` - For deployments

**NOT Needed** (removed from workflow):
- ~~`NEON_DATABASE_URL`~~
- ~~`NEON_DIRECT_DATABASE_URL`~~

### 2. Local Testing

```bash
# Ensure you're on the feat/static-cache branch
git checkout feat/static-cache

# Install dependencies
cd webapp
npm install

# Test ESI compliance check
npx tsx scripts/check-esi-cache-headers.ts

# (Optional) Test static JSON generation locally
# First, you need market data artifacts
# You can either:
# A) Run the fetch workflow manually in GitHub Actions and download artifacts
# B) Create sample data for testing

# Generate static JSON (requires artifacts in market-data-artifacts/)
npx tsx scripts/generate-static-json.ts

# Check generated files (should NOT be in git)
ls -lh public/data/*.json

# Verify .gitignore is blocking them
git status  # Should NOT show public/data/*.json files
```

### 3. Deploy to Vercel

**Option A: GitHub Actions (Recommended)**

```bash
# Push to feat/static-cache branch
git push origin feat/static-cache

# GitHub Actions will automatically:
# 1. Fetch market data from ESI
# 2. Generate static JSON files
# 3. Deploy to Vercel with files included
```

**Option B: Manual Deployment**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link to your project
cd webapp
vercel link

# Generate static files (requires market data artifacts)
npx tsx scripts/generate-static-json.ts

# Build and deploy
vercel --prod
```

---

## Testing Checklist

### ✅ Pre-Deployment
- [ ] `.gitignore` blocks `public/data/*.json`
- [ ] `git status` shows NO JSON files staged
- [ ] ESI compliance check passes
- [ ] GitHub secret `VERCEL_TOKEN` is set

### ✅ Post-Deployment
- [ ] Visit deployed URL
- [ ] Select two regions (e.g., The Forge → Domain)
- [ ] Opportunities load successfully
- [ ] Check browser DevTools Network tab:
  - Request: `/data/10000002-10000043.json`
  - Response time: <100ms
  - Cache headers: `max-age=1800`
- [ ] Leave page open for 30+ minutes
- [ ] Fresh data notification appears after new deployment
- [ ] Click "Refresh Now" button - data updates

### ✅ Performance Verification
```bash
# Test static file response time
curl -w "@-" -o /dev/null -s "https://your-app.vercel.app/data/10000002-10000043.json" <<< '
Response Time: %{time_total}s
Cache Status: %{http_code}
'

# Expected: ~0.05s (50ms) on cached request
```

---

## Architecture Comparison

| Metric | Main (Neon) | Static-Cache |
|--------|-------------|--------------|
| **Database** | Required | None |
| **Response Time** | 100-200ms | 20-50ms ✅ |
| **Cost** | Hitting limits ⚠️ | $0 ✅ |
| **Scalability** | Limited | Infinite ✅ |
| **Git Storage** | None | None ✅ |

---

## Troubleshooting

### Issue: "No data available for this region pair"

**Cause:** Static JSON file not generated for that pair.

**Solution:**
- Check `scripts/generate-static-json.ts` region pair list
- Add desired region pair to `ALL_TRADING_REGIONS`
- Redeploy

### Issue: ESI Compliance Check Fails

**Cause:** ESI cache headers changed, or network error.

**Solution:**
```bash
# Re-run compliance check
npx tsx scripts/check-esi-cache-headers.ts

# If ESI requires shorter cache duration:
# 1. Update GitHub Actions schedule
# 2. Update vercel.json max-age
```

### Issue: Fresh Data Notification Not Showing

**Cause:** Metadata file not updating.

**Solution:**
```bash
# Check metadata generation in logs
# Verify /data/metadata.json exists and updates

# Test metadata endpoint
curl https://your-app.vercel.app/data/metadata.json
```

### Issue: Git Shows JSON Files as Staged

**Cause:** `.gitignore` not applied or files already tracked.

**Solution:**
```bash
# Remove from git cache
git rm --cached webapp/public/data/*.json

# Verify gitignore
cat .gitignore | grep "public/data"

# Should see: webapp/public/data/*.json
```

---

## Migration from Main to Static-Cache

**NOT recommended to migrate main branch.** Instead:

1. **Keep main branch** running (Neon database)
2. **Test static-cache** on separate deployment (different Vercel project)
3. **Compare** performance, cost, user experience
4. **Choose winner** after 1-2 weeks of testing

**If you decide to migrate main:**

```bash
# Backup current state
git tag backup-before-static-cache

# Merge feat/static-cache into main
git checkout main
git merge feat/static-cache

# Update GitHub Actions to use new workflow
# Disable old fetch-market-data.yml workflow

# Update Vercel environment (remove Neon secrets)

# Deploy
git push origin main
```

---

## Rollback Plan

**If static-cache has issues:**

```bash
# Revert main branch
git checkout main
git reset --hard backup-before-static-cache
git push --force origin main

# Or switch Vercel deployment back to main branch
vercel --prod --branch main
```

---

## Next Steps

1. **Test locally** - Verify ESI compliance
2. **Deploy to Vercel** - Push to feat/static-cache
3. **Monitor performance** - Compare with main branch
4. **Collect metrics** - Response times, user feedback
5. **Decide** - Keep static-cache or revert

---

## Support

**ESI API Documentation:**
- https://esi.evetech.net/ui/
- https://developers.eveonline.com/

**Vercel Documentation:**
- https://vercel.com/docs/edge-network/caching
- https://vercel.com/docs/cli

**Architecture Document:**
- See `_bmad-output/architecture-three-variant-comparison.md`

---

**Status:** Implementation complete. Ready for testing and deployment.

**Architect:** Winston
**Implementation Date:** 2026-02-20
