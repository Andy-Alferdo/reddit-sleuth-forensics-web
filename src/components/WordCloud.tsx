import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

interface WordData {
  word: string;
  frequency: number;
  category: 'high' | 'medium' | 'low';
}

interface WordCloudProps {
  words: WordData[];
  title?: string;
}

export const WordCloud = ({ words, title = "Word Cloud" }: WordCloudProps) => {
  const styledWords = useMemo(() => {
    if (words.length === 0) return [];
    
    // Sort by frequency descending
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency);
    const maxFreq = sorted[0]?.frequency || 1;
    
    // Divide into thirds for color distribution
    const highThreshold = Math.ceil(sorted.length / 3);
    const mediumThreshold = Math.ceil((sorted.length * 2) / 3);
    
    return sorted.map((wordData, index) => {
      // Assign category based on position (ensures all 3 colors present)
      let category: 'high' | 'medium' | 'low';
      if (index < highThreshold) {
        category = 'high';
      } else if (index < mediumThreshold) {
        category = 'medium';
      } else {
        category = 'low';
      }
      
      // Calculate font size based on frequency - wider range for more visual impact
      const ratio = wordData.frequency / maxFreq;
      let fontSize: number;
      let fontWeight: string;
      
      if (ratio > 0.85) {
        fontSize = 48;
        fontWeight = 'font-black';
      } else if (ratio > 0.7) {
        fontSize = 38;
        fontWeight = 'font-extrabold';
      } else if (ratio > 0.55) {
        fontSize = 30;
        fontWeight = 'font-bold';
      } else if (ratio > 0.4) {
        fontSize = 24;
        fontWeight = 'font-bold';
      } else if (ratio > 0.25) {
        fontSize = 18;
        fontWeight = 'font-semibold';
      } else if (ratio > 0.12) {
        fontSize = 14;
        fontWeight = 'font-medium';
      } else {
        fontSize = 11;
        fontWeight = 'font-medium';
      }

      // Colors: Red for high, Green for medium, Blue for low
      let color: string;
      switch (category) {
        case 'high':
          color = '#dc2626'; // red-600
          break;
        case 'medium':
          color = '#16a34a'; // green-600
          break;
        case 'low':
          color = '#0369a1'; // sky-700
          break;
      }

      // Varied rotations for organic cloud look
      const rotations = [-15, -8, -3, 0, 0, 0, 0, 3, 8, 12];
      const rotation = rotations[index % rotations.length];

      return {
        ...wordData,
        category,
        fontSize,
        fontWeight,
        color,
        rotation,
      };
    });
  }, [words]);

  // Create a more organic layout by interleaving sizes
  const arrangedWords = useMemo(() => {
    if (styledWords.length === 0) return [];
    
    const result: typeof styledWords = [];
    const large = styledWords.filter(w => w.fontSize >= 30);
    const medium = styledWords.filter(w => w.fontSize >= 18 && w.fontSize < 30);
    const small = styledWords.filter(w => w.fontSize < 18);
    
    // Interleave: large words first, then mix medium and small around them
    let li = 0, mi = 0, si = 0;
    
    while (li < large.length || mi < medium.length || si < small.length) {
      if (li < large.length) result.push(large[li++]);
      if (si < small.length) result.push(small[si++]);
      if (mi < medium.length) result.push(medium[mi++]);
      if (si < small.length) result.push(small[si++]);
      if (mi < medium.length) result.push(medium[mi++]);
    }
    
    return result;
  }, [styledWords]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        <div 
          className="flex flex-wrap items-center justify-center min-h-[220px] py-4 leading-none"
          style={{ 
            gap: '2px 6px',
            wordSpacing: '-2px',
          }}
        >
          {arrangedWords.map((wordData, index) => (
            <span
              key={`${wordData.word}-${index}`}
              className={`
                ${wordData.fontWeight}
                cursor-default transition-opacity duration-150
                hover:opacity-60 select-none
              `}
              style={{
                fontSize: `${wordData.fontSize}px`,
                color: wordData.color,
                transform: `rotate(${wordData.rotation}deg)`,
                lineHeight: '1',
                display: 'inline-block',
                margin: `${Math.abs(wordData.rotation) > 5 ? 4 : 0}px 0`,
              }}
              title={`${wordData.word}: ${wordData.frequency}`}
            >
              {wordData.word}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-5 mt-2 text-xs border-t pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
            <span className="text-muted-foreground">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#16a34a' }}></div>
            <span className="text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#0369a1' }}></div>
            <span className="text-muted-foreground">Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};