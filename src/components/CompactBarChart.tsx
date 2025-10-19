import { BarChart, Bar, ResponsiveContainer, Cell, LabelList } from 'recharts';

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
  const data = [
    { name: 'Weekly Visitors', value: visitorCount, color: 'hsl(200 80% 50%)', displayValue: `Value: ${visitorValue}` },
    { name: 'Weekly Contributors', value: contributorCount, color: 'hsl(142 70% 50%)', displayValue: `Value: ${contributorValue}` },
  ];

  return (
    <div className="space-y-4">
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
          >
            <Bar
              dataKey="value"
              radius={[0, 6, 6, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                />
              ))}
              <LabelList 
                dataKey="displayValue" 
                position="center"
                style={{ 
                  fill: 'white', 
                  fontSize: '14px', 
                  fontWeight: '500' 
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
