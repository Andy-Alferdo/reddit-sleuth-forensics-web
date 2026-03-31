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
  fixed?: boolean;
}

interface GraphLink {
  source: GraphNode;
  target: GraphNode;
}

const nodeColors = {
  center: { start: '#3B82F6', end: '#1D4ED8' },
  related: { start: '#8B5CF6', end: '#6D28D9' },
};

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

  // Drag state
  const isDraggingNodeRef = useRef(false);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Pan state
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Context menu & hover
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: GraphNode } | null>(null);
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

  const handleZoom = useCallback((delta: number, cx?: number, cy?: number) => {
    const t = transformRef.current;
    const factor = delta > 0 ? 1.15 : 1 / 1.15;
    const centerX = cx ?? dimensions.width / 2;
    const centerY = cy ?? dimensions.height / 2;
    const newScale = Math.max(0.2, Math.min(5, t.scale * factor));
    t.x = centerX - (centerX - t.x) * (newScale / t.scale);
    t.y = centerY - (centerY - t.y) * (newScale / t.scale);
    t.scale = newScale;
  }, [dimensions]);

  const resetView = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
  }, []);

  const openInReddit = useCallback((node: GraphNode) => {
    window.open(`https://www.reddit.com/r/${node.label}`, '_blank');
  }, []);

  const unpinNode = useCallback((node: GraphNode) => {
    node.fixed = false;
    frameRef.current = 0;
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
      e.preventDefault();
      setContextMenu(null);
      const screenPos = getCanvasCoords(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const node = getNodeAt(worldPos.x, worldPos.y);

      if (node && !node.isCenter) {
        isDraggingNodeRef.current = false;
        dragNodeRef.current = node;
        mouseDownPosRef.current = screenPos;
        frameRef.current = 0;
      } else {
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

      // Hover tooltip
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const hovered = getNodeAt(worldPos.x, worldPos.y);
      setHoveredNode(hovered);
      if (hovered) {
        const rect = canvas.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      canvas.style.cursor = dragNodeRef.current && isDraggingNodeRef.current
        ? 'grabbing'
        : hovered ? 'grab' : (isPanningRef.current ? 'grabbing' : 'default');
    };

    const handleMouseUp = () => {
      if (dragNodeRef.current && isDraggingNodeRef.current) {
        dragNodeRef.current = null;
        frameRef.current = 150;
      }
      dragNodeRef.current = null;
      mouseDownPosRef.current = null;
      isDraggingNodeRef.current = false;
      isPanningRef.current = false;
      panStartRef.current = null;
    };

    const handleDblClick = (e: MouseEvent) => {
      const screenPos = getCanvasCoords(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const node = getNodeAt(worldPos.x, worldPos.y);
      if (node && onSubredditClick) {
        onSubredditClick(node.label);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const screenPos = getCanvasCoords(e);
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      const node = getNodeAt(worldPos.x, worldPos.y);
      if (!node) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, node });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('dblclick', handleDblClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDblClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
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
      { id: centerSubreddit, label: centerSubreddit, x: cx, y: cy, vx: 0, vy: 0, size: 45, isCenter: true },
    ];

    relatedSubreddits.forEach((sub, i) => {
      const angle = (2 * Math.PI * i) / relatedSubreddits.length;
      const radius = 150 + Math.random() * 80;
      nodes.push({
        id: sub.name,
        label: sub.name,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        size: 35,
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
        if (node === dragNodeRef.current || node.fixed) return;
        if (node.isCenter) return;

        node.vx += (cx - node.x) * 0.0005;
        node.vy += (cy - node.y) * 0.0005;

        nodes.forEach(other => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minD = node.size + other.size + 40;
          if (dist < minD) {
            const f = (minD - dist) / dist * 0.05;
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
        const f = (dist - ideal) / dist * 0.02;
        if (!link.target.isCenter && !link.target.fixed && link.target !== dragNodeRef.current) {
          link.target.vx -= dx * f;
          link.target.vy -= dy * f;
        }
        if (!link.source.isCenter && !link.source.fixed && link.source !== dragNodeRef.current) {
          link.source.vx += dx * f;
          link.source.vy += dy * f;
        }
      });

      nodes.forEach(node => {
        if (node.isCenter || node === dragNodeRef.current || node.fixed) return;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, width / 2);
      bg.addColorStop(0, 'rgba(15, 23, 42, 1)');
      bg.addColorStop(1, 'rgba(2, 6, 23, 1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // Ambient particles
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(Date.now() * 0.001 + i * 0.5) + 1) * width / 2;
        const y = (Math.cos(Date.now() * 0.0008 + i * 0.7) + 1) * height / 2;
        const s = 1 + Math.sin(Date.now() * 0.002 + i) * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${0.1 + Math.sin(Date.now() * 0.001 + i) * 0.05})`;
        ctx.fill();
      }

      const t = transformRef.current;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // Links
      links.forEach(link => {
        const gradient = ctx.createLinearGradient(link.source.x, link.source.y, link.target.x, link.target.y);
        gradient.addColorStop(0, nodeColors.center.start + '60');
        gradient.addColorStop(1, nodeColors.related.start + '60');
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
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

      // Nodes
      nodes.forEach(node => {
        const s = node.size;
        const colors = node.isCenter ? nodeColors.center : nodeColors.related;

        // Glow
        const glow = ctx.createRadialGradient(node.x, node.y, s * 0.5, node.x, node.y, s * 2);
        glow.addColorStop(0, colors.start + '40');
        glow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, s * 2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Circle
        const ng = ctx.createRadialGradient(node.x - s * 0.3, node.y - s * 0.3, 0, node.x, node.y, s);
        ng.addColorStop(0, colors.start);
        ng.addColorStop(1, colors.end);
        ctx.beginPath();
        ctx.arc(node.x, node.y, s, 0, Math.PI * 2);
        ctx.fillStyle = ng;
        ctx.fill();

        // Fixed/pinned indicator
        if (node.fixed) {
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.strokeStyle = node.isCenter ? '#ffffff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = node.isCenter ? 3 : 1.5;
        ctx.stroke();

        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${s * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.isCenter ? '🏠' : '👥', node.x, node.y);

        // Label
        ctx.font = `600 ${node.isCenter ? 13 : 11}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const lbl = `r/${node.label}`;
        const lw = ctx.measureText(lbl).width + 12;
        const ly = node.y + s + 8;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(node.x - lw / 2, ly - 2, lw, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(lbl, node.x, ly + 2);
      });

      ctx.restore();

      // Zoom indicator
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
      frameRef.current++;
      if (frameRef.current < 200 || dragNodeRef.current || isPanningRef.current) {
        simulate();
      }
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
        <p className="text-xs text-muted-foreground">Drag nodes freely • Scroll to zoom • Double-click to analyze • Right-click for options</p>
      </CardHeader>
      <CardContent ref={containerRef} className="p-4">
        <div className="rounded-xl overflow-hidden shadow-inner border border-border/50 relative">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full"
          />
          {/* Tooltip on hover */}
          {hoveredNode && !contextMenu && (
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
              <p className="text-xs text-primary mt-1">Double-click to analyze</p>
            </div>
          )}
          {/* Context menu */}
          {contextMenu && (
            <div
              className="absolute z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                onClick={() => { openInReddit(contextMenu.node); setContextMenu(null); }}
              >
                🔗 Open in Reddit
              </button>
              {onSubredditClick && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => { onSubredditClick(contextMenu.node.label); setContextMenu(null); }}
                >
                  🔍 Analyze subreddit
                </button>
              )}
              {contextMenu.node.fixed && (
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => { unpinNode(contextMenu.node); setContextMenu(null); }}
                >
                  🔓 Release node
                </button>
              )}
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                onClick={() => setContextMenu(null)}
              >
                ✕ Close
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }} />
            <span className="text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }} />
            <span className="text-muted-foreground">Related</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-yellow-400" style={{ width: 16, height: 16 }} />
            <span className="text-muted-foreground">Pinned (dragged)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
