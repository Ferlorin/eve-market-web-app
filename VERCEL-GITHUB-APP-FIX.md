# Fix: Vercel GitHub App Auto-Creating Projects

## The Problem
Even with VERCEL_PROJECT_ID and VERCEL_ORG_ID configured, Vercel keeps creating duplicate "eve-market-web-app" projects.

**Root Cause:** Vercel GitHub App integration is auto-creating projects when it detects commits, independent of the CLI deployment.

---

## Solution: Disable GitHub App Integration

### Option 1: Uninstall Vercel GitHub App (Recommended)
Since you're deploying via GitHub Actions CLI, you don't need the GitHub App.

1. Go to: https://github.com/organizations/YOUR_ORG/settings/installations
   OR: https://github.com/settings/installations (for personal repos)

2. Find **"Vercel"** in the list of installed apps

3. Click **"Configure"**

4. Either:
   - **Uninstall** the Vercel app completely (if you only use CLI deployments)
   - OR **Remove** `eve-market-web-app` from the selected repositories

This prevents Vercel from auto-creating projects on every commit.

---

### Option 2: Configure GitHub App to Ignore This Repo

If you want to keep the GitHub App for other repos:

1. Go to Vercel GitHub App settings (link above)
2. Under "Repository access" → Select "Only select repositories"
3. **Uncheck** `eve-market-web-app`
4. Save

The CLI workflow will continue deploying, but the app won't create duplicates.

---

### Option 3: Keep Both Projects (Not Recommended)

If you want both:
- **webapp** - CLI deployments (your workflow)
- **eve-market-web-app** - GitHub App deployments

But this defeats the purpose of having a single deployment source.

---

## After You Fix It

1. Delete the duplicate "eve-market-web-app" project one more time
2. The next workflow run should ONLY deploy to "webapp"
3. No more duplicates will be created!

---

## Verify It's Fixed

Check your Vercel dashboard after the next deployment:
- ✅ Only "webapp" project exists
- ✅ New deployment appears under "webapp"
- ❌ NO new "eve-market-web-app" project

