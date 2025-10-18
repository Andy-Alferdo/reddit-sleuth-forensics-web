import { BarChart, Bar, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: Array<{ name: string; value: number }>;
}

export const MiniSparkline = ({ data }: MiniSparklineProps) => {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar 
          dataKey="value" 
          fill="hsl(var(--muted-foreground))" 
          opacity={0.3}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
