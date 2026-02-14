'use client';

import { useState } from 'react';
import { RegionSelector } from '@/components/RegionSelector';
import { useRegions } from '@/lib/queries/regions';
import type { Region } from '@/lib/regions';

export default function KeyboardTestPage() {
  const { data: regions, isLoading } = useRegions();
  const [buyMarket, setBuyMarket] = useState<Region | null>(null);
  const [sellMarket, setSellMarket] = useState<Region | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading regions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Keyboard Navigation Test
        </h1>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <RegionSelector
            label="Buy Market"
            placeholder="Select buy region..."
            value={buyMarket}
            onChange={setBuyMarket}
            regions={regions ?? []}
            autoFocus
          />

          <RegionSelector
            label="Sell Market"
            placeholder="Select sell region..."
            value={sellMarket}
            onChange={setSellMarket}
            regions={regions ?? []}
          />
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Keyboard Shortcuts
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-mono text-eve-blue">Tab</dt>
              <dd className="text-gray-400">Move to next field</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Shift + Tab</dt>
              <dd className="text-gray-400">Move to previous field</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">↓ Arrow Down</dt>
              <dd className="text-gray-400">Open dropdown / Next option</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">↑ Arrow Up</dt>
              <dd className="text-gray-400">Previous option</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Enter</dt>
              <dd className="text-gray-400">Select highlighted option</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Escape</dt>
              <dd className="text-gray-400">Close dropdown / Clear input</dd>
            </div>
            <div>
              <dt className="font-mono text-eve-blue">Type</dt>
              <dd className="text-gray-400">Filter regions</dd>
            </div>
          </dl>
        </div>

        {(buyMarket || sellMarket) && (
          <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Selected Markets
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Buy Market:</p>
                <p className="text-white font-medium">
                  {buyMarket?.name ?? 'Not selected'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Sell Market:</p>
                <p className="text-white font-medium">
                  {sellMarket?.name ?? 'Not selected'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
