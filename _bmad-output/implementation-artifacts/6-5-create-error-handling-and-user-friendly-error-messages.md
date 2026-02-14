# Story 6.5: Create Error Handling and User-Friendly Error Messages

Status: ready-for-dev

## Story

As a user encountering errors in the app,
I want clear, actionable error messages with recovery suggestions,
So that I understand what went wrong and how to proceed.

## Acceptance Criteria

**Given** various error scenarios can occur (network failures, API errors, no data, validation errors)
**When** I implement comprehensive error handling
**Then** all errors display user-friendly messages (no raw error stacks or technical jargon)
**And** error messages include specific recovery actions when applicable
**And** network errors show "Check your connection" with retry button
**And** API errors (500) show "Something went wrong" with retry button and support email
**And** no data errors show helpful message suggesting region selection or waiting for data refresh
**And** validation errors show inline near the problematic input with clear explanation
**And** all error UI includes appropriate icons (red X circle, warning triangle)
**And** errors are logged to console with full details for debugging
**And** error boundaries catch React errors and show fallback UI
**And** all error states are accessible with proper ARIA attributes

## Technical Requirements

### Error Types and Messages

**File:** `lib/errors/error-messages.ts`

```typescript
export interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
  actionLabel?: string;
}

export type ErrorType =
  | 'network'
  | 'api'
  | 'validation'
  | 'no-data'
  | 'rate-limit'
  | 'timeout'
  | 'unknown';

export function getErrorMessage(
  error: Error | unknown,
  context?: string
): ErrorMessage {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Network errors (fetch failed, connection refused)
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return {
      title: 'Connection Error',
      message:
        'Unable to connect to the server. Please check your internet connection and try again.',
      action: 'retry',
      actionLabel: 'Retry',
    };
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return {
      title: 'Request Timeout',
      message:
        'The request took too long to complete. The server may be experiencing high load.',
      action: 'retry',
      actionLabel: 'Try Again',
    };
  }

  // Rate limit errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return {
      title: 'Too Many Requests',
      message:
        'You\'re making requests too quickly. Please wait a moment and try again.',
      action: 'wait',
      actionLabel: 'Wait and Retry',
    };
  }

  // API errors (5xx)
  if (errorMessage.includes('500') || errorMessage.includes('503')) {
    return {
      title: 'Something Went Wrong',
      message:
        'Our servers encountered an error. We\'ve been notified and are working on it. Please try again in a few minutes.',
      action: 'retry',
      actionLabel: 'Retry',
    };
  }

  // No data errors
  if (errorMessage.includes('no data') || errorMessage.includes('not found')) {
    return {
      title: 'No Data Available',
      message:
        'Market data is not available yet. Please select different regions or wait for the next data refresh (every 30 minutes).',
      action: 'none',
    };
  }

  // Validation errors (handled separately, but fallback)
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      title: 'Invalid Input',
      message: errorMessage,
      action: 'none',
    };
  }

  // Unknown/generic errors
  return {
    title: 'Unexpected Error',
    message:
      'An unexpected error occurred. Please refresh the page or contact support if the problem persists.',
    action: 'refresh',
    actionLabel: 'Refresh Page',
  };
}
```

### Error Display Component

**File:** `components/ErrorDisplay.tsx`

