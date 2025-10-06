"""
Text Cleaning Module

Cleans and normalizes Reddit text data by removing:
- URLs and links
- Markdown formatting
- Special characters
- Extra whitespace
- Reddit-specific artifacts
"""

import re
import html
from typing import List, Optional
import pandas as pd


class TextCleaner:
    """Clean and normalize text data from Reddit."""
    
    def __init__(self, lowercase: bool = True, remove_urls: bool = True):
        """
        Initialize the text cleaner.
        
        Args:
            lowercase: Convert text to lowercase
            remove_urls: Remove URLs from text
        """
        self.lowercase = lowercase
        self.remove_urls = remove_urls
        
        # Compile regex patterns for efficiency
        self.url_pattern = re.compile(r'http\S+|www\.\S+')
        self.markdown_link_pattern = re.compile(r'\[([^\]]+)\]\([^\)]+\)')
        self.reddit_user_pattern = re.compile(r'/u/\w+')
        self.reddit_sub_pattern = re.compile(r'/r/\w+')
        self.special_chars_pattern = re.compile(r'[^a-zA-Z0-9\s.,!?;:\'-]')
        self.whitespace_pattern = re.compile(r'\s+')
    
    def clean(self, text: str) -> str:
        """
        Clean a single text string.
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        if not isinstance(text, str):
            return ""
        
        # Decode HTML entities
        text = html.unescape(text)
        
        # Remove URLs
        if self.remove_urls:
            text = self.url_pattern.sub('', text)
        
        # Convert markdown links to just the text
        text = self.markdown_link_pattern.sub(r'\1', text)
        
        # Remove Reddit user mentions
        text = self.reddit_user_pattern.sub('[USER]', text)
        
        # Remove Reddit subreddit mentions
        text = self.reddit_sub_pattern.sub('[SUBREDDIT]', text)
        
        # Remove special characters but keep basic punctuation
        text = self.special_chars_pattern.sub(' ', text)
        
        # Normalize whitespace
        text = self.whitespace_pattern.sub(' ', text)
        
        # Lowercase
        if self.lowercase:
            text = text.lower()
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def clean_batch(self, texts: List[str], show_progress: bool = True) -> List[str]:
        """
        Clean a batch of text strings.
        
        Args:
            texts: List of raw texts
            show_progress: Show progress bar
            
        Returns:
            List of cleaned texts
        """
        if show_progress:
            try:
                from tqdm import tqdm
                texts = tqdm(texts, desc="Cleaning text")
            except ImportError:
                pass
        
        return [self.clean(text) for text in texts]
    
    def clean_dataframe(self, df: pd.DataFrame, text_column: str) -> pd.DataFrame:
        """
        Clean text in a DataFrame column.
        
        Args:
            df: DataFrame with text data
            text_column: Name of the column containing text
            
        Returns:
            DataFrame with cleaned text
        """
        print(f"Cleaning text in column: {text_column}")
        df = df.copy()
        df[text_column] = self.clean_batch(df[text_column].fillna('').tolist())
        
        # Remove empty texts
        original_len = len(df)
        df = df[df[text_column].str.len() > 0]
        removed = original_len - len(df)
        
        if removed > 0:
            print(f"✓ Removed {removed} empty texts after cleaning")
        
        print(f"✓ Cleaned {len(df)} texts")
        return df


# Example usage
if __name__ == "__main__":
    cleaner = TextCleaner(lowercase=True, remove_urls=True)
    
    # Test examples
    test_texts = [
        "Check out this link: https://reddit.com/r/python cool stuff!",
        "[Click here](https://example.com) for more info from /u/username",
        "Visit /r/MachineLearning for ML content!!!",
        "Text with &amp; HTML entities &lt;tag&gt;"
    ]
    
    print("Original vs Cleaned:\n")
    for text in test_texts:
        cleaned = cleaner.clean(text)
        print(f"Original: {text}")
        print(f"Cleaned:  {cleaned}\n")
