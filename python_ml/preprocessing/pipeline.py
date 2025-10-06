"""
Complete Preprocessing Pipeline

Orchestrates the full preprocessing workflow:
1. Load Reddit dataset
2. Clean text data
3. Extract features
4. Save preprocessed data
"""

import pandas as pd
from pathlib import Path
from typing import Optional
from .data_loader import RedditDataLoader
from .text_cleaner import TextCleaner
from .feature_extractor import FeatureExtractor


class PreprocessingPipeline:
    """Complete preprocessing pipeline for Reddit data."""
    
    def __init__(
        self,
        input_path: str,
        output_path: Optional[str] = None,
        text_column: str = 'text',
        label_column: Optional[str] = 'label'
    ):
        """
        Initialize the preprocessing pipeline.
        
        Args:
            input_path: Path to input dataset
            output_path: Path to save preprocessed data (optional)
            text_column: Name of the text column
            label_column: Name of the label column (if available)
        """
        self.input_path = Path(input_path)
        self.output_path = Path(output_path) if output_path else None
        self.text_column = text_column
        self.label_column = label_column
        
        # Initialize components
        self.loader = RedditDataLoader(self.input_path)
        self.cleaner = TextCleaner(lowercase=True, remove_urls=True)
        self.extractor = FeatureExtractor()
        
        self.data = None
    
    def run(self) -> pd.DataFrame:
        """
        Run the complete preprocessing pipeline.
        
        Returns:
            Preprocessed DataFrame
        """
        print("=" * 60)
        print("Starting Preprocessing Pipeline")
        print("=" * 60)
        
        # Step 1: Load data
        print("\n[1/3] Loading dataset...")
        self.data = self.loader.load()
        
        # Validate required columns
        required_cols = [self.text_column]
        if self.label_column:
            required_cols.append(self.label_column)
        self.loader.validate_columns(required_cols)
        
        # Step 2: Clean text
        print("\n[2/3] Cleaning text...")
        self.data = self.cleaner.clean_dataframe(self.data, self.text_column)
        
        # Step 3: Extract features
        print("\n[3/3] Extracting features...")
        self.data = self.extractor.add_features_to_dataframe(self.data, self.text_column)
        
        # Save if output path specified
        if self.output_path:
            self._save_preprocessed_data()
        
        # Print summary
        self._print_summary()
        
        print("\n" + "=" * 60)
        print("Preprocessing Complete!")
        print("=" * 60)
        
        return self.data
    
    def _save_preprocessed_data(self):
        """Save preprocessed data to file."""
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_ext = self.output_path.suffix.lower()
        if file_ext == '.csv':
            self.data.to_csv(self.output_path, index=False)
        elif file_ext == '.parquet':
            self.data.to_parquet(self.output_path, index=False)
        else:
            # Default to CSV
            self.data.to_csv(self.output_path.with_suffix('.csv'), index=False)
        
        print(f"\n✓ Saved preprocessed data to: {self.output_path}")
    
    def _print_summary(self):
        """Print preprocessing summary."""
        print("\n" + "-" * 60)
        print("Preprocessing Summary")
        print("-" * 60)
        print(f"Total records: {len(self.data)}")
        print(f"Total columns: {len(self.data.columns)}")
        
        if self.label_column and self.label_column in self.data.columns:
            print(f"\nLabel distribution:")
            print(self.data[self.label_column].value_counts())
        
        print(f"\nText statistics:")
        stats = self.extractor.get_feature_statistics(self.data)
        print(stats[['char_count', 'word_count', 'sentence_count']].round(2))
        print("-" * 60)
    
    def get_processed_data(self) -> pd.DataFrame:
        """
        Get the preprocessed data.
        
        Returns:
            Preprocessed DataFrame
        """
        if self.data is None:
            raise ValueError("Pipeline not run yet. Call run() first.")
        return self.data


# Main execution
if __name__ == "__main__":
    # TODO: Replace with your actual dataset paths
    INPUT_DATASET = "path/to/your/reddit_dataset.csv"
    OUTPUT_DATASET = "python_ml/data/preprocessed_reddit_data.csv"
    
    # Initialize and run pipeline
    pipeline = PreprocessingPipeline(
        input_path=INPUT_DATASET,
        output_path=OUTPUT_DATASET,
        text_column='text',  # Adjust to your column name
        label_column='label'  # Set to None if unlabeled data
    )
    
    # Run preprocessing
    processed_data = pipeline.run()
    
    # Access processed data
    print("\nProcessed data shape:", processed_data.shape)
    print("\nFirst few rows:")
    print(processed_data.head())
