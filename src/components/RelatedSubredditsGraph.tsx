import { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RelatedSub {
  name: string;
  subscribers?: number;
  description?: string;
}

interface RelatedSubredditsGraphProps {
  centerSubreddit: string;
  relatedSubreddits: RelatedSub[];
  onSubredditClick?: (name: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  isCenter: boolean;
  subscribers?: number;
  description?: string;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
}

export const RelatedSubredditsGraph = ({
  centerSubreddit,
  relatedSubreddits,
  onSubredditClick,
}: RelatedSubredditsGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const animationRef = useRef<number>();
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const frameRef = useRef(0);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const hoveredRef = useRef<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const t = transformRef.current;
    return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale };
  }, []);

  const getCanvasCoords = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const getNodeAt = useCallback((wx: number, wy: number) => {
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      const d = Math.hypot(wx - n.x, wy - n.y);
      if (d <= n.size) return n;
    }
    return null;
  }, []);

  const handleZoom = useCallback((delta: number) => {
    const t = transformRef.current;
    const factor = delta > 0 ? 1.15 : 1 / 1.15;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const newScale = Math.max(0.3, Math.min(4, t.scale * factor));
    t.x = cx - (cx - t.x) * (newScale / t.scale);
    t.y = cy - (cy - t.y) * (newScale / t.scale);
    t.scale = newScale;
  }, [dimensions]);

  const resetView = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width - 32, 300), height: 400 });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY < 0 ? 1 : -1);
    };

    const handleMove = (e: MouseEvent) => {
      const sc = getCanvasCoords(e);
      const wc = screenToWorld(sc.x, sc.y);
      const node = getNodeAt(wc.x, wc.y);
      hoveredRef.current = node;
      setHoveredNode(node);
      if (node) {
        const rect = canvas.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      canvas.style.cursor = node ? 'pointer' : 'default';
    };

    const handleClick = (e: MouseEvent) => {
      const sc = getCanvasCoords(e);
      const wc = screenToWorld(sc.x, sc.y);
      const node = getNodeAt(wc.x, wc.y);
      if (node && onSubredditClick) {
        onSubredditClick(node.label);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', handleClick);
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [getCanvasCoords, screenToWorld, getNodeAt, handleZoom, onSubredditClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    transformRef.current = { x: 0, y: 0, scale: 1 };

    const nodes: GraphNode[] = [
      { id: centerSubreddit, label: centerSubreddit, x: cx, y: cy, vx: 0, vy: 0, size: 40, isCenter: true },
    ];

    relatedSubreddits.forEach((sub, i) => {
      const angle = (2 * Math.PI * i) / relatedSubreddits.length;
      const radius = 140 + Math.random() * 30;
      nodes.push({
        id: sub.name,
        label: sub.name,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        size: 28,
        isCenter: false,
        subscribers: sub.subscribers,
        description: sub.description,
      });
    });

    const links: GraphLink[] = nodes.slice(1).map(n => ({ source: nodes[0], target: n }));

    nodesRef.current = nodes;
    linksRef.current = links;
    frameRef.current = 0;

    const simulate = () => {
      nodes.forEach(node => {
        if (node.isCenter) return;
        node.vx += (cx - node.x) * 0.0003;
        node.vy += (cy - node.y) * 0.0003;
        nodes.forEach(other => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minD = node.size + other.size + 30;
          if (dist < minD) {
            const f = (minD - dist) / dist * 0.04;
            node.vx += dx * f;
            node.vy += dy * f;
          }
        });
      });

      links.forEach(link => {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ideal = 150;
        const f = (dist - ideal) / dist * 0.015;
        if (!link.target.isCenter) {
          link.target.vx -= dx * f;
          link.target.vy -= dy * f;
        }
      });

      nodes.forEach(node => {
        if (node.isCenter) return;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, width / 2);
      bg.addColorStop(0, 'rgba(15, 23, 42, 1)');
      bg.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      const t = transformRef.current;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // Links
      links.forEach(link => {
        const grad = ctx.createLinearGradient(link.source.x, link.source.y, link.target.x, link.target.y);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
        grad.addColorStop(1, 'rgba(139, 92, 246, 0.4)');
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Traveling particle
        const time = Date.now() * 0.001;
        const pp = (time % 2.5) / 2.5;
        const px = link.source.x + (link.target.x - link.source.x) * pp;
        const py = link.source.y + (link.target.y - link.source.y) * pp;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
      });

      // Nodes
      const hovered = hoveredRef.current;
      nodes.forEach(node => {
        const isHovered = hovered === node;
        const s = isHovered ? node.size * 1.15 : node.size;

        // Glow
        const glow = ctx.createRadialGradient(node.x, node.y, s * 0.3, node.x, node.y, s * 2);
        glow.addColorStop(0, node.isCenter ? 'rgba(59, 130, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, s * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Circle
        const ng = ctx.createRadialGradient(node.x - s * 0.3, node.y - s * 0.3, 0, node.x, node.y, s);
        if (node.isCenter) {
          ng.addColorStop(0, '#3B82F6');
          ng.addColorStop(1, '#1D4ED8');
        } else {
          ng.addColorStop(0, '#8B5CF6');
          ng.addColorStop(1, '#6D28D9');
        }
        ctx.beginPath();
        ctx.arc(node.x, node.y, s, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.stroke();

        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${s * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.isCenter ? '🏠' : '👥', node.x, node.y);

        // Label
        ctx.font = `600 ${node.isCenter ? 12 : 10}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const lbl = `r/${node.label}`;
        const lw = ctx.measureText(lbl).width + 10;
        const ly = node.y + s + 6;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(node.x - lw / 2, ly - 2, lw, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(lbl, node.x, ly + 1);
      });

      ctx.restore();
    };

    const animate = () => {
      frameRef.current++;
      if (frameRef.current < 200) simulate();
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [centerSubreddit, relatedSubreddits, dimensions]);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Related Subreddits Network
          </CardTitle>
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
        <p className="text-xs text-muted-foreground">Click a node to analyze that subreddit • Scroll to zoom</p>
      </CardHeader>
      <CardContent ref={containerRef} className="p-4">
        <div className="rounded-xl overflow-hidden shadow-inner border border-border/50 relative">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full"
          />
          {hoveredNode && (
            <div
              className="absolute z-50 bg-card border border-border rounded-lg shadow-xl px-3 py-2 pointer-events-none max-w-[200px]"
              style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 10 }}
            >
              <p className="font-semibold text-sm">r/{hoveredNode.label}</p>
              {hoveredNode.subscribers != null && (
                <p className="text-xs text-muted-foreground">
                  {hoveredNode.subscribers.toLocaleString()} members
                </p>
              )}
              {hoveredNode.description && (
                <p className="text-xs text-muted-foreground mt-1">{hoveredNode.description}</p>
              )}
              <p className="text-xs text-primary mt-1">Click to analyze</p>
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }} />
            <span className="text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }} />
            <span className="text-muted-foreground">Related</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
