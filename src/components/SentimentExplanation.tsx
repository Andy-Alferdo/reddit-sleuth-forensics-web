import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, AlertTriangle, MessageSquare, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface SentimentKeyword {
  word: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface SentimentExplanation {
  confidence: string;
  reasoning: string;
  key_words: SentimentKeyword[];
  text_length: number;
  prediction_confidence: number;
  word_contributions?: Array<{ word: string; sentiment: string; importance?: number; contribution?: number }>;
  importance_scores?: Array<{ word: string; score: number }>;
  explanation_method?: string;
}

interface SentimentExplanationProps {
  sentiment: string;
  explanation: SentimentExplanation | string;
  text: string;
}

interface DeepAnalysisResponse {
  text: string;
  sentiment: string;
  basic_explanation: SentimentExplanation;
  deep_explanation: {
    reasoning: string;
    word_contributions: Array<{ word: string; sentiment: string; contribution?: number }>;
    importance_scores: Array<{ word: string; score: number }>;
    explanation_method: string;
    analysis_depth: string;
  };
}

export const SentimentExplanation = ({ sentiment, explanation, text }: SentimentExplanationProps) => {
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisResponse | null>(null);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);

  const handleDeepAnalysis = async () => {
    setIsDeepAnalyzing(true);
    try {
      const response = await fetch('http://host.docker.internal:5000/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Deep analysis failed: ${response.statusText}`);
      }

      const result: DeepAnalysisResponse = await response.json();
      setDeepAnalysis(result);
      setShowDeepAnalysis(true);
      toast({
        title: "Deep Analysis Complete",
        description: "Advanced XAI analysis has been performed on this text.",
      });
    } catch (error) {
      console.error('Deep analysis error:', error);
      toast({
        title: "Deep Analysis Failed",
        description: "Could not perform deep analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeepAnalyzing(false);
    }
  };
  const getSentimentColor = (sent: string) => {
    switch (sent?.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getKeywordColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence > 0.9) return { level: 'Very High', color: 'bg-green-500' };
    if (confidence > 0.7) return { level: 'High', color: 'bg-blue-500' };
    if (confidence > 0.5) return { level: 'Moderate', color: 'bg-yellow-500' };
    return { level: 'Low', color: 'bg-red-500' };
  };

  const explanationObj = typeof explanation === 'string' ? null : explanation;
  const confidence = explanationObj?.prediction_confidence || 0;
  const wordContributions = explanationObj?.word_contributions || [];
  const importanceScores = explanationObj?.importance_scores || [];

  return (
    <Card className="mt-4 border-l-4 border-l-blue-500 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          Sentiment Analysis Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Classification Result */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium">Classification:</span>
            <Badge 
              variant="outline" 
              className={`text-sm font-medium px-3 py-1 ${getSentimentColor(sentiment)}`}
            >
              {sentiment?.charAt(0).toUpperCase() + sentiment?.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            {explanationObj?.text_length || text.split(' ').length} words
          </div>
        </div>

        {/* Explanation Method */}
        {explanationObj?.explanation_method && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Method:</span>
              <Badge variant="outline" className="text-xs">
                {explanationObj.explanation_method === 'SHAP' ? '🧠 SHAP' : 
                 explanationObj.explanation_method === 'LIME' ? '🍋 LIME' : '📝 Rule-based'}
              </Badge>
            </div>
            <Button
              onClick={handleDeepAnalysis}
              disabled={isDeepAnalyzing}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              {isDeepAnalyzing ? 'Analyzing...' : 'Deep Analysis'}
            </Button>
          </div>
        )}

        {/* Confidence Score */}
        {explanationObj && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Confidence Score
              </h4>
              <span className="text-sm font-medium">
                {explanationObj.confidence} ({getConfidenceLevel(confidence).level})
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={confidence * 100} 
                className="h-2"
              />
              <div 
                className={`absolute top-0 h-2 w-1 rounded-full ${getConfidenceLevel(confidence).color}`}
                style={{ left: `${confidence * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Reasoning */}
        {explanationObj && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              AI Reasoning
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed bg-gray-50 p-3 rounded-lg border">
              {explanationObj.reasoning}
            </p>
          </div>
        )}

        {/* Word Contributions (SHAP/LIME) */}
        {wordContributions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Word-Level Contributions</h4>
            <div className="space-y-2">
              {wordContributions.slice(0, 8).map((contrib, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{contrib.word}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-1 ${getKeywordColor(contrib.sentiment)}`}
                    >
                      {contrib.sentiment}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {contrib.importance ? `Impact: ${contrib.importance.toFixed(3)}` : 
                       contrib.contribution ? `Score: ${contrib.contribution.toFixed(3)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Indicators (Fallback) */}
        {explanationObj?.key_words && explanationObj.key_words.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Key Indicators</h4>
            <div className="flex flex-wrap gap-2">
              {explanationObj.key_words.map((keyword: SentimentKeyword, index: number) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className={`text-xs px-2 py-1 border ${getKeywordColor(keyword.sentiment)}`}
                >
                  {keyword.word}
                  <span className="ml-1 opacity-60">({keyword.sentiment})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Text Preview */}
        <div>
          <h4 className="font-medium mb-2">Analyzed Text</h4>
          <div className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg border max-h-32 overflow-y-auto">
            {text.length > 200 ? `${text.substring(0, 200)}...` : text}
          </div>
        </div>

        {/* Deep Analysis Results */}
        {showDeepAnalysis && deepAnalysis && (
          <Card className="mt-4 border-l-4 border-l-purple-500 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Deep Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deep Analysis Method */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Deep Method:</span>
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                  {deepAnalysis.deep_explanation.explanation_method === 'LIME' ? '🍋 LIME' : '📝 Enhanced Rule-based'}
                </Badge>
                <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200">
                  {deepAnalysis.deep_explanation.analysis_depth}
                </Badge>
              </div>

              {/* Deep Reasoning */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  Deep AI Reasoning
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed bg-purple-50 p-3 rounded-lg border border-purple-200">
                  {deepAnalysis.deep_explanation.reasoning}
                </p>
              </div>

              {/* Word Contributions from Deep Analysis */}
              {deepAnalysis.deep_explanation.word_contributions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-600" />
                    Word-Level Contributions (Deep Analysis)
                  </h4>
                  <div className="space-y-2">
                    {deepAnalysis.deep_explanation.word_contributions.slice(0, 10).map((contrib, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-200">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{contrib.word}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-1 ${getKeywordColor(contrib.sentiment)}`}
                          >
                            {contrib.sentiment}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {contrib.contribution ? `Score: ${contrib.contribution.toFixed(3)}` : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hide Deep Analysis Button */}
              <Button
                onClick={() => setShowDeepAnalysis(false)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Hide Deep Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
