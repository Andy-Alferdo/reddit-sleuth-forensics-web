/**
 * Reddit Scraper API Client
 * ==========================
 * Frontend client for the local Python Reddit scraper server.
 * Falls back to Edge Function when local server is unavailable.
 */

import { supabase } from '@/integrations/supabase/client';

// Local scraper server URL (Python Flask server)
const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:5001';

// Toggle for using local scraper vs Edge Function
const USE_LOCAL_SCRAPER = import.meta.env.VITE_USE_LOCAL_SCRAPER === 'true';

interface ScraperResponse {
  user?: {
    name: string;
    link_karma: number;
    comment_karma: number;
    created_utc: number;
  };
  posts?: Array<{
    title: string;
    selftext: string;
    subreddit: string;
    created_utc: number;
    score: number;
    num_comments: number;
    url: string;
    permalink: string;
    author: string;
  }>;
  comments?: Array<{
    body: string;
    subreddit: string;
    created_utc: number;
    score: number;
    link_title: string;
    permalink: string;
  }>;
  subreddit?: {
    display_name: string;
    display_name_prefixed: string;
    subscribers: number;
    accounts_active: number;
    active_user_count: number;
    public_description: string;
    created_utc: number;
  };
  communityRelations?: Array<{
    subreddit: string;
    relatedTo: string[];
  }>;
  weeklyVisitors?: number;
  activeUsers?: number;
  keyword?: string;
  error?: string;
  message?: string;
}

/**
 * Check if the local scraper server is available
 */
async function isLocalScraperAvailable(): Promise<boolean> {
  if (!USE_LOCAL_SCRAPER) return false;
  
  try {
    const response = await fetch(`${SCRAPER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Scrape Reddit data using local Python server
 */
async function scrapeWithLocalServer(body: Record<string, any>): Promise<ScraperResponse> {
  const response = await fetch(`${SCRAPER_URL}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Scraper error: ${response.status}`);
  }

  return data;
}

/**
 * Scrape Reddit data using Supabase Edge Function (fallback)
 */
async function scrapeWithEdgeFunction(body: Record<string, any>): Promise<ScraperResponse> {
  const { data, error } = await supabase.functions.invoke('reddit-scraper', { body });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Main scraping function - uses local server if available, falls back to Edge Function
 */
export async function scrapeReddit(params: {
  type: 'user' | 'community' | 'search';
  username?: string;
  subreddit?: string;
  keyword?: string;
}): Promise<ScraperResponse> {
  const body = {
    type: params.type,
    username: params.username,
    subreddit: params.subreddit,
    keyword: params.keyword,
  };

  // Try local scraper first if enabled
  if (USE_LOCAL_SCRAPER) {
    const localAvailable = await isLocalScraperAvailable();
    if (localAvailable) {
      console.log('Using local Reddit scraper server');
      return scrapeWithLocalServer(body);
    }
    console.log('Local scraper unavailable, falling back to Edge Function');
  }

  // Fallback to Edge Function
  console.log('Using Edge Function for Reddit scraping');
  return scrapeWithEdgeFunction(body);
}

/**
 * Scrape a Reddit user's profile, posts, and comments
 */
export async function scrapeUser(username: string): Promise<ScraperResponse> {
  return scrapeReddit({
    type: 'user',
    username: username.replace(/^u\//, ''),
  });
}

/**
 * Scrape a subreddit's information and recent posts
 */
export async function scrapeCommunity(subreddit: string): Promise<ScraperResponse> {
  return scrapeReddit({
    type: 'community',
    subreddit: subreddit.replace(/^r\//, ''),
  });
}

/**
 * Search Reddit for a keyword
 */
export async function searchReddit(keyword: string): Promise<ScraperResponse> {
  return scrapeReddit({
    type: 'search',
    keyword,
  });
}

// Export for direct use
export const redditScraperApi = {
  scrapeUser,
  scrapeCommunity,
  searchReddit,
  scrapeReddit,
  isLocalScraperAvailable,
};

export default redditScraperApi;
