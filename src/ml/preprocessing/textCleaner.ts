/**
 * Text Cleaner for Reddit Data
 * 
 * Clean and normalize text data from Reddit posts
 */

export class TextCleaner {
  /**
   * Remove URLs from text
   */
  static removeURLs(text: string): string {
    return text.replace(/https?:\/\/[^\s]+/g, '');
  }

  /**
   * Remove Reddit-specific markdown
   */
  static removeMarkdown(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/~~(.+?)~~/g, '$1') // Strikethrough
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/^#+\s/gm, '') // Headers
      .replace(/^[>]+\s/gm, ''); // Quotes
  }

  /**
   * Remove special characters but keep basic punctuation
   */
  static removeSpecialChars(text: string): string {
    return text.replace(/[^\w\s.,!?;:'-]/g, '');
  }

  /**
   * Convert to lowercase
   */
  static toLowerCase(text: string): string {
    return text.toLowerCase();
  }

  /**
   * Remove extra whitespace
   */
  static normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove Reddit username mentions
   */
  static removeUserMentions(text: string): string {
    return text.replace(/u\/[\w-]+/g, '');
  }

  /**
   * Remove subreddit mentions
   */
  static removeSubredditMentions(text: string): string {
    return text.replace(/r\/[\w-]+/g, '');
  }

  /**
   * Full cleaning pipeline
   */
  static cleanText(text: string, options: {
    removeUrls?: boolean;
    removeMarkdown?: boolean;
    removeSpecialChars?: boolean;
    toLowerCase?: boolean;
    removeMentions?: boolean;
  } = {}): string {
    const {
      removeUrls = true,
      removeMarkdown = true,
      removeSpecialChars = true,
      toLowerCase = true,
      removeMentions = true,
    } = options;

    let cleaned = text;

    if (removeUrls) cleaned = this.removeURLs(cleaned);
    if (removeMarkdown) cleaned = this.removeMarkdown(cleaned);
    if (removeMentions) {
      cleaned = this.removeUserMentions(cleaned);
      cleaned = this.removeSubredditMentions(cleaned);
    }
    if (removeSpecialChars) cleaned = this.removeSpecialChars(cleaned);
    if (toLowerCase) cleaned = this.toLowerCase(cleaned);
    
    cleaned = this.normalizeWhitespace(cleaned);

    return cleaned;
  }
}
