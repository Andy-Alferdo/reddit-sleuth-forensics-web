"""
Training Configuration

Define hyperparameters and settings for BERT model training.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class TrainingConfig:
    """Configuration for BERT training."""
    
    # Model settings
    model_name: str = "bert-base-uncased"  # Can also use: bert-large-uncased, distilbert-base-uncased
    num_labels: int = 2  # Binary classification (normal vs suspicious)
    max_length: int = 512  # Maximum sequence length for BERT
    
    # Training hyperparameters
    batch_size: int = 16  # Reduce if GPU memory issues (try 8 or 4)
    learning_rate: float = 2e-5  # Standard BERT fine-tuning rate
    num_epochs: int = 3  # Start with 3, increase if needed
    warmup_steps: int = 500  # Warmup steps for learning rate scheduler
    weight_decay: float = 0.01  # L2 regularization
    
    # Data split
    test_size: float = 0.2  # 20% for testing
    val_size: float = 0.1  # 10% for validation
    random_seed: int = 42
    
    # Training settings
    save_steps: int = 500  # Save checkpoint every N steps
    eval_steps: int = 500  # Evaluate every N steps
    logging_steps: int = 100  # Log metrics every N steps
    
    # Device settings
    device: str = "auto"  # "auto", "cuda", or "cpu"
    fp16: bool = True  # Use mixed precision training (faster on GPU)
    
    # Output paths
    output_dir: str = "python_ml/models/bert_classifier"
    logs_dir: str = "python_ml/training/logs"
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        if self.num_labels < 2:
            raise ValueError("num_labels must be at least 2")
        
        if not 0 < self.test_size < 1:
            raise ValueError("test_size must be between 0 and 1")
        
        if not 0 < self.val_size < 1:
            raise ValueError("val_size must be between 0 and 1")
        
        if self.test_size + self.val_size >= 1:
            raise ValueError("test_size + val_size must be less than 1")
    
    def get_train_size(self) -> float:
        """Calculate training set size."""
        return 1.0 - self.test_size - self.val_size
    
    def print_config(self):
        """Print configuration summary."""
        print("\n" + "=" * 60)
        print("Training Configuration")
        print("=" * 60)
        print(f"Model: {self.model_name}")
        print(f"Number of labels: {self.num_labels}")
        print(f"Max sequence length: {self.max_length}")
        print(f"\nBatch size: {self.batch_size}")
        print(f"Learning rate: {self.learning_rate}")
        print(f"Epochs: {self.num_epochs}")
        print(f"\nData split:")
        print(f"  Train: {self.get_train_size():.1%}")
        print(f"  Validation: {self.val_size:.1%}")
        print(f"  Test: {self.test_size:.1%}")
        print(f"\nDevice: {self.device}")
        print(f"Mixed precision (FP16): {self.fp16}")
        print("=" * 60 + "\n")


# Example usage
if __name__ == "__main__":
    config = TrainingConfig()
    config.print_config()
    
    # Example: Custom configuration
    custom_config = TrainingConfig(
        model_name="bert-large-uncased",
        batch_size=8,
        num_epochs=5
    )
    custom_config.print_config()
