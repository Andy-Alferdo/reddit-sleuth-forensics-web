/**
 * RedditService - Handles all Reddit API interactions
 * Implements OOP principles: Encapsulation, Single Responsibility
 */
import { supabase } from '@/integrations/supabase/client';
import { BaseService } from './BaseService';

export interface RedditUser {
  name: string;
  link_karma: number;
  comment_karma: number;
  created_utc: number;
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
  author: string;
}

export interface RedditComment {
  id: string;
  body: string;
  subreddit: string;
  created_utc: number;
  score: number;
  permalink: string;
}

export interface UserProfileResult {
  user: RedditUser;
  posts: RedditPost[];
  comments: RedditComment[];
}

export interface CommunityResult {
  subreddit: any;
  posts: RedditPost[];
  weeklyVisitors: number;
  activeUsers: number;
}

export class RedditService extends BaseService {
  private static instance: RedditService;

  private constructor() {
    super('RedditService');
  }

  /**
   * Singleton pattern - ensures only one instance exists
   */
  public static getInstance(): RedditService {
    if (!RedditService.instance) {
      RedditService.instance = new RedditService();
    }
    return RedditService.instance;
  }

  /**
   * Fetch user profile data from Reddit
   */
  public async fetchUserProfile(username: string): Promise<UserProfileResult> {
    try {
      await this.initialize();
      const cleanUsername = this.cleanUsername(username);
      
      this.log('Fetching user profile', { username: cleanUsername });

      const { data, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          username: cleanUsername,
          type: 'user'
        }
      });

      if (error) {
        this.handleError(error, 'fetchUserProfile');
      }

      if (data?.error === 'not_found') {
        throw new Error(data.message || `User "${cleanUsername}" not found`);
      }

      this.log('User profile fetched successfully', { username: cleanUsername });
      return data as UserProfileResult;

    } catch (error) {
      this.handleError(error, 'fetchUserProfile');
    }
  }

  /**
   * Fetch community/subreddit data from Reddit
   */
  public async fetchCommunity(subredditName: string): Promise<CommunityResult> {
    try {
      await this.initialize();
      const cleanSubreddit = this.cleanSubreddit(subredditName);
      
      this.log('Fetching community data', { subreddit: cleanSubreddit });

      const { data, error } = await supabase.functions.invoke('reddit-scraper', {
        body: { 
          subreddit: cleanSubreddit,
          type: 'community'
        }
      });

      if (error) {
        this.handleError(error, 'fetchCommunity');
      }

      if (data?.error === 'not_found') {
        throw new Error(data.message || `Subreddit "r/${cleanSubreddit}" not found`);
      }

      this.log('Community data fetched successfully', { subreddit: cleanSubreddit });
      return data as CommunityResult;

    } catch (error) {
      this.handleError(error, 'fetchCommunity');
    }
  }

  /**
   * Calculate account age from creation timestamp
   */
  public calculateAccountAge(createdUtc: number): string {
    const accountCreated = new Date(createdUtc * 1000);
    const now = new Date();
    const ageInYears = (now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const years = Math.floor(ageInYears);
    const months = Math.floor((ageInYears - years) * 12);
    return `${years} years, ${months} months`;
  }

  /**
   * Extract unique subreddits from posts and comments
   */
  public extractUniqueSubreddits(posts: RedditPost[], comments: RedditComment[]): Set<string> {
    return new Set([
      ...posts.map(p => p.subreddit),
      ...comments.map(c => c.subreddit)
    ]);
  }

  /**
   * Generate word frequency data from content
   */
  public generateWordCloud(posts: RedditPost[], comments: RedditComment[]): Array<{ word: string; frequency: number; category: 'high' | 'medium' | 'low' }> {
    const stopWords = ['that', 'this', 'with', 'from', 'have', 'been', 'will', 'your', 'their', 'what', 'when', 'where'];
    
    const textContent = [
      ...posts.map(p => `${p.title} ${p.selftext}`),
      ...comments.map(c => c.body)
    ].join(' ');

    const words = textContent.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordFreq: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word, freq]) => ({
        word,
        frequency: freq,
        category: freq > 30 ? 'high' as const : freq > 15 ? 'medium' as const : 'low' as const
      }));
  }

  /**
   * Clean username - remove u/ prefix
   */
  private cleanUsername(username: string): string {
    return username.replace(/^u\//, '');
  }

  /**
   * Clean subreddit name - remove r/ prefix
   */
  private cleanSubreddit(subreddit: string): string {
    return subreddit.replace(/^r\//, '');
  }
}

// Export singleton instance
export const redditService = RedditService.getInstance();
