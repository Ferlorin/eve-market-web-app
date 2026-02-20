'use client';

import { useQuery } from '@tanstack/react-query';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MetadataResponse {
  lastGenerated: string;
}

async function checkMetadata(): Promise<MetadataResponse | null> {
  try {
    const response = await fetch('/data/metadata.json');
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Shows a banner when no market data has been generated yet
 * (first deployment or data generation in progress)
 */
export function NoDataYetBanner() {
  const { data: metadata, isLoading } = useQuery({
    queryKey: ['metadata-check'],
    queryFn: checkMetadata,
    retry: false,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Don't show while checking
  if (isLoading) return null;

  // Data exists - don't show banner
  if (metadata) return null;

  // No data yet - show banner
  return (
    <div className="bg-eve-gold/10 border-b border-eve-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-eve-gold flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-eve-gold">
              Market data is being generated
            </p>
            <p className="text-xs text-eve-gold/80 mt-0.5">
              First-time setup in progress. Data will be available in ~10 minutes. This page will update automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
