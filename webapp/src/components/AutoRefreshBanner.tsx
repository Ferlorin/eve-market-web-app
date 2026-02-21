'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface MetadataResponse {
  lastGenerated: string;
  deploymentVersion: string;
  regionPairs: number;
  regions: number;
}

async function fetchMetadata(): Promise<MetadataResponse> {
  // Cache-bust with timestamp to bypass both browser and CDN cache
  const response = await fetch(`/data/metadata.json?t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch metadata');
  }
  return response.json();
}

export function AutoRefreshBanner() {
  const [initialVersion, setInitialVersion] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ['deployment-version'],
    queryFn: fetchMetadata,
    refetchInterval: 60000, // Check every 60 seconds
    retry: false,
  });

  // Store initial deployment version on mount
  useEffect(() => {
    if (data?.deploymentVersion && !initialVersion) {
      setInitialVersion(data.deploymentVersion);
    }
  }, [data, initialVersion]);

  // Detect version change and start countdown
  useEffect(() => {
    if (
      initialVersion &&
      data?.deploymentVersion &&
      data.deploymentVersion !== initialVersion &&
      countdown === null
    ) {
      // New deployment detected! Start 5-second countdown
      setCountdown(5);
    }
  }, [data, initialVersion, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      // Refresh the page
      window.location.reload();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Don't show banner if no new deployment
  if (countdown === null) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-eve-blue px-4 py-3 shadow-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <ArrowPathIcon
            className="h-6 w-6 text-white animate-spin"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-white">
              New data available!
            </p>
            <p className="text-xs text-white/90 mt-0.5">
              Page will refresh in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium text-white transition-colors"
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}
