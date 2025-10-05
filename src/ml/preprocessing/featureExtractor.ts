/**
 * Feature Extractor for Reddit Data
 * 
 * Extract relevant features from Reddit posts for ML models
 */

import { RedditPost } from './dataLoader';

export interface ExtractedFeatures {
  post_id: string;
  text: string;
  text_length: number;
  word_count: number;
  sentence_count: number;
  avg_word_length: number;
  has_url: boolean;
  question_marks: number;
  exclamation_marks: number;
  subreddit: string;
  score?: number;
  num_comments?: number;
}

export class FeatureExtractor {
  /**
   * Extract features from a single post
   */
  static extractFeatures(post: RedditPost, cleanedText: string): ExtractedFeatures {
    const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
      post_id: post.post_id,
      text: cleanedText,
      text_length: cleanedText.length,
      word_count: words.length,
      sentence_count: sentences.length,
      avg_word_length: words.length > 0 
        ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
        : 0,
      has_url: /https?:\/\//.test(post.text),
      question_marks: (post.text.match(/\?/g) || []).length,
      exclamation_marks: (post.text.match(/!/g) || []).length,
      subreddit: post.subreddit,
      score: post.score,
      num_comments: post.num_comments,
    };
  }

  /**
   * Extract features from multiple posts
   */
  static extractBatch(posts: RedditPost[], cleanedTexts: string[]): ExtractedFeatures[] {
    if (posts.length !== cleanedTexts.length) {
      throw new Error('Posts and cleaned texts arrays must have same length');
    }

    return posts.map((post, index) => 
      this.extractFeatures(post, cleanedTexts[index])
    );
  }

  /**
   * Get feature statistics
   */
  static getFeatureStats(features: ExtractedFeatures[]): {
    avgTextLength: number;
    avgWordCount: number;
    avgSentenceCount: number;
    postsWithUrls: number;
    avgQuestionMarks: number;
  } {
    const total = features.length;
    
    return {
      avgTextLength: Math.round(
        features.reduce((sum, f) => sum + f.text_length, 0) / total
      ),
      avgWordCount: Math.round(
        features.reduce((sum, f) => sum + f.word_count, 0) / total
      ),
      avgSentenceCount: Math.round(
        features.reduce((sum, f) => sum + f.sentence_count, 0) / total
      ),
      postsWithUrls: features.filter(f => f.has_url).length,
      avgQuestionMarks: (
        features.reduce((sum, f) => sum + f.question_marks, 0) / total
      ).toFixed(2) as any,
    };
  }
}
