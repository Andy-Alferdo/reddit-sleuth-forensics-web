"""
BERT Trainer

Fine-tune BERT models on preprocessed Reddit data using Hugging Face Transformers.
"""

import torch
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, Dict, List
from sklearn.model_selection import train_test_split
from transformers import (
    BertTokenizer,
    BertForSequenceClassification,
    Trainer,
    TrainingArguments,
    EvalPrediction
)
from torch.utils.data import Dataset
import json

from .config import TrainingConfig


class RedditDataset(Dataset):
    """PyTorch Dataset for Reddit text data."""
    
    def __init__(self, texts: List[str], labels: List[int], tokenizer, max_length: int):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(label, dtype=torch.long)
        }


class BERTTrainer:
    """Train BERT models for Reddit text classification."""
    
    def __init__(self, config: Optional[TrainingConfig] = None):
        """
        Initialize BERT trainer.
        
        Args:
            config: Training configuration
        """
        self.config = config or TrainingConfig()
        self.tokenizer = None
        self.model = None
        self.trainer = None
        
        # Auto-detect device
        if self.config.device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = self.config.device
        
        print(f"Using device: {self.device}")
        if self.device == "cuda":
            print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    def load_data(self, data_path: str, text_column: str = 'text', label_column: str = 'label'):
        """
        Load and split preprocessed data.
        
        Args:
            data_path: Path to preprocessed data CSV/Parquet
            text_column: Name of text column
            label_column: Name of label column
            
        Returns:
            Train, validation, and test datasets
        """
        print(f"\nLoading data from: {data_path}")
        
        # TODO: Replace 'data_path' with your actual preprocessed dataset path
        # Example: data_path = "python_ml/data/preprocessed_reddit_data.csv"
        
        file_path = Path(data_path)
        if not file_path.exists():
            raise FileNotFoundError(
                f"Dataset not found: {data_path}\n"
                f"Please run preprocessing pipeline first or update the path."
            )
        
        # Load data
        if file_path.suffix == '.csv':
            df = pd.read_csv(data_path)
        elif file_path.suffix == '.parquet':
            df = pd.read_parquet(data_path)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")
        
        print(f"Loaded {len(df)} samples")
        
        # Validate columns
        if text_column not in df.columns:
            raise ValueError(f"Column '{text_column}' not found in dataset")
        if label_column not in df.columns:
            raise ValueError(f"Column '{label_column}' not found in dataset")
        
        # Extract texts and labels
        texts = df[text_column].tolist()
        labels = df[label_column].tolist()
        
        # Split data
        print(f"\nSplitting data...")
        print(f"  Train: {self.config.get_train_size():.1%}")
        print(f"  Validation: {self.config.val_size:.1%}")
        print(f"  Test: {self.config.test_size:.1%}")
        
        # First split: separate test set
        train_val_texts, test_texts, train_val_labels, test_labels = train_test_split(
            texts, labels,
            test_size=self.config.test_size,
            random_state=self.config.random_seed,
            stratify=labels
        )
        
        # Second split: separate train and validation
        val_size_adjusted = self.config.val_size / (1 - self.config.test_size)
        train_texts, val_texts, train_labels, val_labels = train_test_split(
            train_val_texts, train_val_labels,
            test_size=val_size_adjusted,
            random_state=self.config.random_seed,
            stratify=train_val_labels
        )
        
        print(f"\nDataset sizes:")
        print(f"  Train: {len(train_texts)}")
        print(f"  Validation: {len(val_texts)}")
        print(f"  Test: {len(test_texts)}")
        
        # Load tokenizer
        print(f"\nLoading tokenizer: {self.config.model_name}")
        self.tokenizer = BertTokenizer.from_pretrained(self.config.model_name)
        
        # Create datasets
        train_dataset = RedditDataset(
            train_texts, train_labels, self.tokenizer, self.config.max_length
        )
        val_dataset = RedditDataset(
            val_texts, val_labels, self.tokenizer, self.config.max_length
        )
        test_dataset = RedditDataset(
            test_texts, test_labels, self.tokenizer, self.config.max_length
        )
        
        return train_dataset, val_dataset, test_dataset
    
    def initialize_model(self):
        """Initialize BERT model."""
        print(f"\nInitializing model: {self.config.model_name}")
        self.model = BertForSequenceClassification.from_pretrained(
            self.config.model_name,
            num_labels=self.config.num_labels
        )
        self.model.to(self.device)
        print(f"✓ Model loaded with {self.config.num_labels} labels")
    
    def compute_metrics(self, pred: EvalPrediction) -> Dict[str, float]:
        """Compute evaluation metrics."""
        labels = pred.label_ids
        preds = pred.predictions.argmax(-1)
        
        # Calculate metrics
        accuracy = (preds == labels).mean()
        
        return {
            'accuracy': float(accuracy)
        }
    
    def train(self, train_dataset, val_dataset):
        """
        Train the BERT model.
        
        Args:
            train_dataset: Training dataset
            val_dataset: Validation dataset
        """
        print("\n" + "=" * 60)
        print("Starting Training")
        print("=" * 60)
        
        # Create output directory
        output_dir = Path(self.config.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(output_dir),
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            per_device_eval_batch_size=self.config.batch_size,
            learning_rate=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
            warmup_steps=self.config.warmup_steps,
            logging_dir=self.config.logs_dir,
            logging_steps=self.config.logging_steps,
            eval_steps=self.config.eval_steps,
            save_steps=self.config.save_steps,
            eval_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            metric_for_best_model="accuracy",
            fp16=self.config.fp16 and self.device == "cuda",
        )
        
        # Initialize trainer
        self.trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=val_dataset,
            compute_metrics=self.compute_metrics
        )
        
        # Train
        self.trainer.train()
        
        print("\n" + "=" * 60)
        print("Training Complete!")
        print("=" * 60)
    
    def save_model(self, save_path: Optional[str] = None):
        """
        Save trained model and tokenizer.
        
        Args:
            save_path: Path to save model (uses config.output_dir if None)
        """
        save_path = save_path or self.config.output_dir
        save_path = Path(save_path)
        save_path.mkdir(parents=True, exist_ok=True)
        
        # Save model and tokenizer
        self.model.save_pretrained(save_path)
        self.tokenizer.save_pretrained(save_path)
        
        # Save config
        with open(save_path / 'training_config.json', 'w') as f:
            json.dump(vars(self.config), f, indent=2)
        
        print(f"\n✓ Model saved to: {save_path}")
    
    def load_model(self, model_path: str):
        """
        Load trained model and tokenizer.
        
        Args:
            model_path: Path to saved model
        """
        model_path = Path(model_path)
        
        print(f"Loading model from: {model_path}")
        self.tokenizer = BertTokenizer.from_pretrained(model_path)
        self.model = BertForSequenceClassification.from_pretrained(model_path)
        self.model.to(self.device)
        print("✓ Model loaded")


# Main execution
if __name__ == "__main__":
    # Configuration
    config = TrainingConfig(
        model_name="bert-base-uncased",
        num_labels=2,
        batch_size=16,
        num_epochs=3
    )
    config.print_config()
    
    # Initialize trainer
    trainer = BERTTrainer(config)
    
    # TODO: Update this path to your preprocessed dataset
    DATA_PATH = "python_ml/data/preprocessed_reddit_data.csv"
    
    # Load and split data
    train_dataset, val_dataset, test_dataset = trainer.load_data(
        DATA_PATH,
        text_column='text',
        label_column='label'
    )
    
    # Initialize model
    trainer.initialize_model()
    
    # Train
    trainer.train(train_dataset, val_dataset)
    
    # Save model
    trainer.save_model()
    
    print("\n✓ Training pipeline complete!")
    print(f"Model saved to: {config.output_dir}")
