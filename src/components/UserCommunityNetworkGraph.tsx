import { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NetworkNode {
  id: string;
  label: string;
  type: 'user' | 'community';
  color?: string;
  size?: number;
}

interface NetworkLink {
  source: string;
  target: string;
  weight?: number;
}

interface UserCommunityNetworkGraphProps {
  title: string;
  nodes: NetworkNode[];
  links: NetworkLink[];
  primaryUserId?: string;
}

interface SimulatedNode extends NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimulatedLink {
  source: SimulatedNode;
  target: SimulatedNode;
  weight: number;
}

const nodeColors: Record<string, string> = {
  user: '#10B981',
  community: '#3B82F6',
};

const nodeGradients: Record<string, { start: string; end: string }> = {
  user: { start: '#10B981', end: '#059669' },
  community: { start: '#3B82F6', end: '#2563EB' },
};

export const UserCommunityNetworkGraph = ({ 
  title, 
  nodes, 
  links, 
  primaryUserId 
}: UserCommunityNetworkGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const animationRef = useRef<number>();
  const nodesRef = useRef<SimulatedNode[]>([]);
  const linksRef = useRef<SimulatedLink[]>([]);
  const frameCountRef = useRef(0);

  // Drag & click state
  const isDraggingRef = useRef(false);
  const dragNodeRef = useRef<SimulatedNode | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const getNodeAtPosition = useCallback((mx: number, my: number): SimulatedNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = mx - node.x;
      const dy = my - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= (node.size || 30)) return node;
    }
    return null;
  }, []);

  const getCanvasCoords = useCallback((e: MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width - 32, 400), height: 500 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      const pos = getCanvasCoords(e);
      const node = getNodeAtPosition(pos.x, pos.y);
      if (node) {
        isDraggingRef.current = false;
        dragNodeRef.current = node;
        mouseDownPosRef.current = pos;
        // Reset simulation to keep rendering while dragging
        frameCountRef.current = 0;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getCanvasCoords(e);

      if (dragNodeRef.current && mouseDownPosRef.current) {
        const dx = pos.x - mouseDownPosRef.current.x;
        const dy = pos.y - mouseDownPosRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDraggingRef.current = true;
        }
        if (isDraggingRef.current) {
          dragNodeRef.current.x = pos.x;
          dragNodeRef.current.y = pos.y;
          dragNodeRef.current.vx = 0;
          dragNodeRef.current.vy = 0;
        }
      }

      // Cursor feedback
      const hovered = getNodeAtPosition(pos.x, pos.y);
      canvas.style.cursor = hovered ? 'pointer' : 'default';
    };

    const handleMouseUp = () => {
      dragNodeRef.current = null;
      mouseDownPosRef.current = null;
      // Let simulation settle again
      if (isDraggingRef.current) {
        frameCountRef.current = 150;
      }
      isDraggingRef.current = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const pos = getCanvasCoords(e);
      const node = getNodeAtPosition(pos.x, pos.y);
      if (!node) return;

      const label = node.label;
      if (node.type === 'community') {
        const sub = label.replace(/^r\//, '');
        window.open(`https://www.reddit.com/r/${sub}`, '_blank');
      } else if (node.type === 'user') {
        const user = label.replace(/^u\//, '');
        window.open(`https://www.reddit.com/user/${user}`, '_blank');
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
    };
  }, [getCanvasCoords, getNodeAtPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize nodes with positions
    const simulatedNodes: SimulatedNode[] = nodes.map((node, index) => {
      const isPrimary = node.id === primaryUserId;
      const angle = (2 * Math.PI * index) / nodes.length;
      const radius = isPrimary ? 0 : 150 + Math.random() * 80;
      
      return {
        ...node,
        x: isPrimary ? centerX : centerX + radius * Math.cos(angle),
        y: isPrimary ? centerY : centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        size: isPrimary ? 45 : (node.type === 'community' ? 35 : 25),
      };
    });

    const nodeMap = new Map<string, SimulatedNode>();
    simulatedNodes.forEach(node => nodeMap.set(node.id, node));

    const simulatedLinks: SimulatedLink[] = links
      .map(link => ({
        source: nodeMap.get(link.source)!,
        target: nodeMap.get(link.target)!,
        weight: link.weight || 1,
      }))
      .filter(link => link.source && link.target);

    nodesRef.current = simulatedNodes;
    linksRef.current = simulatedLinks;
    frameCountRef.current = 0;

    const simulate = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      nodes.forEach(node => {
        // Skip dragged node
        if (node === dragNodeRef.current) return;

        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.0005;
        node.vy += dy * 0.0005;

        nodes.forEach(other => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = (node.size || 30) + (other.size || 30) + 40;
          
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.05;
            node.vx += dx * force;
            node.vy += dy * force;
          }
        });
      });

      links.forEach(link => {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 120 + (link.weight * 20);
        const force = (dist - idealDist) / dist * 0.02;
        
        if (link.source !== dragNodeRef.current) {
          link.source.vx += dx * force;
          link.source.vy += dy * force;
        }
        if (link.target !== dragNodeRef.current) {
          link.target.vx -= dx * force;
          link.target.vy -= dy * force;
        }
      });

      nodes.forEach(node => {
        if (node === dragNodeRef.current) return;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;

        const margin = 60;
        node.x = Math.max(margin, Math.min(width - margin, node.x));
        node.y = Math.max(margin, Math.min(height - margin, node.y));
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
      bgGradient.addColorStop(0, 'rgba(15, 23, 42, 1)');
      bgGradient.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Ambient particles
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(Date.now() * 0.001 + i * 0.5) + 1) * width / 2;
        const y = (Math.cos(Date.now() * 0.0008 + i * 0.7) + 1) * height / 2;
        const size = 1 + Math.sin(Date.now() * 0.002 + i) * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.05})`;
        ctx.fill();
      }

      const links = linksRef.current;
      const nodes = nodesRef.current;

      // Draw links
      links.forEach(link => {
        const sourceColor = nodeColors[link.source.type] || '#64748b';
        const targetColor = nodeColors[link.target.type] || '#64748b';
        
        const gradient = ctx.createLinearGradient(
          link.source.x, link.source.y,
          link.target.x, link.target.y
        );
        gradient.addColorStop(0, sourceColor + '60');
        gradient.addColorStop(1, targetColor + '60');

        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5 + link.weight * 0.5;
        ctx.stroke();

        const time = Date.now() * 0.001;
        const particlePos = (time % 2) / 2;
        const px = link.source.x + (link.target.x - link.source.x) * particlePos;
        const py = link.source.y + (link.target.y - link.source.y) * particlePos;
        
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach(node => {
        const size = node.size || 30;
        const isPrimary = node.id === primaryUserId;
        const colors = nodeGradients[node.type] || { start: '#64748b', end: '#475569' };

        const glowGradient = ctx.createRadialGradient(node.x, node.y, size * 0.5, node.x, node.y, size * 2);
        glowGradient.addColorStop(0, colors.start + '40');
        glowGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        const nodeGradient = ctx.createRadialGradient(
          node.x - size * 0.3, node.y - size * 0.3, 0,
          node.x, node.y, size
        );
        nodeGradient.addColorStop(0, colors.start);
        nodeGradient.addColorStop(1, colors.end);

        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = nodeGradient;
        ctx.fill();

        ctx.strokeStyle = isPrimary ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isPrimary ? 3 : 1.5;
        ctx.stroke();

        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${size * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const icons: Record<string, string> = {
          user: '👤',
          community: '👥',
        };
        ctx.fillText(icons[node.type] || '●', node.x, node.y);

        // Label
        ctx.font = `600 ${isPrimary ? 13 : 11}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const labelWidth = ctx.measureText(node.label).width + 12;
        const labelHeight = 20;
        const labelY = node.y + size + 8;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(node.x - labelWidth / 2, labelY - 2, labelWidth, labelHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(node.label, node.x, labelY + 2);
      });
    };

    const animate = () => {
      frameCountRef.current++;
      if (frameCountRef.current < 200 || dragNodeRef.current) {
        simulate();
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, dimensions, primaryUserId]);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent ref={containerRef} className="p-4">
        <div className="rounded-xl overflow-hidden shadow-inner border border-border/50">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}></div>
            <span className="text-muted-foreground">Users</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}></div>
            <span className="text-muted-foreground">Communities</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
