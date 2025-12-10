import React, { Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Word Data Interface
 */
interface WordData {
  word: string;
  frequency: number;
  category: 'high' | 'medium' | 'low';
}

/**
 * WordCloud Props Interface
 */
interface WordCloudProps {
  words: WordData[];
  title?: string;
}

/**
 * WordCloud Component - Class-based implementation
 * Displays words with varying sizes and colors based on frequency
 */
export class WordCloud extends Component<WordCloudProps> {
  /**
   * Get word size class based on frequency ratio
   */
  private getWordSize(frequency: number, maxFreq: number): string {
    const ratio = frequency / maxFreq;
    if (ratio > 0.7) return 'text-2xl';
    if (ratio > 0.4) return 'text-xl';
    if (ratio > 0.2) return 'text-lg';
    return 'text-base';
  }

  /**
   * Get word color class based on category
   */
  private getWordColor(category: string): string {
    switch (category) {
      case 'high':
        return 'text-red-500 hover:text-red-400';
      case 'medium':
        return 'text-green-500 hover:text-green-400';
      case 'low':
        return 'text-sky-400 hover:text-sky-300';
      default:
        return 'text-sky-400';
    }
  }

  /**
   * Get maximum frequency from words array
   */
  private getMaxFrequency(): number {
    const { words } = this.props;
    return Math.max(...words.map(w => w.frequency));
  }

  /**
   * Render word items
   */
  private renderWords(): JSX.Element[] {
    const { words } = this.props;
    const maxFrequency = this.getMaxFrequency();

    return words.map((wordData, index) => (
      <div
        key={`${wordData.word}-${index}`}
        className={`
          ${this.getWordSize(wordData.frequency, maxFrequency)}
          ${this.getWordColor(wordData.category)}
          font-semibold cursor-pointer transition-all duration-200
          hover:scale-110 select-none
        `}
        title={`Frequency: ${wordData.frequency}`}
      >
        {wordData.word}
      </div>
    ));
  }

  /**
   * Render legend
   */
  private renderLegend(): JSX.Element {
    return (
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
          <div className="w-3 h-3 bg-sky-400 rounded"></div>
          <span>Low</span>
        </div>
      </div>
    );
  }

  /**
   * Main render method
   */
  public render(): JSX.Element {
    const { title = "Word Cloud" } = this.props;

    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px] p-4">
            {this.renderWords()}
          </div>
          {this.renderLegend()}
        </CardContent>
      </Card>
    );
  }
}
