'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface MetadataResponse {
  lastGenerated: string;
  regionPairs: number;
  regions: number;
  version: string;
}

async function fetchMetadata(): Promise<MetadataResponse> {
  const response = await fetch('/data/metadata.json');
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

  // Reset dismissed state when metadata timestamp changes
  useEffect(() => {
    setDismissed(false);
  }, [metadata?.lastGenerated]);

  // Don't show if no current data timestamp or metadata not loaded
  if (!currentDataTimestamp || isLoading || error || !metadata || dismissed) {
    return null;
  }

  // Check if new data is available
  const currentDate = new Date(currentDataTimestamp);
  const latestDate = new Date(metadata.lastGenerated);
  const hasNewData = latestDate > currentDate;

  if (!hasNewData) {
    return null;
  }

  const handleRefresh = () => {
    // Invalidate opportunities query to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    setDismissed(true);
  };

  return (
    <div
      className="w-full px-4 py-3 bg-eve-blue/20 border-b-2 border-eve-blue"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ArrowPathIcon
            className="h-6 w-6 text-eve-blue animate-spin flex-shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-eve-blue">
              Fresh market data available!
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              New opportunities have been calculated. Click refresh to see the latest data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-eve-blue text-white rounded-lg hover:bg-eve-blue/90 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-eve-blue focus:ring-offset-2"
            aria-label="Refresh to load new data"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-black/20 transition-colors focus:outline-none focus:ring-2 focus:ring-eve-blue focus:ring-offset-2"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-5 w-5 text-eve-blue" />
          </button>
        </div>
      </div>
    </div>
  );
}
