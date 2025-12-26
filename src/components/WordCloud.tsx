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
  const maxFrequency = Math.max(...words.map(w => w.frequency), 1);

  // Create randomized positions and rotations for each word
  const styledWords = useMemo(() => {
    return words.map((wordData, index) => {
      // Calculate font size based on frequency ratio
      const ratio = wordData.frequency / maxFrequency;
      let fontSize: string;
      if (ratio > 0.7) {
        fontSize = 'text-3xl md:text-4xl';
      } else if (ratio > 0.5) {
        fontSize = 'text-2xl md:text-3xl';
      } else if (ratio > 0.3) {
        fontSize = 'text-xl md:text-2xl';
      } else if (ratio > 0.15) {
        fontSize = 'text-lg md:text-xl';
      } else {
        fontSize = 'text-base md:text-lg';
      }

      // Determine color based on category
      let color: string;
      switch (wordData.category) {
        case 'high':
          color = 'text-red-500';
          break;
        case 'medium':
          color = 'text-green-500';
          break;
        case 'low':
          color = 'text-sky-500';
          break;
        default:
          color = 'text-sky-500';
      }

      // Random slight rotation for variety (-5 to 5 degrees)
      const rotation = (index % 5) * 2 - 4;
      
      // Random vertical offset for scattered look
      const verticalOffset = ((index * 7) % 20) - 10;

      return {
        ...wordData,
        fontSize,
        color,
        rotation,
        verticalOffset,
      };
    });
  }, [words, maxFrequency]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center items-center min-h-[250px] p-6">
          {styledWords.map((wordData, index) => (
            <span
              key={`${wordData.word}-${index}`}
              className={`
                ${wordData.fontSize}
                ${wordData.color}
                font-bold cursor-default transition-all duration-200
                hover:scale-110 hover:opacity-80 select-none whitespace-nowrap
              `}
              style={{
                transform: `rotate(${wordData.rotation}deg) translateY(${wordData.verticalOffset}px)`,
              }}
              title={`Frequency: ${wordData.frequency}`}
            >
              {wordData.word}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm border-t pt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-muted-foreground">High Frequency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
            <span className="text-muted-foreground">Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};