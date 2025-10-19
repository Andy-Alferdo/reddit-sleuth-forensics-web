import { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

interface CompactBarChartProps {
  visitorValue: string;
  contributorValue: string;
  visitorCount: number;
  contributorCount: number;
}

export const CompactBarChart = ({ 
  visitorValue, 
  contributorValue,
  visitorCount,
  contributorCount 
}: CompactBarChartProps) => {
  const [activeBar, setActiveBar] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const data = [
    { name: 'Weekly Visitors', value: visitorCount, color: 'hsl(200 80% 50%)', displayValue: visitorValue },
    { name: 'Weekly Contributors', value: contributorCount, color: 'hsl(142 70% 50%)', displayValue: contributorValue },
  ];

  const maxValue = Math.max(visitorCount, contributorCount);

  const handleBarClick = (entry: any, event: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveBar(entry.name);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleClickOutside = () => {
    setActiveBar(null);
    setTooltipPosition(null);
  };

  return (
    <div className="space-y-4" onClick={handleClickOutside}>
      {/* KPI Numbers */}
      <div className="flex justify-around text-center">
        <div>
          <p className="text-2xl font-bold">{visitorValue}</p>
          <p className="text-xs text-muted-foreground">Visitors</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{contributorValue}</p>
          <p className="text-xs text-muted-foreground">Contributors</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: '100px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              maxBarSize={32}
              onClick={(entry, index, event) => handleBarClick(entry, event)}
              style={{ cursor: 'pointer' }}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tooltip */}
        {activeBar && tooltipPosition && (
          <div
            className="fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {data.find(d => d.name === activeBar)?.displayValue} {activeBar.includes('Visitors') ? 'Visitors' : 'Contributors'}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(200 80% 50%)' }} />
          <span className="text-muted-foreground">Weekly Visitors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(142 70% 50%)' }} />
          <span className="text-muted-foreground">Weekly Contributors</span>
        </div>
      </div>
    </div>
  );
};
