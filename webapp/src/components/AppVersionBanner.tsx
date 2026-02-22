'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const KNOWN_SHA = process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'dev';
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function fetchDeployedSha(): Promise<string | null> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json() as { sha?: string };
    return data.sha ?? null;
  } catch {
    return null;
  }
}

export function AppVersionBanner() {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't poll in dev or if we can't determine the current SHA
    if (KNOWN_SHA === 'dev') return;

    const check = async () => {
      const deployedSha = await fetchDeployedSha();
      if (deployedSha && deployedSha !== KNOWN_SHA) {
        setNewVersionAvailable(true);
      }
    };

    // Check immediately, then every 5 minutes
    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!newVersionAvailable || dismissed) return null;

  return (
    <div
      className="w-full px-4 py-3 bg-sky-900/80 border-b border-sky-700"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-sky-200">
          A new version of the app is available.{' '}
          <button
            onClick={() => window.location.reload()}
            className="text-sky-300 underline underline-offset-2 hover:text-white transition-colors"
          >
            Refresh the page
          </button>{' '}
          to update, or continue using the current version.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/20 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-4 w-4 text-sky-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
