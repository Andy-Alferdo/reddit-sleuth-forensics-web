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
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency).slice(0, 60);
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

    // Pixel grid for collision (1px resolution for tight packing)
    const grid = new Uint8Array(W * H);

    const isOccupied = (px: number, py: number, bw: number, bh: number): boolean => {
      const x0 = Math.max(0, px);
      const y0 = Math.max(0, py);
      const x1 = Math.min(W, px + bw);
      const y1 = Math.min(H, py + bh);
      for (let y = y0; y < y1; y++) {
        const row = y * W;
        for (let x = x0; x < x1; x++) {
          if (grid[row + x]) return true;
        }
      }
      return false;
    };

    const markOccupied = (px: number, py: number, bw: number, bh: number) => {
      const x0 = Math.max(0, px);
      const y0 = Math.max(0, py);
      const x1 = Math.min(W, px + bw);
      const y1 = Math.min(H, py + bh);
      for (let y = y0; y < y1; y++) {
        const row = y * W;
        for (let x = x0; x < x1; x++) {
          grid[row + x] = 1;
        }
      }
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dramatic size range: biggest word ~3-4x the size of medium words
    const minFont = Math.max(7, W * 0.014);
    const maxFont = Math.min(72, W * 0.15);
    const rng = seededRandom(42);

    const placed: PlacedWord[] = [];

    for (let i = 0; i < sortedWords.length; i++) {
      const word = sortedWords[i];
      // Very steep curve: index 0 gets full size, drops fast
      const fontSize = Math.round(minFont + (maxFont - minFont) * Math.pow(word.ratio, 0.3));
      const fontWeight = word.ratio > 0.6 ? 900 : word.ratio > 0.3 ? 700 : 400;
      // More vertical words for smaller text, less for big words
      const vertical = word.ratio < 0.8 && rng() < 0.3;

      ctx.font = `${fontWeight} ${fontSize}px Arial, Helvetica, sans-serif`;
      const textLabel = word.word.toUpperCase();
      const metrics = ctx.measureText(textLabel);
      const rawW = Math.ceil(metrics.width);
      const rawH = Math.ceil(fontSize * 1.05);

      // Padding: tighter for small words
      const pad = fontSize < 14 ? 1 : 2;
      const boxW = (vertical ? rawH : rawW) + pad * 2;
      const boxH = (vertical ? rawW : rawH) + pad * 2;

      let bestX = -1;
      let bestY = -1;
      let found = false;

      // Spiral from center, tighter steps for small words
      const step = Math.max(1, Math.floor(fontSize * 0.15));
      const maxR = Math.max(W, H) * 0.6;
      for (let r = 0; r < maxR && !found; r += step) {
        const steps = Math.max(12, Math.floor(r * 2));
        const startAngle = rng() * Math.PI * 2;
        for (let s = 0; s < steps && !found; s++) {
          const angle = startAngle + (s / steps) * Math.PI * 2;
          // Wider horizontal spread
          const px = Math.round(cx + r * Math.cos(angle) * 1.5 - boxW / 2);
          const py = Math.round(cy + r * Math.sin(angle) - boxH / 2);

          if (px < 0 || py < 0 || px + boxW > W || py + boxH > H) continue;

          if (!isOccupied(px, py, boxW, boxH)) {
            bestX = px + pad;
            bestY = py + pad;
            found = true;
            markOccupied(px, py, boxW, boxH);
          }
        }
      }

      if (found) {
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
          style={{ height: 320 }}
        >
          {placedWords.map((w, i) => (
            <span
              key={`${w.word}-${i}`}
              className="absolute cursor-default select-none hover:opacity-60 transition-opacity whitespace-nowrap"
              style={{
                left: w.x,
                top: w.y,
                fontSize: w.fontSize,
                fontWeight: w.fontWeight,
                color: w.color,
                lineHeight: 1.05,
                fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
                textTransform: 'uppercase',
                letterSpacing: w.fontSize > 30 ? '-0.02em' : '0',
                ...(w.vertical
                  ? { writingMode: 'vertical-rl', textOrientation: 'mixed' }
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
