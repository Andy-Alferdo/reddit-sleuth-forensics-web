import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HeliosNode {
  id: string;
  label: string;
  type: 'user' | 'community' | 'platform';
}

interface HeliosLink {
  source: string;
  target: string;
  weight?: number;
}

interface HeliosNetworkGraphProps {
  title: string;
  nodes: HeliosNode[];
  links: HeliosLink[];
}

export const HeliosNetworkGraph = ({ title, nodes, links }: HeliosNetworkGraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = containerRef.current.clientWidth;
    canvas.height = 500;

    // Simple force-directed graph simulation
    const nodePositions = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    
    // Initialize node positions
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.3;
      nodePositions.set(node.id, {
        x: canvas.width / 2 + Math.cos(angle) * radius,
        y: canvas.height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      });
    });

    const getNodeColor = (type: string) => {
      const colors = {
        user: '#0066CC',
        community: '#059669',
        platform: '#0891B2'
      };
      return colors[type as keyof typeof colors] || '#6B7280';
    };

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw links
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 2;
      links.forEach(link => {
        const sourcePos = nodePositions.get(link.source);
        const targetPos = nodePositions.get(link.target);
        if (sourcePos && targetPos) {
          ctx.beginPath();
          ctx.moveTo(sourcePos.x, sourcePos.y);
          ctx.lineTo(targetPos.x, targetPos.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const pos = nodePositions.get(node.id);
        if (!pos) return;

        const radius = node.type === 'user' ? 20 : 15;
        
        // Node circle
        ctx.fillStyle = getNodeColor(node.type);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Node border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#1F2937';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, pos.x, pos.y + radius + 15);
      });

      // Simple physics simulation
      nodePositions.forEach((pos, id) => {
        // Apply forces
        let fx = 0, fy = 0;

        // Repulsion from other nodes
        nodePositions.forEach((otherPos, otherId) => {
          if (id === otherId) return;
          const dx = pos.x - otherPos.x;
          const dy = pos.y - otherPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1000 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });

        // Attraction along links
        links.forEach(link => {
          if (link.source === id) {
            const targetPos = nodePositions.get(link.target);
            if (targetPos) {
              const dx = targetPos.x - pos.x;
              const dy = targetPos.y - pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              fx += dx * 0.001;
              fy += dy * 0.001;
            }
          }
          if (link.target === id) {
            const sourcePos = nodePositions.get(link.source);
            if (sourcePos) {
              const dx = sourcePos.x - pos.x;
              const dy = sourcePos.y - pos.y;
              fx += dx * 0.001;
              fy += dy * 0.001;
            }
          }
        });

        // Center attraction
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        fx += (centerX - pos.x) * 0.0001;
        fy += (centerY - pos.y) * 0.0001;

        // Update velocity and position
        pos.vx = (pos.vx + fx) * 0.85;
        pos.vy = (pos.vy + fy) * 0.85;
        pos.x += pos.vx;
        pos.y += pos.vy;

        // Bounds checking
        const margin = 30;
        pos.x = Math.max(margin, Math.min(canvas.width - margin, pos.x));
        pos.y = Math.max(margin, Math.min(canvas.height - margin, pos.y));
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [nodes, links]);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef} 
          className="w-full rounded-lg overflow-hidden bg-background border border-border shadow-inner"
        >
          <canvas ref={canvasRef} className="w-full" />
        </div>
        <div className="mt-4 flex gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary"></div>
            <span>Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-forensic-success"></div>
            <span>Communities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent"></div>
            <span>Platforms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
