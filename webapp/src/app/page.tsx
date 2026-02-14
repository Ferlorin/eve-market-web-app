'use client';

import { useState, useEffect } from 'react';
import { RegionSelector } from '@/components/RegionSelector';
import { DataFreshness } from '@/components/DataFreshness';
import { StaleDataBanner } from '@/components/StaleDataBanner';
import { OpportunityTable } from '@/components/OpportunityTable';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRegions } from '@/lib/queries/regions';
import { useOpportunities } from '@/lib/queries/opportunities';
import type { Region } from '@/lib/regions';

export default function HomePage() {
  const { data: regions, isLoading } = useRegions();
  const [buyMarket, setBuyMarket] = useState<Region | null>(null);
  const [sellMarket, setSellMarket] = useState<Region | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch opportunities when both markets are selected
  const opportunitiesParams =
    buyMarket && sellMarket && !validationError
      ? { buyRegion: buyMarket.regionId, sellRegion: sellMarket.regionId }
      : null;

  const {
    data: opportunities,
    isLoading: opportunitiesLoading,
    error: opportunitiesError,
  } = useOpportunities(opportunitiesParams);

  // Validate market selection
  useEffect(() => {
    if (buyMarket && sellMarket) {
      if (buyMarket.regionId === sellMarket.regionId) {
        setValidationError('Buy and sell markets must be different');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [buyMarket, sellMarket]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-eve-blue mb-4"></div>
          <p className="text-gray-400">Loading regions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Stale Data Warning Banner */}
      <StaleDataBanner />

      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                EVE Market Scanner
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Find profitable trading opportunities across regions
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Market Selection Section */}
        <section className="mb-8" aria-labelledby="market-selection-heading">
          <h2 id="market-selection-heading" className="sr-only">
            Market Selection
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RegionSelector
              label="Buy Market"
              placeholder="Select region to buy from..."
              value={buyMarket}
              onChange={setBuyMarket}
              regions={regions ?? []}
              autoFocus
            />

            <RegionSelector
              label="Sell Market"
              placeholder="Select region to sell in..."
              value={sellMarket}
              onChange={setSellMarket}
              regions={regions ?? []}
            />
          </div>

          {/* Validation Error */}
          {validationError && (
            <div 
              className="mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-eve-gold/10 border border-eve-gold"
              role="alert"
              aria-live="polite"
            >
              <svg
                className="h-5 w-5 text-eve-gold flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-eve-gold font-medium">
                {validationError}
              </span>
            </div>
          )}

          {/* Selection Summary */}
          {buyMarket && sellMarket && !validationError && (
            <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                Comparing opportunities:
              </p>
              <div className="flex items-center gap-4 text-white">
                <span className="font-medium">{buyMarket.name}</span>
                <svg
                  className="h-5 w-5 text-eve-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                <span className="font-medium">{sellMarket.name}</span>
              </div>
            </div>
          )}
        </section>

        {/* Opportunities Table */}
        {buyMarket && sellMarket && !validationError && (
          <section aria-labelledby="opportunities-heading">
            <h2 id="opportunities-heading" className="sr-only">
              Trading Opportunities
            </h2>
            {opportunitiesLoading && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-eve-blue mb-4"></div>
                <p className="text-gray-400">Loading opportunities...</p>
              </div>
            )}

            {opportunitiesError && (
              <div
                className="bg-gray-800 border border-eve-red rounded-lg p-6"
                role="alert"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className="h-6 w-6 text-eve-red flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-eve-red">
                      Unable to load opportunities
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      The server encountered an error. Please try refreshing in
                      a few minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!opportunitiesLoading &&
              !opportunitiesError &&
              opportunities &&
              opportunities.length === 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-white">
                    No profitable trades found
                  </h3>
                  <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
                    No profitable trades found between {buyMarket.name} and{' '}
                    {sellMarket.name} with current market conditions. Try
                    different regions.
                  </p>
                </div>
              )}

            {!opportunitiesLoading &&
              !opportunitiesError &&
              opportunities &&
              opportunities.length > 0 && (
                <OpportunityTable data={opportunities} />
              )}
          </section>
        )}

        {/* Empty State */}
        {(!buyMarket || !sellMarket) && (
          <section aria-labelledby="empty-state-heading">
            <h2 id="empty-state-heading" className="sr-only">
              Getting Started
            </h2>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-white">
                Select markets to begin
              </h3>
              <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
                Choose a buy market and a sell market to see profitable trading opportunities across EVE regions.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Footer with Data Freshness */}
      <DataFreshness />
    </div>
  );
}
