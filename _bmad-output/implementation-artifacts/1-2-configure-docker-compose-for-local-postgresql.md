# Story 1.2: Configure Docker Compose for Local PostgreSQL

Status: ready-for-dev

## Story

As a developer,
I want to run PostgreSQL locally via Docker Compose with a single command,
So that I have a reproducible development environment without manual database setup.

## Acceptance Criteria

**Given** Docker Desktop is installed and running
**When** I create a `docker-compose.yml` file with postgres:16 image, environment variables (POSTGRES_USER=postgres, POSTGRES_PASSWORD=postgres, POSTGRES_DB=eve_market), port mapping (5432:5432), and volume persistence
**Then** running `docker-compose up -d` starts PostgreSQL container successfully
**And** I can connect to the database at localhost:5432 with the configured credentials
**And** the database persists data across container restarts
**And** running `docker-compose down` stops the container cleanly

## Technical Requirements

### Docker Compose Configuration

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: eve-market-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: eve_market
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

### Environment Variables

Create `.env.local` file (for Next.js development):

```bash
# Database connection for local development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eve_market"

# Production uses Neon PostgreSQL (configured in Vercel dashboard)
# This local URL is for Docker development only
```

**Add to `.gitignore`:**
```
# Database
.env.local
postgres_data/
```

### Docker Commands Reference

```bash
# Start PostgreSQL container (detached mode)
docker-compose up -d

# View logs
docker-compose logs -f postgres

# Check container status
docker-compose ps

# Stop container (keeps data volume)
docker-compose stop

# Stop and remove container (data volume persists)
docker-compose down

# Nuclear option: Remove container AND volume (data loss)
docker-compose down -v

# Connect to PostgreSQL via psql
docker-compose exec postgres psql -U postgres -d eve_market
```

### Connection Verification

**Test connection using psql:**
```bash
# Option 1: Via Docker exec
docker-compose exec postgres psql -U postgres -d eve_market
# Expected: postgres=# prompt

# Option 2: Via host machine (if psql installed)
psql -h localhost -U postgres -d eve_market
# Password: postgres

# Verify database exists
\l  # List databases (should see eve_market)
\q  # Quit psql
```

## Architecture Context

### Why Docker for Local Development

**NFR-M1 Requirement:** "Local development environment must be reproducible via Docker Compose with single command startup"

**Benefits:**
- **Consistency:** Same PostgreSQL version (16) across all developers
- **Isolation:** No conflicts with other PostgreSQL installations on host
- **Simplicity:** Single `docker-compose up` replaces manual installation
- **Cleanup:** Easy to reset (`docker-compose down -v`) if database corrupted
- **Matches Production:** Neon uses PostgreSQL 16, local mirrors production version

### Production vs Development Database Strategy

**Development (This Story):**
- Docker PostgreSQL 16 running locally
- Connection: `localhost:5432`
- Data stored in Docker volume (persistent across restarts)
- Manual schema migrations during development

**Production (Future):**
- **Neon PostgreSQL** (serverless, free tier: 0.5GB storage)
- Vercel integration auto-injects `DATABASE_URL` environment variable
- Prisma migrations applied via CI/CD pipeline
- Connection pooling handled by Neon

**Critical Update (Feb 2026):** Vercel Postgres discontinued December 2024. All databases migrated to Neon. Use Neon's Vercel marketplace integration for seamless deployment.

### Database Schema (Prepared for Story 1.3)

This Docker setup prepares for **Story 2.1** (Create Database Schema), which will define:
- `Region` table: EVE region IDs and names
- `MarketOrder` table: Market order data from ESI API
- Composite indexes on `(region_id, type_id)` for query performance
- Fetch tracking for data freshness monitoring

### Volume Persistence

**How Docker Volumes Work:**
- Named volume `postgres_data` stores database files
- Lives in Docker's internal storage (not project directory)
- Persists across `docker-compose down` (only deleted with `-v` flag)
- View volume location: `docker volume inspect eve-market-web-app_postgres_data`

**When to Reset Database:**
```bash
# Reset database (use when schema changes break migrations)
docker-compose down -v  # Delete volume
docker-compose up -d    # Fresh database
pnpm prisma migrate dev # Re-apply migrations (Story 2.1)
```

## Dev Notes

### Prerequisites

- **Docker Desktop** installed (Windows/Mac) or Docker Engine (Linux)
- Docker daemon running (check: `docker --version`)
- Port 5432 available (not used by another PostgreSQL instance)

### Common Issues and Solutions

**Issue: "Cannot connect to Docker daemon"**
- **Solution:** Start Docker Desktop application (Windows/Mac)
- **Linux:** `sudo systemctl start docker`

**Issue: "Port 5432 already in use"**
- **Solution:** Stop other PostgreSQL instances or change port mapping:
  ```yaml
  ports:
    - "5433:5432"  # Use 5433 on host, 5432 in container
  ```
  Update `DATABASE_URL` to `localhost:5433`

**Issue: "Connection refused" when connecting**
- **Solution:** Wait for healthcheck to pass:
  ```bash
  docker-compose ps  # Status should show "healthy"
  docker-compose logs postgres  # Check for "ready to accept connections"
  ```

**Issue: Docker volume fills disk space**
- **Solution:** Prune old volumes:
  ```bash
  docker volume prune  # Remove unused volumes
  ```

### Verification Checklist

After completing this story, verify:

- [ ] `docker-compose.yml` exists in project root
- [ ] `.env.local` contains `DATABASE_URL` connection string
- [ ] `.gitignore` excludes `.env.local` and `postgres_data/`
- [ ] `docker-compose up -d` starts container without errors
- [ ] `docker-compose ps` shows STATUS as "Up" and "(healthy)"
- [ ] Can connect via `psql -h localhost -U postgres -d eve_market`
- [ ] Database `eve_market` shown in `\l` command
- [ ] `docker-compose down` stops container cleanly
- [ ] Restarting container (`up -d` again) preserves data

### Next Steps After Completion

After this story is complete:
1. **Story 1.3:** Set up Prisma ORM and connect to this Docker PostgreSQL
2. **Story 2.1:** Define database schema (Region, MarketOrder tables)
3. **Story 2.3:** Use this database to store fetched ESI market data

Keep Docker containers running during development—Prisma will connect to `localhost:5432` automatically.

### Performance Notes

**Docker PostgreSQL Performance:**
- **Startup time:** 5-10 seconds (wait for healthcheck)
- **Query performance:** Equivalent to native PostgreSQL installation
- **Disk I/O:** Slightly slower on WSL2 (Windows) due to virtualization
- **Memory usage:** ~100MB RAM for idle container

**Free Tier Database Limits (Production):**
- Neon free tier: 0.5GB storage, shared CPU
- Implement data retention policy (purge orders >7 days) in **Story 2.5**

### References

**Source Documents:**
- [Architecture: Database Docker Setup](../planning-artifacts/architecture.md#starter-template-evaluation)
- [Architecture: Hosting Strategy](../planning-artifacts/architecture.md#hosting-strategy-phased-for-zero-cost-target)  
- [PRD: NFR-M1 (Docker Reproducibility)](../planning-artifacts/prd.md#functional-requirements)
- [Epic 1: Story 1.2](../planning-artifacts/epics.md#story-12-configure-docker-compose-for-local-postgresql)

**External Documentation:**
- Docker Compose Docs: https://docs.docker.com/compose/
- PostgreSQL 16 Docker Image: https://hub.docker.com/_/postgres
- Neon PostgreSQL: https://neon.tech/docs

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
