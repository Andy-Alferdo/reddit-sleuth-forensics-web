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
    { name: 'Weekly Visitors', value: visitorCount, color: 'hsl(200 80% 50%)', displayValue: visitorValue, label: 'Visitors' },
    { name: 'Weekly Contributors', value: contributorCount, color: 'hsl(142 70% 50%)', displayValue: contributorValue, label: 'Contributors' },
  ];

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
      <div className="relative" style={{ height: '120px' }}>
        {/* Yellow vertical line on the left */}
        <div 
          className="absolute left-0 top-0 bottom-10 w-1.5 bg-yellow-400 rounded-sm" 
          style={{ zIndex: 10 }}
        />
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 30, bottom: 30 }}
            barGap={10}
          >
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              barSize={35}
              isAnimationActive={false}
              onClick={(entry, index, event) => handleBarClick(entry, event)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  style={{
                    filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15))',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tooltip */}
        {activeBar && tooltipPosition && (
          <div
            className="fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg animate-fade-in"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {data.find(d => d.name === activeBar)?.displayValue} {data.find(d => d.name === activeBar)?.label}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: 'hsl(200 80% 50%)' }} />
          <span className="font-medium">Weekly Visitors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 rounded-sm" style={{ backgroundColor: 'hsl(142 70% 50%)' }} />
          <span className="font-medium">Weekly Contributors</span>
        </div>
      </div>
    </div>
  );
};
