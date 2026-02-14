# Story 6.3: Add Manual Job Trigger Endpoint with Admin Authentication

Status: ready-for-dev

## Story

As a system administrator,
I want to manually trigger the market data fetch job via an API endpoint,
So that I can refresh data on-demand without waiting for the scheduled cron job.

## Acceptance Criteria

**Given** the app has an automated 30-minute cron job for data fetching
**When** I implement a manual trigger endpoint at POST `/api/admin/trigger-fetch`
**Then** the endpoint requires authentication via `ADMIN_TOKEN` environment variable in Authorization header
**And** calling the endpoint with valid token triggers the fetch job immediately
**And** the endpoint returns job execution status: started, in-progress, completed, failed
**And** the endpoint responds immediately with 202 Accepted (job runs in background)
**And** the response includes a job ID for tracking progress
**And** invalid/missing token returns 401 Unauthorized
**And** if job is already running, returns 409 Conflict with message "Job already in progress"
**And** the endpoint is POST only (GET returns 405 Method Not Allowed)

## Technical Requirements

### Environment Variable

**Update `.env.local`:**

```bash
# Admin token for manual job triggers (generate with: openssl rand -base64 32)
ADMIN_TOKEN=your-secret-admin-token-here
```

**Update `.env.example`:**

```bash
# Required: ESI API base URL
ESI_API_BASE_URL=https://esi.evetech.net/latest

# Required: Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Required: Secret for scheduled cron jobs (Vercel Cron)
CRON_SECRET=your-cron-secret

# Required: Admin token for manual job triggers
ADMIN_TOKEN=your-admin-token

# Optional: Log level (trace, debug, info, warn, error, fatal)
LOG_LEVEL=info
```

### Job State Management

**File:** `lib/jobs/job-state.ts`

```typescript
interface JobState {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

// In-memory job state (simple implementation)
// For production, use Redis or database
const activeJobs = new Map<string, JobState>();

export function isJobRunning(jobName: string): boolean {
  const state = activeJobs.get(jobName);
  return state?.status === 'running';
}

export function startJob(jobName: string, jobId: string): void {
  activeJobs.set(jobName, {
    jobId,
    status: 'running',
    startedAt: new Date(),
  });
}

export function completeJob(jobName: string, result: any): void {
  const state = activeJobs.get(jobName);
  if (state) {
    state.status = 'completed';
    state.completedAt = new Date();
    state.result = result;
  }
}

export function failJob(jobName: string, error: string): void {
  const state = activeJobs.get(jobName);
  if (state) {
    state.status = 'failed';
    state.completedAt = new Date();
    state.error = error;
  }
}

export function getJobState(jobName: string): JobState | undefined {
  return activeJobs.get(jobName);
}

export function clearJobState(jobName: string): void {
  activeJobs.delete(jobName);
}
```

### Manual Trigger API Route

**File:** `app/api/admin/trigger-fetch/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { fetchAllRegions } from '@/jobs/fetch-market-data';
import {
  isJobRunning,
  startJob,
  completeJob,
  failJob,
} from '@/lib/jobs/job-state';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes (same as cron job)

export async function POST(req: NextRequest) {
  const jobName = 'fetch-market-data';

  // Authentication check
  const authHeader = req.headers.get('authorization');
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    logger.error('ADMIN_TOKEN not configured');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  // Validate token format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn({ authHeader }, 'Missing or invalid Authorization header');
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>',
      },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (token !== adminToken) {
    logger.warn('Invalid admin token provided');
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid admin token' },
      { status: 401 }
    );
  }

  // Check if job is already running
  if (isJobRunning(jobName)) {
    logger.warn('Attempted to trigger job while already running');
    return NextResponse.json(
      {
        error: 'Conflict',
        message: 'Job is already in progress',
        jobName,
      },
      { status: 409 }
    );
  }

  // Generate job ID
  const jobId = nanoid();

  logger.info({ jobId, jobName }, 'Manual job trigger requested');

  // Start job in background (don't await)
  startJob(jobName, jobId);

  // Execute job asynchronously
  fetchAllRegions()
    .then((result) => {
      completeJob(jobName, result);
      logger.info({ jobId, result }, 'Manual job completed successfully');
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      failJob(jobName, errorMessage);
      logger.error({ jobId, err: error }, 'Manual job failed');
    });

  // Return immediately with 202 Accepted
  return NextResponse.json(
    {
      message: 'Job triggered successfully',
      jobId,
      jobName,
      status: 'started',
      checkStatusAt: `/api/admin/job-status/${jobId}`,
    },
    {
      status: 202,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// Reject non-POST methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed', message: 'Use POST to trigger job' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
```

