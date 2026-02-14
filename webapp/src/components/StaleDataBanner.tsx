'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface DataFreshnessResponse {
  lastFetchedAt: string;
}

async function fetchDataFreshness(): Promise<DataFreshnessResponse> {
  const response = await fetch('/api/data-freshness');
  if (!response.ok) {
    throw new Error('Failed to fetch data freshness');
  }
  return response.json();
}

export function StaleDataBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['data-freshness-banner'],
    queryFn: fetchDataFreshness,
    refetchInterval: 60000, // Refetch every minute
  });

  // Reset dismissed state when data changes
  useEffect(() => {
    setDismissed(false);
  }, [data?.lastFetchedAt]);

  if (isLoading || error || !data || dismissed) {
    return null;
  }

  const lastFetchedAt = new Date(data.lastFetchedAt);
  const now = new Date();
  const ageInMinutes = (now.getTime() - lastFetchedAt.getTime()) / (1000 * 60);

  // Determine if we should show the banner
  const isStale = ageInMinutes > 45;
  const isCriticallyStale = ageInMinutes > 120;

  if (!isStale) {
    return null;
  }

  const relativeTime = formatDistanceToNow(lastFetchedAt, { addSuffix: true });

  return (
    <div
      className={`w-full px-4 py-3 ${
        isCriticallyStale
          ? 'bg-eve-red/20 border-b-2 border-eve-red'
          : 'bg-eve-gold/20 border-b-2 border-eve-gold'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ExclamationTriangleIcon
            className={`h-6 w-6 flex-shrink-0 ${
              isCriticallyStale ? 'text-eve-red' : 'text-eve-gold'
            }`}
            aria-hidden="true"
          />
          <div>
            <p
              className={`text-sm font-medium ${
                isCriticallyStale ? 'text-eve-red' : 'text-eve-gold'
              }`}
            >
              {isCriticallyStale
                ? 'Market data is stale'
                : 'Market data may be stale'}
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              Last updated: {relativeTime}.{' '}
              {isCriticallyStale
                ? 'Trading opportunities may be inaccurate.'
                : 'Verify prices in-game before trading.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/20 transition-colors"
          aria-label="Dismiss banner"
        >
          <XMarkIcon
            className={`h-5 w-5 ${
              isCriticallyStale ? 'text-eve-red' : 'text-eve-gold'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
