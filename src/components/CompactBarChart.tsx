interface CompactBarChartProps {
  visitorValue: string;
  contributorValue: string;
  visitorCount: number;
  contributorCount: number;
}

export const CompactBarChart = ({ 
  visitorValue, 
  contributorValue,
}: CompactBarChartProps) => {
  return (
    <div className="flex justify-around text-center py-4">
      <div>
        <p className="text-3xl font-bold">{visitorValue}</p>
        <p className="text-sm text-muted-foreground mt-1">Weekly Visitors</p>
      </div>
      <div>
        <p className="text-3xl font-bold">{contributorValue}</p>
        <p className="text-sm text-muted-foreground mt-1">Weekly Contributors</p>
      </div>
    </div>
  );
};