### Job Status Endpoint

**File:** `app/api/admin/job-status/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getJobState } from '@/lib/jobs/job-state';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  // Authentication check (same as trigger endpoint)
  const authHeader = req.headers.get('authorization');
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  if (token !== adminToken) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid admin token' },
      { status: 401 }
    );
  }

  // Get job state
  const state = getJobState('fetch-market-data');

  if (!state || state.jobId !== jobId) {
    logger.warn({ jobId }, 'Job not found');
    return NextResponse.json(
      { error: 'Not Found', message: 'Job not found or expired' },
      { status: 404 }
    );
  }

  logger.debug({ jobId, status: state.status }, 'Job status requested');

  return NextResponse.json({
    jobId: state.jobId,
    status: state.status,
    startedAt: state.startedAt.toISOString(),
    completedAt: state.completedAt?.toISOString(),
    duration: state.completedAt
      ? state.completedAt.getTime() - state.startedAt.getTime()
      : Date.now() - state.startedAt.getTime(),
    result: state.result,
    error: state.error,
  });
}
```

### Usage Documentation

**Create `docs/manual-job-trigger.md`:**

```markdown
# Manual Job Trigger

## Overview

The market data fetch job runs automatically every 30 minutes via Vercel Cron. You can also trigger it manually using the admin API endpoint.

## Authentication

All admin endpoints require an admin token passed in the Authorization header:

\`\`\`bash
Authorization: Bearer <your-admin-token>
\`\`\`

**Generate admin token:**
\`\`\`bash
openssl rand -base64 32
\`\`\`

Add to `.env.local`:
\`\`\`bash
ADMIN_TOKEN=your-generated-token
\`\`\`

## Trigger Job

**Endpoint:** `POST /api/admin/trigger-fetch`

**Request:**
\`\`\`bash
curl -X POST https://your-app.vercel.app/api/admin/trigger-fetch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
\`\`\`

**Response (202 Accepted):**
\`\`\`json
{
  "message": "Job triggered successfully",
  "jobId": "abc123xyz",
  "jobName": "fetch-market-data",
  "status": "started",
  "checkStatusAt": "/api/admin/job-status/abc123xyz"
}
\`\`\`

## Check Job Status

**Endpoint:** `GET /api/admin/job-status/:jobId`

**Request:**
\`\`\`bash
curl https://your-app.vercel.app/api/admin/job-status/abc123xyz \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
\`\`\`

**Response (Running):**
\`\`\`json
{
  "jobId": "abc123xyz",
  "status": "running",
  "startedAt": "2024-01-15T12:34:56.789Z",
  "duration": 15000
}
\`\`\`

**Response (Completed):**
\`\`\`json
{
  "jobId": "abc123xyz",
  "status": "completed",
  "startedAt": "2024-01-15T12:34:56.789Z",
  "completedAt": "2024-01-15T12:37:30.000Z",
  "duration": 153211,
  "result": {
    "success": true,
    "successCount": 60,
    "errorCount": 3,
    "totalOrders": 125000,
    "duration": 153000
  }
}
\`\`\`

**Response (Failed):**
\`\`\`json
{
  "jobId": "abc123xyz",
  "status": "failed",
  "startedAt": "2024-01-15T12:34:56.789Z",
  "completedAt": "2024-01-15T12:35:10.000Z",
  "duration": 14000,
  "error": "Database connection failed"
}
\`\`\`

## Error Responses

**401 Unauthorized:**
\`\`\`json
{
  "error": "Unauthorized",
  "message": "Invalid admin token"
}
\`\`\`

**405 Method Not Allowed:**
\`\`\`json
{
  "error": "Method Not Allowed",
  "message": "Use POST to trigger job"
}
\`\`\`

**409 Conflict:**
\`\`\`json
{
  "error": "Conflict",
  "message": "Job is already in progress",
  "jobName": "fetch-market-data"
}
\`\`\`

## Use Cases

### Force Immediate Refresh
\`\`\`bash
# Trigger fetch right now (don't wait for scheduled job)
curl -X POST https://your-app.vercel.app/api/admin/trigger-fetch \
  -H "Authorization: Bearer $ADMIN_TOKEN"
\`\`\`

### Deploy Verification
\`\`\`bash
# After deployment, verify job works
curl -X POST http://localhost:3000/api/admin/trigger-fetch \
  -H "Authorization: Bearer $ADMIN_TOKEN"
\`\`\`

### CI/CD Integration
\`\`\`yaml
# .github/workflows/deploy.yml
- name: Warm up database after deploy
  run: |
    curl -X POST https://your-app.vercel.app/api/admin/trigger-fetch \
      -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}"
\`\`\`
```

