'use client';

import { useEffect, useRef, useState } from 'react';
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

export function FreshDataNotification() {
  const [newDataDetected, setNewDataDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const queryClient = useQueryClient();
  const prevLastGenerated = useRef<string | null>(null);

  // Poll metadata every 60 seconds to detect new data
  const { data: metadata } = useQuery({
    queryKey: ['metadata'],
    queryFn: fetchMetadata,
    refetchInterval: 60000, // 1 minute
    retry: 3,
  });

  // Detect when metadata.lastGenerated actually increases (new data published).
  // Only fires when the timestamp changes during the session — not on region switches.
  useEffect(() => {
    if (!metadata?.lastGenerated) return;

    if (prevLastGenerated.current !== null) {
      const prev = new Date(prevLastGenerated.current);
      const latest = new Date(metadata.lastGenerated);
      if (latest > prev) {
        // New data was published — refresh table and show banner
        queryClient.invalidateQueries({ queryKey: ['opportunities'] });
        setNewDataDetected(true);
        setDismissed(false);
        const timer = setTimeout(() => setDismissed(true), 3000);
        prevLastGenerated.current = metadata.lastGenerated;
        return () => clearTimeout(timer);
      }
    }

    prevLastGenerated.current = metadata.lastGenerated;
  }, [metadata?.lastGenerated]);

  if (!newDataDetected || dismissed) return null;

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
