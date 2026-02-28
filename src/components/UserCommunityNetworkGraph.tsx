import { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  fixed?: boolean;
}

interface SimulatedLink {
  source: SimulatedNode;
  target: SimulatedNode;
  weight: number;
}

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

  // Transform state for zoom/pan
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });

  // Drag state
  const isDraggingNodeRef = useRef(false);
  const dragNodeRef = useRef<SimulatedNode | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Convert screen coords to world coords
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current;
    return {
      x: (sx - t.x) / t.scale,
      y: (sy - t.y) / t.scale,
    };
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

  const getNodeAtPosition = useCallback((wx: number, wy: number): SimulatedNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const dx = wx - node.x;
      const dy = wy - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= (node.size || 30)) return node;
    }
    return null;
  }, []);

  // Zoom controls
  const handleZoom = useCallback((delta: number, cx?: number, cy?: number) => {
    const t = transformRef.current;
    const factor = delta > 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.2, Math.min(5, t.scale * factor));
    const centerX = cx ?? dimensions.width / 2;
    const centerY = cy ?? dimensions.height / 2;
    t.x = centerX - (centerX - t.x) * (newScale / t.scale);
    t.y = centerY - (centerY - t.y) * (newScale / t.scale);
    t.scale = newScale;
  }, [dimensions]);

  const resetView = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
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

  // Mouse/wheel event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const pos = getCanvasCoords(e as any);
      handleZoom(e.deltaY < 0 ? 1 : -1, pos.x, pos.y);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const screenPos = getCanvasCoords(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const node = getNodeAtPosition(worldPos.x, worldPos.y);

      if (node) {
        isDraggingNodeRef.current = false;
        dragNodeRef.current = node;
        mouseDownPosRef.current = screenPos;
        frameCountRef.current = 0; // keep rendering
      } else {
        // Start panning
        isPanningRef.current = true;
        panStartRef.current = { x: screenPos.x, y: screenPos.y, tx: transformRef.current.x, ty: transformRef.current.y };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const screenPos = getCanvasCoords(e);

      if (isPanningRef.current && panStartRef.current) {
        const dx = screenPos.x - panStartRef.current.x;
        const dy = screenPos.y - panStartRef.current.y;
        transformRef.current.x = panStartRef.current.tx + dx;
        transformRef.current.y = panStartRef.current.ty + dy;
        return;
      }

      if (dragNodeRef.current && mouseDownPosRef.current) {
        const dx = screenPos.x - mouseDownPosRef.current.x;
        const dy = screenPos.y - mouseDownPosRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDraggingNodeRef.current = true;
        }
        if (isDraggingNodeRef.current) {
          const worldPos = screenToWorld(screenPos.x, screenPos.y);
          dragNodeRef.current.x = worldPos.x;
          dragNodeRef.current.y = worldPos.y;
          dragNodeRef.current.vx = 0;
          dragNodeRef.current.vy = 0;
          dragNodeRef.current.fixed = true;
        }
      }

      // Cursor
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const hovered = getNodeAtPosition(worldPos.x, worldPos.y);
      canvas.style.cursor = hovered ? 'grab' : (isPanningRef.current ? 'grabbing' : 'default');
    };

    const handleMouseUp = () => {
      if (dragNodeRef.current && isDraggingNodeRef.current) {
        // Node stays where dropped (fixed = true persists)
        dragNodeRef.current = null;
        frameCountRef.current = 150;
      }
      dragNodeRef.current = null;
      mouseDownPosRef.current = null;
      isDraggingNodeRef.current = false;
      isPanningRef.current = false;
      panStartRef.current = null;
    };

    const handleClick = (e: MouseEvent) => {
      if (isDraggingNodeRef.current || isPanningRef.current) return;
      const screenPos = getCanvasCoords(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const node = getNodeAtPosition(worldPos.x, worldPos.y);
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

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
    };
  }, [getCanvasCoords, getNodeAtPosition, screenToWorld, handleZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    // Reset transform to center
    transformRef.current = { x: 0, y: 0, scale: 1 };

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
        fixed: false,
      };
    });

    const nodeMap = new Map<string, SimulatedNode>();
    simulatedNodes.forEach(n => nodeMap.set(n.id, n));

    const simulatedLinks: SimulatedLink[] = links
      .map(link => ({
        source: nodeMap.get(link.source)!,
        target: nodeMap.get(link.target)!,
        weight: link.weight || 1,
      }))
      .filter(l => l.source && l.target);

    nodesRef.current = simulatedNodes;
    linksRef.current = simulatedLinks;
    frameCountRef.current = 0;

    const simulate = () => {
      const nodes = nodesRef.current;
      const links = linksRef.current;

      nodes.forEach(node => {
        if (node === dragNodeRef.current || node.fixed) return;

        // Center gravity
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        node.vx += dx * 0.0005;
        node.vy += dy * 0.0005;

        // Repulsion
        nodes.forEach(other => {
          if (node === other) return;
          const ddx = node.x - other.x;
          const ddy = node.y - other.y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const minDist = (node.size || 30) + (other.size || 30) + 40;
          if (dist < minDist) {
            const force = (minDist - dist) / dist * 0.05;
            node.vx += ddx * force;
            node.vy += ddy * force;
          }
        });
      });

      links.forEach(link => {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = 120 + (link.weight * 20);
        const force = (dist - idealDist) / dist * 0.02;
        if (!link.source.fixed && link.source !== dragNodeRef.current) {
          link.source.vx += dx * force;
          link.source.vy += dy * force;
        }
        if (!link.target.fixed && link.target !== dragNodeRef.current) {
          link.target.vx -= dx * force;
          link.target.vy -= dy * force;
        }
      });

      nodes.forEach(node => {
        if (node === dragNodeRef.current || node.fixed) return;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Background
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width / 2);
      bgGradient.addColorStop(0, 'rgba(15, 23, 42, 1)');
      bgGradient.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Ambient particles (not affected by transform)
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(Date.now() * 0.001 + i * 0.5) + 1) * width / 2;
        const y = (Math.cos(Date.now() * 0.0008 + i * 0.7) + 1) * height / 2;
        const s = 1 + Math.sin(Date.now() * 0.002 + i) * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.05})`;
        ctx.fill();
      }

      // Apply zoom/pan transform
      const t = transformRef.current;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      const allLinks = linksRef.current;
      const allNodes = nodesRef.current;

      // Draw links
      allLinks.forEach(link => {
        const sColors = nodeGradients[link.source.type] || { start: '#64748b', end: '#475569' };
        const tColors = nodeGradients[link.target.type] || { start: '#64748b', end: '#475569' };

        const gradient = ctx.createLinearGradient(link.source.x, link.source.y, link.target.x, link.target.y);
        gradient.addColorStop(0, sColors.start + '60');
        gradient.addColorStop(1, tColors.start + '60');

        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5 + link.weight * 0.5;
        ctx.stroke();

        // Traveling particle
        const time = Date.now() * 0.001;
        const pp = (time % 2) / 2;
        const px = link.source.x + (link.target.x - link.source.x) * pp;
        const py = link.source.y + (link.target.y - link.source.y) * pp;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();
      });

      // Draw nodes
      allNodes.forEach(node => {
        const size = node.size || 30;
        const isPrimary = node.id === primaryUserId;
        const colors = nodeGradients[node.type] || { start: '#64748b', end: '#475569' };

        // Glow
        const glowGradient = ctx.createRadialGradient(node.x, node.y, size * 0.5, node.x, node.y, size * 2);
        glowGradient.addColorStop(0, colors.start + '40');
        glowGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Node circle
        const nodeGrad = ctx.createRadialGradient(node.x - size * 0.3, node.y - size * 0.3, 0, node.x, node.y, size);
        nodeGrad.addColorStop(0, colors.start);
        nodeGrad.addColorStop(1, colors.end);
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = nodeGrad;
        ctx.fill();

        // Fixed indicator ring
        if (node.fixed) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.strokeStyle = isPrimary ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isPrimary ? 3 : 1.5;
        ctx.stroke();

        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${size * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons: Record<string, string> = { user: '👤', community: '👥' };
        ctx.fillText(icons[node.type] || '●', node.x, node.y);

        // Label
        ctx.font = `600 ${isPrimary ? 13 : 11}px system-ui, -apple-system, sans-serif`;
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

      ctx.restore();

      // Zoom indicator overlay
      const scale = transformRef.current.scale;
      if (Math.abs(scale - 1) > 0.01) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(width - 80, 10, 70, 24, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(scale * 100)}%`, width - 45, 22);
      }
    };

    const animate = () => {
      frameCountRef.current++;
      if (frameCountRef.current < 200 || dragNodeRef.current || isPanningRef.current) {
        simulate();
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes, links, dimensions, primaryUserId]);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleZoom(-1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Scroll to zoom • Drag background to pan • Drag nodes to reposition • Click nodes to open Reddit</p>
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-yellow-400" style={{ width: 16, height: 16 }}></div>
            <span className="text-muted-foreground">Pinned (dragged)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
