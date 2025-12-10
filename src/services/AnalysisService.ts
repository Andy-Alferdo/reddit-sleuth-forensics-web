/**
 * AnalysisService - Handles content analysis operations
 * Implements OOP principles: Encapsulation, Single Responsibility
 */
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from './BaseService';
import { RedditPost, RedditComment } from './RedditService';

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  explanation: string;
  text: string;
}

export interface AnalysisResult {
  sentiment: {
    breakdown: { positive: number; neutral: number; negative: number };
    postBreakdown?: { positive: number; neutral: number; negative: number };
    commentBreakdown?: { positive: number; neutral: number; negative: number };
  };
  postSentiments: SentimentResult[];
  commentSentiments: SentimentResult[];
  locations: string[];
  patterns: {
    topicInterests: string[];
  };
  topSubreddits: Array<{ name: string; activity: number; count: number }>;
  stats: any;
  emotions: any;
}

export interface ActivityPattern {
  mostActiveHour: string;
  mostActiveDay: string;
  timezone: string;
}

export class AnalysisService extends BaseService {
  private static instance: AnalysisService;

  private constructor() {
    super('AnalysisService');
  }

  /**
   * Singleton pattern - ensures only one instance exists
   */
  public static getInstance(): AnalysisService {
    if (!AnalysisService.instance) {
      AnalysisService.instance = new AnalysisService();
    }
    return AnalysisService.instance;
  }

  /**
   * Analyze content for sentiment and patterns
   */
  public async analyzeContent(posts: RedditPost[], comments: RedditComment[]): Promise<AnalysisResult> {
    try {
      await this.initialize();
      this.log('Analyzing content', { postsCount: posts.length, commentsCount: comments.length });

      const { data, error } = await supabase.functions.invoke('analyze-content', {
        body: { posts, comments }
      });

      if (error) {
        this.log('Analysis error, using defaults', { error });
        return this.getDefaultAnalysisResult();
      }

      this.log('Content analysis completed');
      return data as AnalysisResult;

    } catch (error) {
      this.log('Analysis failed, returning defaults', { error });
      return this.getDefaultAnalysisResult();
    }
  }

  /**
   * Calculate activity patterns from posts and comments
   */
  public calculateActivityPatterns(posts: RedditPost[], comments: RedditComment[]): ActivityPattern {
    const allContent = [...posts, ...comments];
    const hourCounts: { [key: number]: number } = {};
    const dayCounts: { [key: string]: number } = {};

    allContent.forEach((item) => {
      const date = new Date(item.created_utc * 1000);
      // Convert to Pakistan timezone
      const pakistanOffset = 5 * 60; // PKT is UTC+5
      const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
      const pktMinutes = utcMinutes + pakistanOffset;
      const pktHour = Math.floor((pktMinutes % 1440) / 60);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = dayNames[date.getUTCDay()];

      hourCounts[pktHour] = (hourCounts[pktHour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const mostActiveHourEntry = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
    const mostActiveDayEntry = Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0];

    return {
      mostActiveHour: mostActiveHourEntry 
        ? `${mostActiveHourEntry[0]}:00-${parseInt(mostActiveHourEntry[0]) + 1}:00 PKT` 
        : 'N/A',
      mostActiveDay: mostActiveDayEntry?.[0] || 'N/A',
      timezone: 'PKT (Pakistan Standard Time)'
    };
  }

  /**
   * Calculate subreddit activity distribution
   */
  public calculateSubredditActivity(posts: RedditPost[], comments: RedditComment[]): Array<{ name: string; activity: number; count: number }> {
    const subredditCounts: { [key: string]: number } = {};

    [...posts, ...comments].forEach((item) => {
      const subreddit = `r/${item.subreddit}`;
      subredditCounts[subreddit] = (subredditCounts[subreddit] || 0) + 1;
    });

    return Object.entries(subredditCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        activity: count,
        count
      }));
  }

  /**
   * Get sentiment color based on sentiment type
   */
  public getSentimentColor(sentiment: string): string {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'negative':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  }

  /**
   * Get default analysis result when API fails
   */
  private getDefaultAnalysisResult(): AnalysisResult {
    return {
      sentiment: {
        breakdown: { positive: 33, neutral: 34, negative: 33 }
      },
      postSentiments: [],
      commentSentiments: [],
      locations: ['No specific locations detected'],
      patterns: {
        topicInterests: ['Analyzing...']
      },
      topSubreddits: [],
      stats: {},
      emotions: {}
    };
  }
}

// Export singleton instance
export const analysisService = AnalysisService.getInstance();
