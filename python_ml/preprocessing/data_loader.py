"""
Data Loader for Reddit Datasets

Loads Reddit data from various formats (CSV, JSON, Parquet)
and prepares it for preprocessing.
"""

import pandas as pd
import json
from pathlib import Path
from typing import Union, List, Dict


class RedditDataLoader:
    """Load and validate Reddit datasets."""
    
    def __init__(self, file_path: Union[str, Path]):
        """
        Initialize the data loader.
        
        Args:
            file_path: Path to the Reddit dataset file
        """
        self.file_path = Path(file_path)
        self.data = None
        
    def load(self) -> pd.DataFrame:
        """
        Load dataset based on file extension.
        
        Returns:
            DataFrame containing the loaded data
        """
        if not self.file_path.exists():
            raise FileNotFoundError(f"Dataset not found: {self.file_path}")
        
        file_ext = self.file_path.suffix.lower()
        
        if file_ext == '.csv':
            self.data = pd.read_csv(self.file_path)
        elif file_ext == '.json':
            self.data = pd.read_json(self.file_path)
        elif file_ext == '.jsonl':
            self.data = pd.read_json(self.file_path, lines=True)
        elif file_ext == '.parquet':
            self.data = pd.read_parquet(self.file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
        
        print(f"✓ Loaded {len(self.data)} records from {self.file_path.name}")
        return self.data
    
    def validate_columns(self, required_columns: List[str]) -> bool:
        """
        Validate that required columns exist in the dataset.
        
        Args:
            required_columns: List of required column names
            
        Returns:
            True if all required columns exist
        """
        if self.data is None:
            raise ValueError("No data loaded. Call load() first.")
        
        missing = set(required_columns) - set(self.data.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")
        
        print(f"✓ All required columns present: {required_columns}")
        return True
    
    def get_sample(self, n: int = 5) -> pd.DataFrame:
        """
        Get a sample of the dataset.
        
        Args:
            n: Number of samples to return
            
        Returns:
            DataFrame with n random samples
        """
        if self.data is None:
            raise ValueError("No data loaded. Call load() first.")
        
        return self.data.sample(min(n, len(self.data)))
    
    def get_info(self) -> Dict:
        """
        Get dataset information.
        
        Returns:
            Dictionary with dataset statistics
        """
        if self.data is None:
            raise ValueError("No data loaded. Call load() first.")
        
        return {
            'num_records': len(self.data),
            'num_columns': len(self.data.columns),
            'columns': list(self.data.columns),
            'memory_usage': f"{self.data.memory_usage(deep=True).sum() / 1024**2:.2f} MB",
            'has_nulls': self.data.isnull().any().any()
        }


# Example usage
if __name__ == "__main__":
    # TODO: Replace with your actual dataset path
    dataset_path = "path/to/your/reddit_dataset.csv"
    
    loader = RedditDataLoader(dataset_path)
    df = loader.load()
    
    # Print dataset info
    info = loader.get_info()
    print("\nDataset Information:")
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    # Show sample
    print("\nSample Data:")
    print(loader.get_sample(3))
