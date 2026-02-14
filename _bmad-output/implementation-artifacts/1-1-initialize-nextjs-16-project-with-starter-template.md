# Story 1.1: Initialize Next.js 16 Project with Starter Template

Status: ready-for-dev

## Story

As a developer,
I want to initialize the Next.js 16 project with TypeScript, Tailwind CSS, and recommended defaults,
So that I have a solid foundation to build the EVE Market Web App.

## Acceptance Criteria

**Given** I have Node.js 20.9+ installed
**When** I run `npx create-next-app@latest eve-market-web-app --yes`
**Then** a new Next.js 16.1.6 project is created with TypeScript 5.9.3, Tailwind CSS 4.1, ESLint, App Router, Turbopack, and src/ directory structure
**And** the project builds successfully with `pnpm build`
**And** the development server starts with `pnpm dev` on http://localhost:3000

## Technical Requirements

### Core Technology Stack

**Framework Versions (Latest Stable - Feb 2026):**
- **Next.js:** 16.1.6 (with Turbopack as default bundler)
- **React:** 19.2.4 (latest stable)
- **TypeScript:** 5.9.3
- **Tailwind CSS:** 4.1 (with @tailwindcss/vite plugin)
- **Node.js:** 20.9+ minimum

### Initialization Command

```bash
# Primary method (using npx)
npx create-next-app@latest eve-market-web-app --yes

# Alternative (using pnpm - faster)
pnpm create next-app@latest eve-market-web-app --yes
```

**The `--yes` flag automatically configures:**
- ✅ TypeScript enabled
- ✅ Tailwind CSS 4.1 configured
- ✅ ESLint with Next.js rules
- ✅ App Router (file-based routing)
- ✅ Turbopack enabled
- ✅ Import alias set to `@/*`
- ✅ `src/` directory structure

### Expected Project Structure

```
eve-market-web-app/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home page
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Tailwind imports
│   │   └── favicon.ico
│   └── components/           # Future UI components
├── public/                   # Static assets
├── .next/                    # Build output (gitignored)
├── node_modules/             # Dependencies (gitignored)
├── package.json
├── tsconfig.json            # TypeScript config
├── tailwind.config.ts       # Tailwind config
├── next.config.ts           # Next.js config
├── .eslintrc.json           # ESLint config
└── README.md
```

### Verification Steps

1. **Build Verification:**
   ```bash
   cd eve-market-web-app
   pnpm install  # Ensure all deps installed
   pnpm build    # Should complete without errors
   ```

2. **Dev Server Verification:**
   ```bash
   pnpm dev
   # Expected output:
   # ▲ Next.js 16.1.6
   # - Local: http://localhost:3000
   # ✓ Ready in [time]ms
   ```

3. **Browse to http://localhost:3000** and verify default Next.js welcome page renders

4. **Hot Reload Test:**
   - Edit `src/app/page.tsx`
   - Save file
   - Browser should auto-refresh within 1 second (Turbopack Fast Refresh)

## Architecture Context

### Why Next.js 16 Full-Stack Monolith

**Framework Selection Rationale:**
- **React 19 built-in:** Next.js uses React canary with all stable React 19 features
- **Turbopack (stable):** Default bundler—significantly faster builds and hot reload
- **Headless UI maturity:** UX spec mandates Headless UI (React), which has superior stability
- **Virtual scrolling ecosystem:** React has battle-tested libraries for 10K+ row table requirement
- **API Routes:** Built-in backend support in monolith—no separate Express server needed
- **Vercel optimization:** Next.js optimized for Vercel's free tier (matches zero-cost constraint)

**Key Next.js 16 Features for This Project:**
- **Cache Components:** Instant navigation with Partial Pre-Rendering (PPR)
- **Enhanced Routing:** Optimized prefetching (helps meet <2s page load target)
- **React 19.2 Features:** View Transitions, automatic memoization with React Compiler
- **Turbopack:** Sub-second hot reload for great developer experience

### Architecture Pattern: Monolith First

**Starting with Next.js Full-Stack Monolith:**
- Frontend (React) + Backend (API Routes) + Background Jobs in single codebase
- Deploy entire app to Vercel free tier initially
- Extract backend later if hitting serverless timeout (10-minute limit on free tier)

**Cost Strategy (Phased):**
- **Phase 1:** Pure Vercel free tier ($0/month) ← Start here
- **Phase 2:** Extract backend to Railway when needed ($5/month)
- Monolith proves product-market fit before architectural complexity

### Project Configuration Files

**package.json scripts (auto-generated):**
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**tsconfig.json key settings:**
- `"strict": true` - Full TypeScript strictness enabled
- `"paths": { "@/*": ["./src/*"] }` - Import alias for cleaner imports
- Target: ES2022 (modern features, no IE11)

**next.config.ts:**
- Default configuration sufficient for MVP
- Turbopack enabled by default (no configuration needed)

## Dev Notes

### Prerequisites

- **Node.js 20.9+** installed (verify: `node --version`)
- **pnpm** recommended (faster than npm/yarn): `npm install -g pnpm`
- **Git** for version control

### Common Issues and Solutions

**Issue: "npx: command not found"**
- Solution: Update Node.js to 20.9+, npx ships with modern Node

**Issue: Port 3000 already in use**
- Solution: Kill process on port 3000 or use `pnpm dev -- --port 3001`

**Issue: Module not found after install**
- Solution: Delete `.next` folder and `node_modules`, run `pnpm install` again

**Issue: TypeScript errors on first run**
- Solution: Restart VS Code TypeScript server (Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server")

### Next Steps After Completion

After this story is complete:
1. **Story 1.2:** Configure Docker Compose for local PostgreSQL
2. **Story 1.3:** Set up Prisma ORM and database connection
3. **Story 1.4:** Install Headless UI, TanStack Virtual, axios, zod, date-fns

Leave the default Next.js welcome page for now—we'll build the actual UI in Epic 3-4.

### Performance Expectations

**Build Performance:**
- Initial build: ~10-30 seconds (Turbopack)
- Incremental builds: <5 seconds
- Hot reload: <1 second (Turbopack Fast Refresh)

**Bundle Size Target:**
- Initial JavaScript bundle: <500KB gzipped (NFR-P8)
- This starter creates ~200KB bundled (leaves room for features)

### References

**Source Documents:**
- [Architecture: Starter Template Evaluation](../planning-artifacts/architecture.md#starter-template-evaluation)
- [Architecture: Technology Stack Selection](../planning-artifacts/architecture.md#technology-stack-selection)
- [PRD: Technical Success Criteria](../planning-artifacts/prd.md#technical-success)
- [Epic 1: Project Foundation & Development Environment](../planning-artifacts/epics.md#epic-1-project-foundation--development-environment)

**External Documentation:**
- Next.js 16 Docs: https://nextjs.org/docs
- React 19 Docs: https://react.dev
- Turbopack: https://turbo.build/pack/docs

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
