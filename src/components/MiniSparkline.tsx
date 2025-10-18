import { BarChart, Bar, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  color?: string;
}

export const MiniSparkline = ({ data, height = 32, color = "hsl(175 60% 45%)" }: MiniSparklineProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar 
          dataKey="value" 
          fill={color}
          opacity={0.4}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
