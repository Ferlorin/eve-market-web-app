'use client';

import { OpportunityTable, Opportunity } from '@/components/OpportunityTable';

// Generate mock data for testing
function generateMockData(count: number): Opportunity[] {
  const items = ['Tritanium', 'Pyerite', 'Mexallon', 'Isogen', 'Nocxium', 'Zydrine', 'Megacyte', 'Morphite'];
  const stations = ['60003760', '60008494', '60011866', '60004588', '60005686'];
  const data: Opportunity[] = [];

  for (let i = 0; i < count; i++) {
    const buyPrice = Math.random() * 1000 + 100;
    const sellPrice = buyPrice * (1 + Math.random() * 0.5);
    const volumeAvailable = Math.floor(Math.random() * 1000000) + 1000;
    
    const profitPerUnit = sellPrice - buyPrice;
    const maxProfit = profitPerUnit * volumeAvailable;
    
    data.push({
      typeId: 34 + i,
      itemName: items[i % items.length] + ` (${i})`,
      buyPrice,
      sellPrice,
      profitPerUnit,
      maxProfit,
      buyStation: stations[Math.floor(Math.random() * stations.length)],
      sellStation: stations[Math.floor(Math.random() * stations.length)],
      roi: ((sellPrice - buyPrice) / buyPrice) * 100,
      volumeAvailable,
    });
  }

  // Sort by ROI descending
  return data.sort((a, b) => b.roi - a.roi);
}

export default function TableTestPage() {
  const data = generateMockData(10000);

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">
          Opportunity Table Test (10,000 rows)
        </h1>
        
        <div className="mb-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">
          <h2 className="text-sm font-semibold text-white mb-2">Test Instructions:</h2>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>✓ Open DevTools → Performance tab → Record</li>
            <li>✓ Initial render should be &lt; 500ms</li>
            <li>✓ Scroll rapidly up and down</li>
            <li>✓ FPS should stay at 60fps (no jank)</li>
            <li>✓ Inspect DOM (only ~20 rows rendered)</li>
            <li>✓ Check alternating row colors</li>
          </ul>
        </div>

        <OpportunityTable data={data} />
      </div>
    </div>
  );
}
