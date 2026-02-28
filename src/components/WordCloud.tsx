import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useRef, useEffect, useState, useCallback } from 'react';

interface WordData {
  word: string;
  frequency: number;
  category: 'high' | 'medium' | 'low';
}

interface WordCloudProps {
  words: WordData[];
  title?: string;
}

interface PlacedWord {
  word: string;
  frequency: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: number;
  vertical: boolean;
}

const PALETTE_HIGH = ['#b91c1c', '#dc2626', '#991b1b', '#c53030'];
const PALETTE_MED = ['#1a1a1a', '#292524', '#44403c', '#1c1917'];
const PALETTE_LOW = ['#78716c', '#a8a29e', '#6b7280', '#9ca3af'];

// Simple seeded random for deterministic layouts
const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export const WordCloud = ({ words, title = "Word Cloud" }: WordCloudProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 50 && height > 50) setDims({ w: Math.floor(width), h: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sortedWords = useMemo(() => {
    if (!words.length) return [];
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency).slice(0, 50);
    const maxFreq = sorted[0]?.frequency || 1;
    const t1 = Math.ceil(sorted.length / 3);
    const t2 = Math.ceil((sorted.length * 2) / 3);
    return sorted.map((w, i) => {
      const cat = i < t1 ? 'high' : i < t2 ? 'medium' : 'low';
      const pal = cat === 'high' ? PALETTE_HIGH : cat === 'medium' ? PALETTE_MED : PALETTE_LOW;
      return { ...w, ratio: w.frequency / maxFreq, color: pal[i % pal.length], category: cat };
    });
  }, [words]);

  const layout = useCallback(() => {
    if (!sortedWords.length || dims.w === 0) return;

    const W = dims.w;
    const H = dims.h;
    const cx = W / 2;
    const cy = H / 2;

    // Use a pixel grid for collision detection (scaled down for perf)
    const SCALE = 2; // each grid cell = 2px
    const gw = Math.ceil(W / SCALE);
    const gh = Math.ceil(H / SCALE);
    const grid = new Uint8Array(gw * gh);

    const isOccupied = (gx: number, gy: number, bw: number, bh: number): boolean => {
      for (let y = gy; y < gy + bh && y < gh; y++) {
        for (let x = gx; x < gx + bw && x < gw; x++) {
          if (grid[y * gw + x]) return true;
        }
      }
      return false;
    };

    const markOccupied = (gx: number, gy: number, bw: number, bh: number) => {
      for (let y = gy; y < gy + bh && y < gh; y++) {
        for (let x = gx; x < gx + bw && x < gw; x++) {
          grid[y * gw + x] = 1;
        }
      }
    };

    // Measure text using offscreen canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minFont = Math.max(8, W * 0.016);
    const maxFont = Math.min(64, W * 0.14);
    const rng = seededRandom(42);

    const placed: PlacedWord[] = [];

    for (const word of sortedWords) {
      // Aggressive power curve: top words are MUCH bigger
      const fontSize = minFont + (maxFont - minFont) * Math.pow(word.ratio, 0.35);
      const fontWeight = word.ratio > 0.6 ? 900 : word.ratio > 0.3 ? 700 : 400;
      const vertical = rng() < 0.25;

      ctx.font = `${fontWeight} ${fontSize}px Arial, Helvetica, sans-serif`;
      const metrics = ctx.measureText(word.word.toUpperCase());
      const textW = metrics.width + 4;
      const textH = fontSize * 1.15;

      // For vertical words, swap width/height
      const boxW = vertical ? textH : textW;
      const boxH = vertical ? textW : textH;

      const gbw = Math.ceil(boxW / SCALE);
      const gbh = Math.ceil(boxH / SCALE);

      let bestX = -1;
      let bestY = -1;
      let found = false;

      // Spiral outward from center
      const maxR = Math.max(W, H) * 0.7;
      for (let r = 0; r < maxR && !found; r += 2) {
        const steps = Math.max(8, Math.floor(r * 1.2));
        const startAngle = rng() * Math.PI * 2;
        for (let s = 0; s < steps && !found; s++) {
          const angle = startAngle + (s / steps) * Math.PI * 2;
          const px = Math.round(cx + r * Math.cos(angle) * 1.4 - boxW / 2);
          const py = Math.round(cy + r * Math.sin(angle) * 0.9 - boxH / 2);

          if (px < 0 || py < 0 || px + boxW > W || py + boxH > H) continue;

          const gx = Math.floor(px / SCALE);
          const gy = Math.floor(py / SCALE);

          if (!isOccupied(gx, gy, gbw, gbh)) {
            bestX = px;
            bestY = py;
            found = true;
          }
        }
      }

      if (found) {
        markOccupied(Math.floor(bestX / SCALE), Math.floor(bestY / SCALE), gbw, gbh);
        placed.push({
          word: word.word,
          frequency: word.frequency,
          x: bestX,
          y: bestY,
          fontSize,
          color: word.color,
          fontWeight,
          vertical,
        });
      }
    }

    setPlacedWords(placed);
  }, [sortedWords, dims]);

  useEffect(() => { layout(); }, [layout]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <canvas ref={canvasRef} width={0} height={0} className="hidden" />
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={{ height: 300 }}
        >
          {placedWords.map((w, i) => (
            <span
              key={`${w.word}-${i}`}
              className="absolute cursor-default select-none hover:opacity-60 transition-opacity whitespace-nowrap leading-none"
              style={{
                left: w.x,
                top: w.y,
                fontSize: w.fontSize,
                fontWeight: w.fontWeight,
                color: w.color,
                fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
                textTransform: 'uppercase',
                ...(w.vertical
                  ? {
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                    }
                  : {}),
              }}
              title={`${w.word}: ${w.frequency}`}
            >
              {w.word}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
