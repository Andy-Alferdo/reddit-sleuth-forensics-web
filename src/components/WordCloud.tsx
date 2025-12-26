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
  // Ensure all 3 colors are present by reassigning categories based on thirds
  const styledWords = useMemo(() => {
    if (words.length === 0) return [];
    
    // Sort by frequency descending
    const sorted = [...words].sort((a, b) => b.frequency - a.frequency);
    const maxFreq = sorted[0]?.frequency || 1;
    
    // Divide into thirds for color distribution
    const highThreshold = Math.ceil(sorted.length / 3);
    const mediumThreshold = Math.ceil((sorted.length * 2) / 3);
    
    return sorted.map((wordData, index) => {
      // Assign category based on position in sorted list (ensures all 3 colors)
      let category: 'high' | 'medium' | 'low';
      if (index < highThreshold) {
        category = 'high';
      } else if (index < mediumThreshold) {
        category = 'medium';
      } else {
        category = 'low';
      }
      
      // Calculate font size based on frequency
      const ratio = wordData.frequency / maxFreq;
      let fontSize: number;
      let fontWeight: string;
      
      if (ratio > 0.8) {
        fontSize = 42;
        fontWeight = 'font-black';
      } else if (ratio > 0.6) {
        fontSize = 34;
        fontWeight = 'font-extrabold';
      } else if (ratio > 0.45) {
        fontSize = 26;
        fontWeight = 'font-bold';
      } else if (ratio > 0.3) {
        fontSize = 20;
        fontWeight = 'font-semibold';
      } else if (ratio > 0.15) {
        fontSize = 16;
        fontWeight = 'font-medium';
      } else {
        fontSize = 13;
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
          color = '#0284c7'; // sky-600
          break;
      }

      // Slight random rotation for organic look
      const rotations = [-8, -4, -2, 0, 0, 0, 2, 4, 6];
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

  // Shuffle for visual variety while keeping size prominence
  const shuffledWords = useMemo(() => {
    const result = [...styledWords];
    // Interleave: take from start and end alternately
    const interleaved: typeof result = [];
    let left = 0;
    let right = result.length - 1;
    while (left <= right) {
      if (left === right) {
        interleaved.push(result[left]);
      } else {
        interleaved.push(result[left]);
        interleaved.push(result[right]);
      }
      left++;
      right--;
    }
    return interleaved;
  }, [styledWords]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-center text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0 min-h-[200px] px-4 py-6"
          style={{ lineHeight: '1.1' }}
        >
          {shuffledWords.map((wordData, index) => (
            <span
              key={`${wordData.word}-${index}`}
              className={`
                ${wordData.fontWeight}
                cursor-default transition-opacity duration-200
                hover:opacity-70 select-none whitespace-nowrap
              `}
              style={{
                fontSize: `${wordData.fontSize}px`,
                color: wordData.color,
                transform: `rotate(${wordData.rotation}deg)`,
                marginTop: `${(index % 3) * 2 - 2}px`,
                display: 'inline-block',
              }}
              title={`Frequency: ${wordData.frequency}`}
            >
              {wordData.word}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs border-t pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full"></div>
            <span className="text-muted-foreground">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>
            <span className="text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-sky-600 rounded-full"></div>
            <span className="text-muted-foreground">Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};