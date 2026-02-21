'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { ClockIcon } from '@heroicons/react/24/outline';

interface MetadataResponse {
  lastGenerated: string;
  deploymentVersion: string;
  regionPairs: number;
  regions: number;
  skippedPairs: number;
  version: string;
}

async function fetchMetadata(): Promise<MetadataResponse> {
  const response = await fetch('/data/metadata.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch metadata');
  }
  return response.json();
}

export function DataFreshness() {
  const [, setTick] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['metadata'],
    queryFn: fetchMetadata,
    refetchInterval: 60 * 1000, // Refetch every minute to get fresh data
  });

  // Force re-render every 10 seconds to update relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || error || !data) {
    return null;
  }

  const lastFetchedAt = new Date(data.lastGenerated);
  const now = new Date();
  const ageInMinutes = (now.getTime() - lastFetchedAt.getTime()) / (1000 * 60);

  // Determine status based on data age
  const isStale = ageInMinutes > 45;
  const isCriticallyStale = ageInMinutes > 120;

  // Format timestamp
  const formattedTime = format(lastFetchedAt, 'MMM dd, yyyy h:mm a');
  const relativeTime = formatDistanceToNow(lastFetchedAt, { addSuffix: true });

  return (
    <footer className="border-t theme-border theme-bg-secondary px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCriticallyStale ? (
            <>
              <ExclamationTriangleIcon 
                className="h-4 w-4 text-eve-red" 
                aria-hidden="true"
              />
              <span className="text-xs text-eve-red font-medium">
                Stale data
              </span>
            </>
          ) : isStale ? (
            <>
              <ExclamationTriangleIcon 
                className="h-4 w-4 text-eve-gold" 
                aria-hidden="true"
              />
              <span className="text-xs text-eve-gold font-medium">
                Data may be stale
              </span>
            </>
          ) : (
            <ClockIcon 
              className="h-4 w-4 text-success" 
              aria-hidden="true"
            />
          )}
          
          <span 
            className={`text-xs ${
              isCriticallyStale
                ? 'text-eve-red'
                : isStale
                ? 'text-eve-gold'
                : 'text-success'
            }`}
            title={formattedTime}
          >
            Last updated: {relativeTime}
          </span>
        </div>

        <div className="text-xs theme-text-secondary">
          {formattedTime}
        </div>
      </div>
    </footer>
  );
}
