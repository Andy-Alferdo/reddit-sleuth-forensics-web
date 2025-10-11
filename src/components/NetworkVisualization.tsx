import { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NetworkNode {
  id: string;
  label: string;
  type: 'user' | 'community' | 'platform';
}

interface NetworkLink {
  source: string;
  target: string;
  weight?: number;
}

interface NetworkVisualizationProps {
  title: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export const NetworkVisualization = ({ title, nodes, links }: NetworkVisualizationProps) => {
  const fgRef = useRef<any>();

  useEffect(() => {
    if (fgRef.current) {
      // Zoom to fit
      fgRef.current.zoomToFit(400);
    }
  }, [nodes, links]);

  const getNodeColor = (node: NetworkNode) => {
    switch (node.type) {
      case 'user': return '#0EA5E9'; // Primary blue
      case 'community': return '#10B981'; // Green for communities
      case 'platform': return '#8B5CF6'; // Purple for platforms
      default: return '#6B7280';
    }
  };

  const graphData = {
    nodes: nodes.map(node => ({
      id: node.id,
      name: node.label,
      type: node.type,
      color: getNodeColor(node),
      val: node.type === 'user' ? 15 : 10
    })),
    links: links.map(link => ({
      source: link.source,
      target: link.target,
      value: link.weight || 1,
      color: 'rgba(100, 116, 139, 0.3)'
    }))
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full rounded-lg overflow-hidden bg-background border border-border">
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={8}
            linkColor="color"
            linkWidth={2}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            backgroundColor="hsl(var(--background))"
            width={1000}
            height={500}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
              ctx.fillStyle = node.color;
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
              
              // Draw label
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = 'hsl(var(--foreground))';
              ctx.fillText(label, node.x, node.y + node.val + 8);
            }}
          />
        </div>
        <div className="mt-4 flex gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#0EA5E9]"></div>
            <span>Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#10B981]"></div>
            <span>Communities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#8B5CF6]"></div>
            <span>Platforms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
