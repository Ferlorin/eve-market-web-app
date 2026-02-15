'use client';

import { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/20/solid';

export interface Opportunity {
  typeId: number;
  itemName: string;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  buyStation: string;
  sellStation: string;
  roi: number;
  volumeAvailable: number;
  maxProfit: number;
}

type SortColumn =
  | 'itemName'
  | 'buyPrice'
  | 'sellPrice'
  | 'profitPerUnit'
  | 'roi'
  | 'volumeAvailable'
  | 'buyStation'
  | 'sellStation'
  | 'maxProfit';

type SortDirection = 'asc' | 'desc';

interface OpportunityTableProps {
  data: Opportunity[];
}

export function OpportunityTable({ data }: OpportunityTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('roi');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortColumn) {
        case 'itemName':
          aVal = a.itemName.toLowerCase();
          bVal = b.itemName.toLowerCase();
          break;
        case 'buyPrice':
          aVal = a.buyPrice;
          bVal = b.buyPrice;
          break;
        case 'sellPrice':
          aVal = a.sellPrice;
          bVal = b.sellPrice;
          break;
        case 'profitPerUnit':
          aVal = a.profitPerUnit;
          bVal = b.profitPerUnit;
          break;
        case 'roi':
          aVal = a.roi;
          bVal = b.roi;
          break;
        case 'volumeAvailable':
          aVal = a.volumeAvailable;
          bVal = b.volumeAvailable;
          break;
        case 'buyStation':
          aVal = a.buyStation;
          bVal = b.buyStation;
          break;
        case 'sellStation':
          aVal = a.sellStation;
          bVal = b.sellStation;
          break;
        case 'maxProfit':
          aVal = a.maxProfit;
          bVal = b.maxProfit;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  const virtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column: default to descending for numbers, ascending for text
      setSortColumn(column);
      setSortDirection(column === 'itemName' ? 'asc' : 'desc');
    }

    // Scroll to top after sort
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 inline ml-1" />
    );
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatROI = (roi: number) => {
    return roi.toFixed(2) + '%';
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toLocaleString();
  };

  const headerButtonClass = (column: SortColumn) =>
    `w-full text-left px-0 py-0 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer
    ${sortColumn === column ? 'text-eve-blue' : 'theme-text-secondary hover:theme-text-primary'}
    focus:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue rounded`;

  if (data.length === 0) {
    return (
      <div className="w-full overflow-hidden rounded-lg border theme-border theme-bg-secondary">
        <div className="p-12 text-center">
          <p className="theme-text-secondary">No opportunities found</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full overflow-hidden rounded-lg border theme-border theme-bg-secondary"
      role="table"
      aria-label="Trading opportunities"
    >
      {/* Fixed Table Header with Sortable Columns */}
      <div 
        className="border-b theme-border theme-bg-primary"
        role="rowgroup"
      >
        <div
          className="grid grid-cols-9 gap-4 px-4 py-3"
          role="row"
        >
          <button
            onClick={() => handleSort('itemName')}
            className={headerButtonClass('itemName')}
            role="columnheader"
            aria-sort={
              sortColumn === 'itemName'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Item <SortIcon column="itemName" />
          </button>

          <button
            onClick={() => handleSort('buyStation')}
            className={`${headerButtonClass('buyStation')} text-center`}
            role="columnheader"
            aria-sort={
              sortColumn === 'buyStation'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Buy Station <SortIcon column="buyStation" />
          </button>

          <button
            onClick={() => handleSort('sellStation')}
            className={`${headerButtonClass('sellStation')} text-center`}
            role="columnheader"
            aria-sort={
              sortColumn === 'sellStation'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Sell Station <SortIcon column="sellStation" />
          </button>

          <button
            onClick={() => handleSort('buyPrice')}
            className={`${headerButtonClass('buyPrice')} text-right font-mono`}
            role="columnheader"
            aria-sort={
              sortColumn === 'buyPrice'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Buy Price <SortIcon column="buyPrice" />
          </button>

          <button
            onClick={() => handleSort('sellPrice')}
            className={`${headerButtonClass('sellPrice')} text-right font-mono`}
            role="columnheader"
            aria-sort={
              sortColumn === 'sellPrice'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Sell Price <SortIcon column="sellPrice" />
          </button>

          <button
            onClick={() => handleSort('roi')}
            className={`${headerButtonClass('roi')} text-right font-mono`}
            role="columnheader"
            aria-sort={
              sortColumn === 'roi'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            ROI% <SortIcon column="roi" />
          </button>

          <button
            onClick={() => handleSort('volumeAvailable')}
            className={`${headerButtonClass('volumeAvailable')} text-right font-mono`}
            role="columnheader"
            aria-sort={
              sortColumn === 'volumeAvailable'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Volume <SortIcon column="volumeAvailable" />
          </button>

          <button
            onClick={() => handleSort('profitPerUnit')}
            className={`${headerButtonClass('profitPerUnit')} text-right font-mono`}
            role="columnheader"
            aria-sort={
              sortColumn === 'profitPerUnit'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Profit/Unit <SortIcon column="profitPerUnit" />
          </button>

          <button
            onClick={() => handleSort('maxProfit')}
            className={`${headerButtonClass('maxProfit')} text-right font-mono`}
            role="columnheader"
            aria-sort={
              sortColumn === 'maxProfit'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            Max Profit <SortIcon column="maxProfit" />
          </button>
        </div>
      </div>

      {/* Scrollable Table Body with Virtual Scrolling */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto scrollbar-thin"
        role="rowgroup"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const opportunity = sortedData[virtualRow.index];
            const isEven = virtualRow.index % 2 === 0;

            return (
              <div
                key={virtualRow.key}
                className={`absolute top-0 left-0 w-full ${
                  isEven ? 'theme-row-even' : 'theme-row-odd'
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                role="row"
              >
                <div className="grid grid-cols-9 gap-4 px-4 py-2 items-center h-full min-w-0 [&>div]:min-w-0">
                  {/* Item Name */}
                  <div className="text-sm theme-text-primary truncate" role="cell" title={opportunity.itemName}>
                    {opportunity.itemName}
                  </div>

                  {/* Buy Station */}
                  <div className="text-sm theme-text-secondary text-center truncate" role="cell" title={opportunity.buyStation}>
                    {opportunity.buyStation}
                  </div>

                  {/* Sell Station */}
                  <div className="text-sm theme-text-secondary text-center truncate" role="cell" title={opportunity.sellStation}>
                    {opportunity.sellStation}
                  </div>

                  {/* Buy Price */}
                  <div className="text-sm theme-text-secondary text-right font-mono" role="cell">
                    {formatPrice(opportunity.buyPrice)}
                  </div>

                  {/* Sell Price */}
                  <div className="text-sm theme-text-secondary text-right font-mono" role="cell">
                    {formatPrice(opportunity.sellPrice)}
                  </div>

                  {/* ROI % */}
                  <div className="text-sm text-eve-blue text-right font-mono font-semibold" role="cell">
                    {formatROI(opportunity.roi)}
                  </div>

                  {/* Volume */}
                  <div className="text-sm theme-text-secondary text-right font-mono" role="cell">
                    {formatVolume(opportunity.volumeAvailable)}
                  </div>

                  {/* Profit Per Unit */}
                  <div className="text-sm theme-text-success text-right font-mono font-semibold" role="cell">
                    {formatPrice(opportunity.profitPerUnit)}
                  </div>

                  {/* Max Profit */}
                  <div className="text-sm theme-text-success-bold text-right font-mono font-bold" role="cell">
                    {formatPrice(opportunity.maxProfit)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with Row Count and Sort Info */}
      <div className="border-t theme-border theme-bg-primary px-4 py-2 flex justify-between items-center">
        <p className="text-xs theme-text-secondary">
          Showing {sortedData.length.toLocaleString()} opportunities
        </p>
        <p className="text-xs theme-text-secondary">
          Sorted by {sortColumn} ({sortDirection})
        </p>
      </div>
    </div>
  );
}
