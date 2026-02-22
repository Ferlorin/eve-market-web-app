'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { metadataUrl } from '@/lib/data-url';

interface MetadataResponse {
  lastGenerated: string;
  regionPairs: number;
  regions: number;
  version: string;
}

async function fetchMetadata(): Promise<MetadataResponse> {
  const response = await fetch(metadataUrl(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to fetch metadata');
  }
  return response.json();
}

interface FreshDataNotificationProps {
  currentDataTimestamp: string | null;
}

export function FreshDataNotification({ currentDataTimestamp }: FreshDataNotificationProps) {
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();

  // Poll metadata every 60 seconds to detect new data
  const { data: metadata, isLoading, error } = useQuery({
    queryKey: ['metadata'],
    queryFn: fetchMetadata,
    refetchInterval: 60000, // 1 minute
    retry: 3,
  });

  // Auto-refresh data when new data is detected
  useEffect(() => {
    if (!currentDataTimestamp || !metadata || dismissed) return;
    const currentDate = new Date(currentDataTimestamp);
    const latestDate = new Date(metadata.lastGenerated);
    if (latestDate > currentDate) {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setDismissed(false); // show the toast
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [metadata?.lastGenerated, currentDataTimestamp]);

  // Don't show if no current data timestamp or metadata not loaded
  if (!currentDataTimestamp || isLoading || error || !metadata || dismissed) {
    return null;
  }

  const currentDate = new Date(currentDataTimestamp);
  const latestDate = new Date(metadata.lastGenerated);
  if (!(latestDate > currentDate)) return null;

  return (
    <div
      className="w-full px-4 py-3 bg-eve-blue/20 border-b-2 border-eve-blue"
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ArrowPathIcon
            className="h-5 w-5 text-eve-blue animate-spin flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-eve-blue">
            Market data updated — loading fresh opportunities...
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/20 transition-colors"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-4 w-4 text-eve-blue" />
        </button>
      </div>
    </div>
  );
}
