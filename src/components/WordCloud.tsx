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

// Rich color palette like the reference image
const COLORS = [
  '#b91c1c', '#dc2626', '#991b1b',   // reds (high)
  '#c2410c', '#ea580c',               // orange-red
  '#1a1a1a', '#292524', '#374151',     // dark (medium)
  '#854d0e', '#a16207',               // gold/olive
  '#15803d', '#166534',               // greens
  '#0e7490', '#0369a1',               // teals/blues
  '#78716c', '#6b7280', '#9ca3af',    // grays (low)
];

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
    return [...words].sort((a, b) => b.frequency - a.frequency).slice(0, 80);
  }, [words]);

  const layout = useCallback(() => {
    if (!sortedWords.length || dims.w === 0) return;

    const W = dims.w;
    const H = dims.h;
    const cx = W / 2;
    const cy = H / 2;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use ImageData for pixel-level collision detection
    const imageData = ctx.createImageData(W, H);
    const pixels = imageData.data;

    const isAreaFree = (x: number, y: number, w: number, h: number): boolean => {
      const x0 = Math.max(0, Math.floor(x));
      const y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(W, Math.ceil(x + w));
      const y1 = Math.min(H, Math.ceil(y + h));
      for (let py = y0; py < y1; py += 2) {
        for (let px = x0; px < x1; px += 2) {
          if (pixels[(py * W + px) * 4 + 3] > 0) return false;
        }
      }
      return true;
    };

    const markArea = (x: number, y: number, w: number, h: number) => {
      const x0 = Math.max(0, Math.floor(x));
      const y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(W, Math.ceil(x + w));
      const y1 = Math.min(H, Math.ceil(y + h));
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          pixels[(py * W + px) * 4 + 3] = 255;
        }
      }
    };

    const maxFreq = sortedWords[0]?.frequency || 1;
    const minFreq = sortedWords[sortedWords.length - 1]?.frequency || 1;

    // Dramatic font range
    const maxFont = Math.min(72, W * 0.16);
    const minFont = Math.max(7, W * 0.013);

    const rng = seededRandom(42);
    const placed: PlacedWord[] = [];

    for (let i = 0; i < sortedWords.length; i++) {
      const word = sortedWords[i];
      const ratio = maxFreq === minFreq ? 1 : (word.frequency - minFreq) / (maxFreq - minFreq);

      // Very steep curve: biggest word is HUGE, small words are tiny
      const fontSize = Math.round(minFont + (maxFont - minFont) * Math.pow(ratio, 0.25));
      const fontWeight = ratio > 0.5 ? 900 : ratio > 0.2 ? 700 : ratio > 0.08 ? 500 : 400;

      // Color assignment: high freq = reds, med = darks/warm, low = grays
      let colorIdx: number;
      if (ratio > 0.5) colorIdx = Math.floor(rng() * 5); // reds + oranges
      else if (ratio > 0.15) colorIdx = 5 + Math.floor(rng() * 6); // darks + warm + greens
      else colorIdx = 11 + Math.floor(rng() * 5); // teals + grays
      const color = COLORS[colorIdx % COLORS.length];

      // ~30% vertical for smaller words, less for big
      const vertical = fontSize < maxFont * 0.4 && rng() < 0.3;

      ctx.font = `${fontWeight} ${fontSize}px Arial, Helvetica, sans-serif`;
      const label = word.word.toUpperCase();
      const tm = ctx.measureText(label);
      const textW = Math.ceil(tm.width);
      const textH = Math.ceil(fontSize * 1.05);

      const pad = fontSize < 12 ? 1 : fontSize < 20 ? 2 : 3;
      const boxW = (vertical ? textH : textW) + pad * 2;
      const boxH = (vertical ? textW : textH) + pad * 2;

      let found = false;

      // Spiral placement from center
      const step = Math.max(1, Math.round(fontSize * 0.1));
      const maxR = Math.max(W, H) * 0.55;
      for (let r = 0; r < maxR && !found; r += step) {
        const nSteps = Math.max(16, Math.floor(r * 2.5));
        const startA = rng() * Math.PI * 2;
        for (let s = 0; s < nSteps && !found; s++) {
          const a = startA + (s / nSteps) * Math.PI * 2;
          const px = Math.round(cx + r * Math.cos(a) * 1.6 - boxW / 2);
          const py = Math.round(cy + r * Math.sin(a) * 0.85 - boxH / 2);

          if (px < 0 || py < 0 || px + boxW > W || py + boxH > H) continue;

          if (isAreaFree(px, py, boxW, boxH)) {
            markArea(px, py, boxW, boxH);
            placed.push({
              word: word.word,
              frequency: word.frequency,
              x: px + pad,
              y: py + pad,
              fontSize,
              color,
              fontWeight,
              vertical,
            });
            found = true;
          }
        }
      }
    }

    setPlacedWords(placed);
  }, [sortedWords, dims]);

  useEffect(() => { layout(); }, [layout]);

  if (!words.length) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <canvas ref={canvasRef} className="hidden" />
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
                letterSpacing: w.fontSize > 40 ? '-0.03em' : w.fontSize > 20 ? '-0.01em' : '0',
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