```typescript
'use client';

import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { getErrorMessage, type ErrorMessage } from '@/lib/errors/error-messages';
import { logger } from '@/lib/logger';

interface ErrorDisplayProps {
  error: Error | unknown;
  context?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  error,
  context,
  onRetry,
  className = '',
}: ErrorDisplayProps) {
  const errorInfo = getErrorMessage(error, context);

  // Log error for debugging
  logger.error({
    err: error,
    context,
    errorInfo,
  }, `Error displayed: ${errorInfo.title}`);

  const handleAction = () => {
    if (errorInfo.action === 'retry' && onRetry) {
      onRetry();
    } else if (errorInfo.action === 'refresh') {
      window.location.reload();
    } else if (errorInfo.action === 'wait') {
      setTimeout(() => {
        if (onRetry) onRetry();
      }, 5000); // Wait 5 seconds before retry
    }
  };

  return (
    <div
      className={`p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-500 dark:border-red-700 text-center ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <ExclamationCircleIcon
        className="h-12 w-12 text-red-600 dark:text-red-500 mx-auto mb-4"
        aria-hidden="true"
      />
      
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
        {errorInfo.title}
      </h3>
      
      <p className="text-sm text-red-700 dark:text-red-400 mb-4 max-w-md mx-auto">
        {errorInfo.message}
      </p>

      {errorInfo.action && errorInfo.action !== 'none' && (
        <button
          onClick={handleAction}
          className="px-4 py-2 bg-red-600 text-white rounded-lg 
            hover:bg-red-700 active:bg-red-800
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
            transition-colors min-h-[44px]"
          aria-label={errorInfo.actionLabel}
        >
          {errorInfo.actionLabel}
        </button>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left">
          <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer hover:underline">
            Debug Info (Development Only)
          </summary>
          <pre className="mt-2 p-4 bg-red-100 dark:bg-red-950 rounded text-xs overflow-auto max-h-40">
            {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
```

### Inline Error Message Component

**File:** `components/InlineError.tsx`

```typescript
'use client';

import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  return (
    <div
      className={`flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-1 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
```

### React Error Boundary

**File:** `components/ErrorBoundary.tsx`

```typescript
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error({
      err: error,
      errorInfo: errorInfo.componentStack,
    }, 'React error boundary caught error');
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 text-center">
            <ExclamationTriangleIcon
              className="h-16 w-16 text-red-600 dark:text-red-500 mx-auto mb-4"
              aria-hidden="true"
            />
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something Went Wrong
            </h1>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              The app encountered an unexpected error. Please try refreshing the page.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-eve-blue text-white rounded-lg 
                  hover:bg-eve-blue-dark active:bg-blue-800
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2
                  transition-colors min-h-[44px]"
              >
                Refresh Page
              </button>

              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg 
                  hover:bg-gray-300 dark:hover:bg-gray-600
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2
                  transition-colors min-h-[44px]"
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:underline">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-auto max-h-60 border border-gray-300 dark:border-gray-700">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Update Layout with Error Boundary

**Update `app/layout.tsx`:**

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { FontScaleProvider } from '@/lib/contexts/FontScaleContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata = {
  title: 'EVE Market Scanner',
  description: 'Find profitable trading opportunities across EVE Online regions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <ErrorBoundary>
          <ThemeProvider>
            <FontScaleProvider>
              {children}
            </FontScaleProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### Update Opportunity Table with ErrorDisplay

**Update `app/page.tsx`:**

```typescript
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { InlineError } from '@/components/InlineError';

export default function HomePage() {
  // ... existing hooks and state

  return (
    <div className="min-h-screen flex flex-col">
      {/* ... header */}

      <main id="main-content" className="flex-1" role="main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StaleDataBanner />

          <section aria-labelledby="region-selection-heading" className="mb-8">
            <h2 id="region-selection-heading" className="text-xl font-semibold mb-4">
              Select Trading Regions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  htmlFor="buy-region" 
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Buy From (Low Price Region)
                </label>
                <RegionSelector
                  id="buy-region"
                  value={buyMarket}
                  onChange={setBuyMarket}
                  placeholder="Select buy region..."
                  aria-label="Select region to buy items from"
                  aria-required="true"
                />
              </div>

              <div>
                <label 
                  htmlFor="sell-region" 
                  className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300"
                >
                  Sell To (High Price Region)
                </label>
                <RegionSelector
                  id="sell-region"
                  value={sellMarket}
                  onChange={setSellMarket}
                  placeholder="Select sell region..."
                  aria-label="Select region to sell items to"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Inline validation error */}
            {validationError && (
              <InlineError message={validationError} className="mt-3" />
            )}
          </section>

          {/* Selection summary */}
          {buyMarket && sellMarket && !validationError && (
            <aside 
              className="mb-6 p-4 bg-blue-50 dark:bg-eve-blue/10 border border-eve-blue rounded-lg"
              aria-live="polite"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Finding opportunities: Buy from{' '}
                <strong className="font-mono font-semibold text-eve-blue-dark dark:text-eve-blue">
                  {buyMarket.name}
                </strong>
                <span aria-hidden="true"> → </span>
                <span className="sr-only"> to </span>
                <strong className="font-mono font-semibold text-eve-blue-dark dark:text-eve-blue">
                  {sellMarket.name}
                </strong>
              </p>
            </aside>
          )}

          <section aria-labelledby="opportunities-heading">
            <h2 id="opportunities-heading" className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Trading Opportunities
            </h2>
            
            {/* Loading state */}
            {isLoading && (
              <div 
                className="flex flex-col justify-center items-center h-64" 
                role="status" 
                aria-live="polite"
              >
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eve-blue"></div>
                <span className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading opportunities...
                </span>
              </div>
            )}

            {/* Error state with ErrorDisplay */}
            {error && (
              <ErrorDisplay
                error={error}
                context="opportunities"
                onRetry={() => refetch()}
              />
            )}

            {/* Empty state */}
            {opportunities && opportunities.length === 0 && !error && (
              <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-gray-600 dark:text-gray-300">
                  No profitable trading opportunities found for this region pair.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Try selecting different regions or check back after market data refreshes.
                </p>
              </div>
            )}

            {/* Success state */}
            {opportunities && opportunities.length > 0 && !error && (
              <div aria-live="polite">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Found <strong className="text-gray-900 dark:text-white">{opportunities.length}</strong> trading opportunities
                </p>
                <OpportunityTable opportunities={opportunities} />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ... footer */}
    </div>
  );
}
```

### Verification Steps

1. **Test network error:**
   ```bash
   # Disconnect internet/stop server
   docker-compose stop postgres
   
   # Load page
   1. Should show "Connection Error"
   2. Message: "Unable to connect to the server..."
   3. Retry button visible
   4. Click retry → attempts connection again
   ```

2. **Test API error (500):**
   ```typescript
   // Temporarily modify API to throw error
   // app/api/opportunities/route.ts
   export async function GET() {
     throw new Error('500 Internal Server Error');
   }
   ```
   ```
   1. Load page
   2. Should show "Something Went Wrong"
   3. Message mentions server error
   4. Retry button visible
   ```

3. **Test no data error:**
   ```sql
   -- Empty market_orders table
   DELETE FROM market_orders;
   ```
   ```
   1. Select two regions
   2. Should show "No Data Available"
   3. Message suggests waiting for refresh
   4. No retry button (action: 'none')
   ```

4. **Test validation error:**
   ```
   1. Select same region for buy and sell
   2. Should show inline error below selectors
   3. Red text with exclamation icon
   4. Message: "Buy and sell regions must be different"
   ```

5. **Test React error boundary:**
   ```typescript
   // Create component that throws
   function BrokenComponent() {
     throw new Error('Test error boundary');
   }
   
   // Add to page.tsx
   <BrokenComponent />
   ```
   ```
   1. Load page
   2. Should show full-page error boundary
   3. "Something Went Wrong" heading
   4. Refresh button and Try Again button visible
   ```

6. **Test debug info (development):**
   ```
   1. Set NODE_ENV=development
   2. Trigger any error
   3. Should see "Debug Info" collapsible section
   4. Contains full error stack trace
   ```

7. **Test accessibility:**
   ```
   1. Enable screen reader
   2. Trigger error
   3. Should announce: "Alert: Connection Error. Unable to connect..."
   4. Tab to retry button
   5. Should announce: "Retry, button"
   ```

## Architecture Context

### Why User-Friendly Messages

**Problem:**
```
Error: TypeError: Cannot read property 'regionId' of undefined
  at fetchOpportunities (opportunities.ts:42)
```

**User doesn't understand:**
- What "TypeError" means
- What "regionId" is
- How to fix it

**Solution:**
```
Connection Error
Unable to connect to the server. Please check your internet connection and try again.
[Retry Button]
```

### Error Message Hierarchy

**1. Specific errors (preferred):**
- Network error → "Check connection"
- Rate limit → "Wait and retry"
- No data → "Select different regions"

**2. Generic errors (fallback):**
- Unknown error → "Unexpected error occurred"
- Always provide action (refresh, contact support)

### Debug Info in Development

**Why show stack traces in dev:**
- Developers need details
- Console may be hard to access
- Inline debugging faster

**Why hide in production:**
- Security (don't expose internals)
- User confusion
- Professional appearance

**Implementation:**
```typescript
{process.env.NODE_ENV === 'development' && (
  <details>
    <pre>{error.stack}</pre>
  </details>
)}
```

### Error Boundaries vs Try-Catch

**Error Boundary (React errors):**
- Component render errors
- Lifecycle method errors
- Constructor errors

**Try-Catch (Async errors):**
- API fetch errors
- Database query errors
- External service errors

**Both needed:**
- Error boundary = last resort
- Try-catch = expected failures

### aria-live Levels

**assertive vs polite:**
- **assertive:** Interrupts screen reader (errors, warnings)
- **polite:** Waits for current announcement (info, success)

**Usage:**
```typescript
// Error (urgent)
<div role="alert" aria-live="assertive">

// Validation (immediate but not urgent)
<div role="alert" aria-live="polite">
```

### Retry with Backoff

**Pattern for rate limits:**
```typescript
if (errorInfo.action === 'wait') {
  setTimeout(() => {
    if (onRetry) onRetry();
  }, 5000); // Wait 5 seconds
}
```

**Benefits:**
- Respects rate limits
- Automatic recovery
- User doesn't spam retry

## Dev Notes

### Prerequisites

- Logger configured (Story 6.1)
- @heroicons/react installed (Story 3.2)

### No Additional Dependencies

- Uses built-in Error class
- Uses React.Component for boundary

### Common Issues and Solutions

**Issue: Error boundary doesn't catch error**
- Solution: Error boundaries only catch render errors
- Use try-catch for async errors
```typescript
try {
  await fetchData();
} catch (error) {
  setError(error);
}
```

**Issue: Stack trace not showing**
- Solution: Check NODE_ENV
```bash
echo $NODE_ENV  # Should be "development"
```

**Issue: Retry button doesn't work**
- Solution: Verify onRetry prop passed
```typescript
<ErrorDisplay error={error} onRetry={() => refetch()} />
```

**Issue: Error messages not helpful**
- Solution: Add specific error patterns to getErrorMessage()
```typescript
if (errorMessage.includes('specific-pattern')) {
  return { title: 'Specific Error', message: '...' };
}
```

**Issue: Error logged multiple times**
- Solution: React StrictMode renders twice in dev
- Normal behavior, only once in production

### Testing Tips

**Force specific errors:**
```typescript
// Network error
throw new Error('fetch failed');

// API error
throw new Error('500 Internal Server Error');

// No data error
throw new Error('no data available');
```

**Test error boundary:**
```typescript
// Add to any component
if (Math.random() < 0.5) {
  throw new Error('Random error for testing');
}
```

**Console log errors:**
```typescript
// Check logs
logger.error({ err: error }, 'Error occurred');
```

### User Testing Checklist

**Clarity:**
- [ ] Non-technical user understands error
- [ ] Message explains what happened
- [ ] Message suggests what to do

**Actionability:**
- [ ] User knows how to recover
- [ ] Retry button works
- [ ] Alternative actions provided

**Accessibility:**
- [ ] Screen reader announces error
- [ ] Keyboard navigation works
- [ ] Focus moves to error message

### Performance Expectations

**Error display render:**
- Component mount: <5ms
- No layout shift (height reserved)
- Smooth appearance (no flicker)

**Error logging:**
- <1ms to log
- Non-blocking (async)

### Production Monitoring

**Error tracking setup:**

**1. Console errors:**
```typescript
window.addEventListener('error', (event) => {
  logger.error({
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  }, 'Uncaught error');
});
```

**2. Unhandled promise rejections:**
```typescript
window.addEventListener('unhandledrejection', (event) => {
  logger.error({
    reason: event.reason,
  }, 'Unhandled promise rejection');
});
```

**3. Third-party (optional):**
- Sentry: React error tracking
- Datadog: Full observability
- Vercel: Built-in error tracking

### References

**Source Documents:**
- [PRD: Error Handling](../planning-artifacts/prd.md#error-handling)
- [UX Spec: Error States](../planning-artifacts/ux-design-specification.md)
- [Epic 6: System Operations & Monitoring](../planning-artifacts/epics.md#epic-6-system-operations--monitoring)

**External Documentation:**
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- ARIA Live Regions: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
- HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
