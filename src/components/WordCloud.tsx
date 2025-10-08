import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const getWordSize = (frequency: number, maxFreq: number) => {
    const ratio = frequency / maxFreq;
    if (ratio > 0.7) return 'text-2xl';
    if (ratio > 0.4) return 'text-xl';
    if (ratio > 0.2) return 'text-lg';
    return 'text-base';
  };

  const getWordColor = (category: string) => {
    switch (category) {
      case 'high': return 'text-red-500 hover:text-red-400';
      case 'medium': return 'text-green-500 hover:text-green-400';
      case 'low': return 'text-white hover:text-white/80';
      default: return 'text-white';
    }
  };

  const maxFrequency = Math.max(...words.map(w => w.frequency));

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px] p-4">
          {words.map((wordData, index) => (
            <div
              key={`${wordData.word}-${index}`}
              className={`
                ${getWordSize(wordData.frequency, maxFrequency)}
                ${getWordColor(wordData.category)}
                font-semibold cursor-pointer transition-all duration-200
                hover:scale-110 select-none
              `}
              title={`Frequency: ${wordData.frequency}`}
            >
              {wordData.word}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>High Frequency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded"></div>
            <span>Low</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};