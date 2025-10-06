"""
Feature Extraction Module

Extracts various features from Reddit text data:
- Text length statistics
- Word count
- Sentence count
- Special character ratios
- Readability scores
"""

import re
import pandas as pd
from typing import Dict, List
import numpy as np


class FeatureExtractor:
    """Extract features from cleaned text data."""
    
    def __init__(self):
        """Initialize feature extractor."""
        self.sentence_pattern = re.compile(r'[.!?]+')
        self.word_pattern = re.compile(r'\b\w+\b')
    
    def extract_text_features(self, text: str) -> Dict[str, float]:
        """
        Extract features from a single text.
        
        Args:
            text: Cleaned text string
            
        Returns:
            Dictionary of extracted features
        """
        if not isinstance(text, str) or len(text) == 0:
            return self._empty_features()
        
        # Basic counts
        char_count = len(text)
        word_count = len(self.word_pattern.findall(text))
        sentence_count = len(self.sentence_pattern.split(text))
        
        # Character type ratios
        digit_count = sum(c.isdigit() for c in text)
        upper_count = sum(c.isupper() for c in text)
        special_count = sum(not c.isalnum() and not c.isspace() for c in text)
        
        # Averages
        avg_word_length = char_count / word_count if word_count > 0 else 0
        avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
        
        # Ratios
        digit_ratio = digit_count / char_count if char_count > 0 else 0
        upper_ratio = upper_count / char_count if char_count > 0 else 0
        special_ratio = special_count / char_count if char_count > 0 else 0
        
        return {
            'char_count': char_count,
            'word_count': word_count,
            'sentence_count': sentence_count,
            'avg_word_length': round(avg_word_length, 2),
            'avg_sentence_length': round(avg_sentence_length, 2),
            'digit_ratio': round(digit_ratio, 3),
            'upper_ratio': round(upper_ratio, 3),
            'special_ratio': round(special_ratio, 3)
        }
    
    def _empty_features(self) -> Dict[str, float]:
        """Return empty feature dictionary."""
        return {
            'char_count': 0,
            'word_count': 0,
            'sentence_count': 0,
            'avg_word_length': 0,
            'avg_sentence_length': 0,
            'digit_ratio': 0,
            'upper_ratio': 0,
            'special_ratio': 0
        }
    
    def extract_batch(self, texts: List[str], show_progress: bool = True) -> pd.DataFrame:
        """
        Extract features from a batch of texts.
        
        Args:
            texts: List of cleaned texts
            show_progress: Show progress bar
            
        Returns:
            DataFrame with extracted features
        """
        if show_progress:
            try:
                from tqdm import tqdm
                texts = tqdm(texts, desc="Extracting features")
            except ImportError:
                pass
        
        features = [self.extract_text_features(text) for text in texts]
        return pd.DataFrame(features)
    
    def add_features_to_dataframe(self, df: pd.DataFrame, text_column: str) -> pd.DataFrame:
        """
        Add extracted features to a DataFrame.
        
        Args:
            df: DataFrame with text data
            text_column: Name of the column containing text
            
        Returns:
            DataFrame with added feature columns
        """
        print(f"Extracting features from column: {text_column}")
        features_df = self.extract_batch(df[text_column].tolist())
        
        # Combine with original dataframe
        result = pd.concat([df.reset_index(drop=True), features_df], axis=1)
        
        print(f"✓ Extracted {len(features_df.columns)} features")
        return result
    
    def get_feature_statistics(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Get statistics for extracted features.
        
        Args:
            df: DataFrame with extracted features
            
        Returns:
            DataFrame with feature statistics
        """
        feature_cols = [
            'char_count', 'word_count', 'sentence_count',
            'avg_word_length', 'avg_sentence_length',
            'digit_ratio', 'upper_ratio', 'special_ratio'
        ]
        
        stats = df[feature_cols].describe()
        return stats


# Example usage
if __name__ == "__main__":
    extractor = FeatureExtractor()
    
    # Test examples
    test_texts = [
        "This is a short sentence.",
        "This is a longer sentence with more words and complexity.",
        "Multiple sentences here. Each one adds to the count! Right?"
    ]
    
    print("Feature Extraction Examples:\n")
    for text in test_texts:
        features = extractor.extract_text_features(text)
        print(f"Text: {text}")
        print(f"Features: {features}\n")
