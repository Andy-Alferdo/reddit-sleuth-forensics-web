/**
 * Data Loader for Reddit Datasets
 * 
 * Load and validate Reddit dataset files
 */

export interface RedditPost {
  post_id: string;
  title: string;
  text: string;
  subreddit: string;
  author?: string;
  created_utc?: number;
  score?: number;
  num_comments?: number;
}

export class DataLoader {
  /**
   * Load Reddit dataset from JSON file
   * 
   * TODO: Add your dataset file path here
   * Example: const filePath = './your-reddit-dataset.json';
   */
  static async loadFromJSON(filePath: string): Promise<RedditPost[]> {
    try {
      const response = await fetch(filePath);
      const data = await response.json();
      return this.validateData(data);
    } catch (error) {
      console.error('Error loading JSON dataset:', error);
      throw new Error('Failed to load dataset');
    }
  }

  /**
   * Load Reddit dataset from CSV file
   * 
   * TODO: Add your dataset file path here
   * Example: const filePath = './your-reddit-dataset.csv';
   */
  static async loadFromCSV(filePath: string): Promise<RedditPost[]> {
    try {
      const response = await fetch(filePath);
      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (error) {
      console.error('Error loading CSV dataset:', error);
      throw new Error('Failed to load dataset');
    }
  }

  /**
   * Parse CSV text into RedditPost array
   */
  private static parseCSV(csvText: string): RedditPost[] {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const posts: RedditPost[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const post: any = {};
      
      headers.forEach((header, index) => {
        post[header] = values[index];
      });
      
      posts.push(post as RedditPost);
    }
    
    return this.validateData(posts);
  }

  /**
   * Validate dataset structure
   */
  private static validateData(data: any[]): RedditPost[] {
    if (!Array.isArray(data)) {
      throw new Error('Dataset must be an array');
    }

    return data.map((item, index) => {
      if (!item.post_id || !item.title || !item.text || !item.subreddit) {
        throw new Error(`Invalid data at index ${index}: missing required fields`);
      }
      return item as RedditPost;
    });
  }

  /**
   * Get dataset statistics
   */
  static getStats(posts: RedditPost[]): {
    totalPosts: number;
    uniqueSubreddits: number;
    avgTextLength: number;
  } {
    const uniqueSubreddits = new Set(posts.map(p => p.subreddit)).size;
    const avgTextLength = posts.reduce((sum, p) => sum + p.text.length, 0) / posts.length;

    return {
      totalPosts: posts.length,
      uniqueSubreddits,
      avgTextLength: Math.round(avgTextLength),
    };
  }
}
