import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  date?: string;
}

interface AnalyticsChartProps {
  data: ChartData[];
  title: string;
  type: 'line' | 'bar' | 'pie';
  height?: number;
}

export const AnalyticsChart = ({ data, title, type, height = 300 }: AnalyticsChartProps) => {
  const chartConfig = {
    value: {
      label: "Value",
      color: "hsl(var(--primary))",
    },
  };

  // Standard sentiment colors mapping
  const sentimentColorMap: Record<string, string> = {
    'Positive': '#28A745',
    'Negative': '#DC3545',
    'Neutral': '#9E9E9E',
  };

  // General chart colors for non-sentiment data
  const chartColors = [
    'hsl(var(--primary))',
    'hsl(var(--forensic-success))',
    'hsl(var(--accent))',
    'hsl(var(--forensic-warning))',
    'hsl(var(--forensic-cyan))',
    'hsl(var(--secondary))',
  ];

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              cursor={{ stroke: 'hsl(var(--primary) / 0.2)', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              activeDot={{ r: 7, strokeWidth: 2 }}
            />
          </LineChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              cursor={{ fill: 'hsl(var(--primary) / 0.1)' }}
            />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={{
                stroke: 'hsl(var(--muted-foreground))',
                strokeWidth: 1
              }}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              innerRadius={40}
              fill="hsl(var(--primary))"
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={sentimentColorMap[entry.name] || chartColors[index % chartColors.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div style={{ width: '100%', height }}>
          <ChartContainer config={chartConfig} className="w-full h-full !aspect-auto">
            {renderChart()}
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
