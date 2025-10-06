"""
Model Evaluation Pipeline

Complete evaluation pipeline for trained BERT models.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, List
import json
from datetime import datetime

import sys
sys.path.append(str(Path(__file__).parent.parent))

from training.model_utils import ModelInference
from .metrics import MetricsCalculator
from .confusion_matrix import ConfusionMatrixGenerator


class ModelEvaluator:
    """Complete model evaluation pipeline."""
    
    def __init__(
        self,
        model_path: str,
        class_names: Optional[List[str]] = None,
        device: str = "auto"
    ):
        """
        Initialize model evaluator.
        
        Args:
            model_path: Path to trained model
            class_names: Names for each class
            device: Device for inference
        """
        self.model_path = Path(model_path)
        self.class_names = class_names or ['Class 0', 'Class 1']
        
        # Initialize components
        print("Initializing model evaluator...")
        self.inference = ModelInference(str(self.model_path), device=device)
        self.metrics_calc = MetricsCalculator(num_classes=len(self.class_names))
        self.cm_gen = ConfusionMatrixGenerator(class_names=self.class_names)
        
        self.results = {}
    
    def load_test_data(
        self,
        data_path: str,
        text_column: str = 'text',
        label_column: str = 'label'
    ) -> tuple:
        """
        Load test dataset.
        
        Args:
            data_path: Path to test data
            text_column: Name of text column
            label_column: Name of label column
            
        Returns:
            Tuple of (texts, labels)
        """
        print(f"\nLoading test data from: {data_path}")
        
        # TODO: Replace 'data_path' with your actual test dataset path
        # Example: data_path = "python_ml/data/test_data.csv"
        
        file_path = Path(data_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Test data not found: {data_path}")
        
        # Load data
        if file_path.suffix == '.csv':
            df = pd.read_csv(data_path)
        elif file_path.suffix == '.parquet':
            df = pd.read_parquet(data_path)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")
        
        texts = df[text_column].tolist()
        labels = df[label_column].tolist()
        
        print(f"✓ Loaded {len(texts)} test samples")
        return texts, labels
    
    def evaluate(
        self,
        texts: List[str],
        labels: List[int],
        batch_size: int = 32
    ) -> dict:
        """
        Evaluate model on test data.
        
        Args:
            texts: Test texts
            labels: True labels
            batch_size: Batch size for inference
            
        Returns:
            Dictionary with evaluation results
        """
        print("\n" + "=" * 60)
        print("Starting Model Evaluation")
        print("=" * 60)
        
        # Get predictions
        print("\nGenerating predictions...")
        predictions = self.inference.predict_batch(
            texts,
            batch_size=batch_size,
            return_probabilities=True
        )
        
        # Extract labels and probabilities
        y_pred = [p['label'] for p in predictions]
        y_prob = [p['probabilities'] for p in predictions]
        
        # Calculate metrics
        print("\nCalculating metrics...")
        metrics = self.metrics_calc.calculate_all_metrics(labels, y_pred, y_prob)
        
        # Generate confusion matrix
        print("Generating confusion matrix...")
        cm = self.cm_gen.generate(labels, y_pred)
        
        # Store results
        self.results = {
            'metrics': metrics,
            'confusion_matrix': cm.tolist(),
            'predictions': predictions,
            'timestamp': datetime.now().isoformat(),
            'model_path': str(self.model_path),
            'num_samples': len(texts)
        }
        
        print("\n✓ Evaluation complete!")
        return self.results
    
    def print_results(self):
        """Print evaluation results."""
        if not self.results:
            print("No results yet. Run evaluate() first.")
            return
        
        # Print metrics
        self.metrics_calc.print_metrics()
        
        # Print confusion matrix stats
        self.cm_gen.print_statistics()
        
        # Print classification report
        y_true = [p['label'] for p in self.results['predictions']]  # This should be true labels
        y_pred = [p['label'] for p in self.results['predictions']]
        
        print("\nClassification Report:")
        print(self.metrics_calc.get_classification_report(
            y_true, y_pred, target_names=self.class_names
        ))
    
    def save_report(self, output_dir: str):
        """
        Save complete evaluation report.
        
        Args:
            output_dir: Directory to save report
        """
        if not self.results:
            raise ValueError("No results yet. Run evaluate() first.")
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save metrics JSON
        metrics_path = output_dir / 'metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(self.results['metrics'], f, indent=2)
        print(f"✓ Metrics saved to: {metrics_path}")
        
        # Save confusion matrix plots
        cm_path = output_dir / 'confusion_matrix.png'
        cm_norm_path = output_dir / 'confusion_matrix_normalized.png'
        
        self.cm_gen.save_plot(
            str(cm_path),
            normalize=False,
            title="Confusion Matrix (Counts)"
        )
        
        self.cm_gen.save_plot(
            str(cm_norm_path),
            normalize=True,
            title="Confusion Matrix (Normalized)"
        )
        
        # Save full results
        results_path = output_dir / 'evaluation_results.json'
        # Remove predictions from saved results (can be large)
        save_results = {k: v for k, v in self.results.items() if k != 'predictions'}
        with open(results_path, 'w') as f:
            json.dump(save_results, f, indent=2)
        print(f"✓ Full results saved to: {results_path}")
        
        print(f"\n✓ All reports saved to: {output_dir}")


# Main execution
if __name__ == "__main__":
    # Configuration
    MODEL_PATH = "python_ml/models/bert_classifier"
    TEST_DATA_PATH = "python_ml/data/test_data.csv"  # TODO: Update this path
    OUTPUT_DIR = "python_ml/evaluation/reports"
    
    CLASS_NAMES = ['Normal', 'Suspicious']  # Adjust based on your labels
    
    # Initialize evaluator
    evaluator = ModelEvaluator(
        model_path=MODEL_PATH,
        class_names=CLASS_NAMES,
        device="auto"
    )
    
    # Load test data
    texts, labels = evaluator.load_test_data(
        data_path=TEST_DATA_PATH,
        text_column='text',
        label_column='label'
    )
    
    # Run evaluation
    results = evaluator.evaluate(texts, labels, batch_size=32)
    
    # Print results
    evaluator.print_results()
    
    # Save report
    evaluator.save_report(OUTPUT_DIR)
    
    print("\n" + "=" * 60)
    print("Evaluation Complete!")
    print("=" * 60)
    print(f"Model: {MODEL_PATH}")
    print(f"Test samples: {len(texts)}")
    print(f"Accuracy: {results['metrics']['accuracy']:.4f}")
    print(f"F1 Score: {results['metrics']['f1_score']:.4f}")
    print(f"\nReports saved to: {OUTPUT_DIR}")
