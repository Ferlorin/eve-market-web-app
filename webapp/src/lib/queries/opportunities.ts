import { useQuery } from '@tanstack/react-query';
import type { Opportunity } from '@/components/OpportunityTable';

interface OpportunitiesParams {
  buyRegion: number;
  sellRegion: number;
}

async function fetchOpportunities(
  params: OpportunitiesParams
): Promise<Opportunity[]> {
  const response = await fetch(
    `/api/opportunities?buyRegion=${params.buyRegion}&sellRegion=${params.sellRegion}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch opportunities');
  }

  const json = await response.json();
  return json.data || [];
}

export function useOpportunities(params: OpportunitiesParams | null) {
  return useQuery({
    queryKey: ['opportunities', params?.buyRegion, params?.sellRegion],
    queryFn: () => fetchOpportunities(params!),
    enabled: params !== null && params.buyRegion !== params.sellRegion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