### Verification Steps

1. **Test authentication:**
   ```bash
   # Missing token → 401
   curl -X POST http://localhost:3000/api/admin/trigger-fetch
   
   # Invalid token → 401
   curl -X POST http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer invalid-token"
   
   # Valid token → 202
   curl -X POST http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

2. **Test job trigger:**
   ```bash
   # Trigger job
   response=$(curl -X POST http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer $ADMIN_TOKEN")
   
   # Extract job ID
   jobId=$(echo $response | jq -r '.jobId')
   echo "Job ID: $jobId"
   ```

3. **Test job status:**
   ```bash
   # Check status immediately (should be running)
   curl http://localhost:3000/api/admin/job-status/$jobId \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq
   
   # Wait 30 seconds, check again
   sleep 30
   curl http://localhost:3000/api/admin/job-status/$jobId \
     -H "Authorization: Bearer $ADMIN_TOKEN" | jq
   ```

4. **Test conflict (job already running):**
   ```bash
   # Trigger first job
   curl -X POST http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   
   # Immediately trigger again (should return 409)
   curl -X POST http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

5. **Test method not allowed:**
   ```bash
   # GET request → 405
   curl http://localhost:3000/api/admin/trigger-fetch \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

6. **Test logs:**
   ```bash
   # Check logs for structured output
   pnpm dev
   # Trigger job
   # Logs should show: "Manual job trigger requested", "Manual job completed successfully"
   ```

## Architecture Context

### Why Bearer Token Authentication

**Simple and Standard:**
- RFC 6750 standard
- Common pattern for API authentication
- Easy to test with curl

**Why not:**
- API keys in query params (logged in URLs)
- Basic Auth (no token rotation)
- OAuth (overkill for admin endpoint)

### Why 202 Accepted

**HTTP Status Semantics:**
- **202 Accepted:** Request accepted, processing asynchronously
- **200 OK:** Request completed successfully (synchronous)
- **201 Created:** Resource created

**Pattern:**
- Client sends request
- Server starts job in background
- Server responds immediately (don't wait for job)
- Client polls status endpoint for completion

### Why In-Memory Job State

**Simple Implementation:**
- No external dependencies (Redis, database)
- Fast read/write
- Sufficient for single-instance deployments

**Limitations:**
- Lost on server restart (acceptable)
- Not shared across instances (Vercel = single instance per request)
- Only recent jobs tracked

**Alternative (Production):**
- Redis: Persist job state, shared across instances
- Database: Durable, queryable
- Not needed for zero-cost constraint

### Job Concurrency Control

**Why prevent concurrent jobs:**
- Database write conflicts
- ESI rate limiting (multiple jobs = more requests)
- Resource exhaustion

**Implementation:**
- Check `isJobRunning()` before starting
- Return 409 Conflict if already running
- Clear state after completion/failure

### Security Considerations

**Token Generation:**
```bash
# Strong random token (32 bytes = 256 bits)
openssl rand -base64 32
```

**Token Storage:**
- Environment variable (never commit to git)
- Vercel: Project Settings → Environment Variables
- Rotate periodically (e.g., monthly)

**Authorization Header:**
- `Bearer` prefix standard (RFC 6750)
- Token not logged (sanitize logs)

## Dev Notes

### Prerequisites

- nanoid installed (Story 6.1)
- Logger configured (Story 6.1)
- fetchAllRegions job (Story 2.3)

### No Additional Dependencies

- Uses native Map for job state
- Uses Authorization header (standard)

### Common Issues and Solutions

**Issue: ADMIN_TOKEN not set**
- Solution: Add to .env.local
```bash
ADMIN_TOKEN=$(openssl rand -base64 32)
```

**Issue: Job never completes**
- Solution: Check maxDuration in Vercel
- Verify job doesn't hang on error
- Add timeout to external API calls

**Issue: Job state disappears**
- Solution: Normal on server restart (in-memory)
- Use database for persistent state (optional)

**Issue: 409 Conflict every time**
- Solution: Job state not clearing
- Add timeout to clear stale jobs
```typescript
// Clear job state after 10 minutes if still "running"
setTimeout(() => {
  const state = getJobState('fetch-market-data');
  if (state?.status === 'running') {
    clearJobState('fetch-market-data');
  }
}, 10 * 60 * 1000);
```

**Issue: Token leaked in logs**
- Solution: Sanitize logs
```typescript
logger.info({ authHeader: authHeader.substring(0, 10) + '...' });
```

### Testing Tips

**Generate ephemeral token for testing:**
```bash
export TEST_ADMIN_TOKEN=$(openssl rand -base64 32)
echo "ADMIN_TOKEN=$TEST_ADMIN_TOKEN" >> .env.local
```

**Shell script for end-to-end test:**
```bash
#!/bin/bash
# test-manual-trigger.sh

TOKEN="your-admin-token"
BASE_URL="http://localhost:3000"

echo "Triggering job..."
response=$(curl -s -X POST "$BASE_URL/api/admin/trigger-fetch" \
  -H "Authorization: Bearer $TOKEN")

echo "$response"

jobId=$(echo "$response" | jq -r '.jobId')

if [ "$jobId" = "null" ]; then
  echo "Failed to trigger job"
  exit 1
fi

echo "Job ID: $jobId"
echo "Checking status..."

for i in {1..10}; do
  sleep 5
  status=$(curl -s "$BASE_URL/api/admin/job-status/$jobId" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.status')
  
  echo "Status: $status"
  
  if [ "$status" = "completed" ] || [ "$status" = "failed" ]; then
    break
  fi
done
```

### Performance Expectations

**Endpoint latency:**
- Authentication: <5ms
- Job state check: <1ms
- Background job start: <10ms
- Total response time: <50ms

**Job execution:**
- Same as scheduled job (2-5 minutes)
- Runs in background (non-blocking)

### Next Steps

After this story is complete:
1. **Story 6.4:** Build stale data warning UI banner
2. **Story 6.5:** Create error handling and user-friendly error messages

### References

**Source Documents:**
- [Architecture: Background Jobs](../planning-artifacts/architecture.md#background-jobs)
- [Epic 6: System Operations & Monitoring](../planning-artifacts/epics.md#epic-6-system-operations--monitoring)

**External Documentation:**
- HTTP 202 Accepted: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/202
- Bearer Token: https://datatracker.ietf.org/doc/html/rfc6750
- Long-Running Operations: https://restfulapi.net/rest-api-design-for-long-running-tasks/

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
