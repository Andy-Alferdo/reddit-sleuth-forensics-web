import React, { Component } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

/**
 * Chart Data Interface
 */
interface ChartData {
  name: string;
  value: number;
  date?: string;
}

/**
 * AnalyticsChart Props Interface
 */
interface AnalyticsChartProps {
  data: ChartData[];
  title: string;
  type: 'line' | 'bar' | 'pie';
  height?: number;
}

/**
 * AnalyticsChart Component - Class-based implementation
 * Renders various chart types using Recharts library
 */
export class AnalyticsChart extends Component<AnalyticsChartProps> {
  // Default props
  public static defaultProps = {
    height: 300
  };

  // Neo4j/Talkwalker inspired colors - class property
  private readonly neo4jColors: string[] = [
    'hsl(var(--primary))',
    'hsl(var(--forensic-success))',
    'hsl(var(--accent))',
    'hsl(var(--forensic-warning))',
    'hsl(var(--forensic-cyan))',
    'hsl(var(--secondary))',
  ];

  // Chart configuration - class property
  private readonly chartConfig = {
    value: {
      label: "Value",
      color: "hsl(var(--primary))",
    },
  };

  /**
   * Render line chart
   */
  private renderLineChart(): JSX.Element {
    const { data } = this.props;

    return (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
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
  }

  /**
   * Render bar chart
   */
  private renderBarChart(): JSX.Element {
    const { data } = this.props;

    return (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
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
  }

  /**
   * Render pie chart
   */
  private renderPieChart(): JSX.Element {
    const { data } = this.props;

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
          outerRadius={120}
          innerRadius={60}
          fill="hsl(var(--primary))"
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={this.neo4jColors[index % this.neo4jColors.length]}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    );
  }

  /**
   * Render chart based on type
   */
  private renderChart(): JSX.Element | null {
    const { type } = this.props;

    switch (type) {
      case 'line':
        return this.renderLineChart();
      case 'bar':
        return this.renderBarChart();
      case 'pie':
        return this.renderPieChart();
      default:
        return null;
    }
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    const { title, height } = this.props;

    return (
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={this.chartConfig} className={`h-[${height}px] w-full`}>
            <ResponsiveContainer width="100%" height={height}>
              {this.renderChart()}
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }
}
