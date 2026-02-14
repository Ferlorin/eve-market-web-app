import { useQuery } from '@tanstack/react-query';
import type { Region } from '@/lib/regions';

interface RegionsResponse {
  success: boolean;
  count: number;
  data: Region[];
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async (): Promise<Region[]> => {
      const response = await fetch('/api/regions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      
      const json: RegionsResponse = await response.json();
      return json.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour (regions rarely change)
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
  });
}
