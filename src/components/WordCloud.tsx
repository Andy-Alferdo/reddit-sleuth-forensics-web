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
}

const COLORS = {
  high: ['#b91c1c', '#dc2626', '#991b1b'],
  medium: ['#1a1a1a', '#374151', '#4b5563'],
  low: ['#6b7280', '#9ca3af', '#78716c'],
};

export const WordCloud = ({ words, title = "Word Cloud" }: WordCloudProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sortedWords = useMemo(() => {
    if (words.length === 0) return [];
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency);
    const maxFreq = sorted[0]?.frequency || 1;
    const highT = Math.ceil(sorted.length / 3);
    const medT = Math.ceil((sorted.length * 2) / 3);

    return sorted.map((w, i) => {
      const category = i < highT ? 'high' : i < medT ? 'medium' : 'low';
      const palette = COLORS[category];
      const color = palette[i % palette.length];
      const ratio = w.frequency / maxFreq;
      return { ...w, ratio, color, category };
    });
  }, [words]);

  const layoutWords = useCallback(() => {
    if (sortedWords.length === 0 || dimensions.width === 0) return;

    const W = dimensions.width;
    const H = dimensions.height;
    const cx = W / 2;
    const cy = H / 2;

    // Font size range scaled to container
    const minFont = Math.max(10, W * 0.022);
    const maxFont = Math.min(52, W * 0.1);

    const placed: PlacedWord[] = [];
    const occupied: { x: number; y: number; w: number; h: number }[] = [];

    const collides = (x: number, y: number, w: number, h: number) => {
      for (const r of occupied) {
        if (!(x + w < r.x || x > r.x + r.w || y + h < r.y || y > r.y + r.h)) return true;
      }
      return false;
    };

    for (const word of sortedWords) {
      const fontSize = minFont + (maxFont - minFont) * Math.pow(word.ratio, 0.6);
      const fontWeight = word.ratio > 0.6 ? 900 : word.ratio > 0.3 ? 700 : 500;

      // Estimate bounding box
      const charW = fontSize * 0.58;
      const wordW = word.word.length * charW;
      const wordH = fontSize * 1.1;

      let bestX = cx - wordW / 2;
      let bestY = cy - wordH / 2;
      let found = false;

      // Spiral placement
      for (let r = 0; r < Math.max(W, H); r += 3) {
        const steps = Math.max(6, Math.floor(r * 0.8));
        for (let a = 0; a < steps; a++) {
          const angle = (a / steps) * Math.PI * 2;
          const tx = cx + r * Math.cos(angle) * 1.3 - wordW / 2;
          const ty = cy + r * Math.sin(angle) * 0.85 - wordH / 2;

          if (tx < 2 || tx + wordW > W - 2 || ty < 2 || ty + wordH > H - 2) continue;
          if (!collides(tx, ty, wordW, wordH)) {
            bestX = tx;
            bestY = ty;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      if (found) {
        occupied.push({ x: bestX, y: bestY, w: wordW, h: wordH });
        placed.push({
          word: word.word,
          frequency: word.frequency,
          x: bestX,
          y: bestY,
          fontSize,
          color: word.color,
          fontWeight,
        });
      }
    }

    setPlacedWords(placed);
  }, [sortedWords, dimensions]);

  useEffect(() => { layoutWords(); }, [layoutWords]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4">
        <div
          ref={containerRef}
          className="relative w-full overflow-hidden"
          style={{ height: 280 }}
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
                lineHeight: 1,
                fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
                textTransform: w.fontSize > 30 ? 'uppercase' : 'none',
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
