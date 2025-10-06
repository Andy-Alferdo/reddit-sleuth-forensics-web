"""
Metrics Calculator

Calculate various classification metrics for model evaluation.
"""

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    roc_auc_score,
    average_precision_score
)
from typing import Dict, List, Optional
import json
from pathlib import Path


class MetricsCalculator:
    """Calculate and manage classification metrics."""
    
    def __init__(self, num_classes: int = 2):
        """
        Initialize metrics calculator.
        
        Args:
            num_classes: Number of classes
        """
        self.num_classes = num_classes
        self.metrics = {}
    
    def calculate_all_metrics(
        self,
        y_true: List[int],
        y_pred: List[int],
        y_prob: Optional[List[List[float]]] = None
    ) -> Dict:
        """
        Calculate all available metrics.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            y_prob: Predicted probabilities (optional)
            
        Returns:
            Dictionary with all metrics
        """
        y_true = np.array(y_true)
        y_pred = np.array(y_pred)
        
        # Basic metrics
        accuracy = accuracy_score(y_true, y_pred)
        
        # Multi-class metrics (averaged)
        precision = precision_score(y_true, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_true, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_true, y_pred, average='weighted', zero_division=0)
        
        # Per-class metrics
        precision_per_class = precision_score(
            y_true, y_pred, average=None, zero_division=0
        ).tolist()
        recall_per_class = recall_score(
            y_true, y_pred, average=None, zero_division=0
        ).tolist()
        f1_per_class = f1_score(
            y_true, y_pred, average=None, zero_division=0
        ).tolist()
        
        self.metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'precision_per_class': precision_per_class,
            'recall_per_class': recall_per_class,
            'f1_per_class': f1_per_class,
            'num_samples': len(y_true),
            'num_classes': self.num_classes
        }
        
        # Add probability-based metrics if available
        if y_prob is not None:
            y_prob = np.array(y_prob)
            
            try:
                # ROC AUC (for binary or multi-class)
                if self.num_classes == 2:
                    roc_auc = roc_auc_score(y_true, y_prob[:, 1])
                    avg_precision = average_precision_score(y_true, y_prob[:, 1])
                else:
                    roc_auc = roc_auc_score(
                        y_true, y_prob, multi_class='ovr', average='weighted'
                    )
                    avg_precision = None
                
                self.metrics['roc_auc'] = float(roc_auc)
                if avg_precision is not None:
                    self.metrics['average_precision'] = float(avg_precision)
            except Exception as e:
                print(f"Warning: Could not calculate ROC AUC: {e}")
        
        return self.metrics
    
    def get_classification_report(
        self,
        y_true: List[int],
        y_pred: List[int],
        target_names: Optional[List[str]] = None
    ) -> str:
        """
        Generate sklearn classification report.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            target_names: Names for each class
            
        Returns:
            Classification report as string
        """
        return classification_report(
            y_true,
            y_pred,
            target_names=target_names,
            zero_division=0
        )
    
    def print_metrics(self):
        """Print all calculated metrics in a formatted way."""
        if not self.metrics:
            print("No metrics calculated yet. Run calculate_all_metrics() first.")
            return
        
        print("\n" + "=" * 60)
        print("Model Evaluation Metrics")
        print("=" * 60)
        
        print(f"\nOverall Metrics:")
        print(f"  Accuracy:  {self.metrics['accuracy']:.4f}")
        print(f"  Precision: {self.metrics['precision']:.4f}")
        print(f"  Recall:    {self.metrics['recall']:.4f}")
        print(f"  F1 Score:  {self.metrics['f1_score']:.4f}")
        
        if 'roc_auc' in self.metrics:
            print(f"  ROC AUC:   {self.metrics['roc_auc']:.4f}")
        if 'average_precision' in self.metrics:
            print(f"  Avg Precision: {self.metrics['average_precision']:.4f}")
        
        print(f"\nPer-Class Metrics:")
        for i in range(self.num_classes):
            print(f"  Class {i}:")
            print(f"    Precision: {self.metrics['precision_per_class'][i]:.4f}")
            print(f"    Recall:    {self.metrics['recall_per_class'][i]:.4f}")
            print(f"    F1 Score:  {self.metrics['f1_per_class'][i]:.4f}")
        
        print(f"\nDataset Info:")
        print(f"  Samples: {self.metrics['num_samples']}")
        print(f"  Classes: {self.metrics['num_classes']}")
        print("=" * 60 + "\n")
    
    def save_metrics(self, output_path: str):
        """
        Save metrics to JSON file.
        
        Args:
            output_path: Path to save metrics
        """
        if not self.metrics:
            raise ValueError("No metrics calculated yet.")
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(self.metrics, f, indent=2)
        
        print(f"✓ Metrics saved to: {output_path}")
    
    def load_metrics(self, input_path: str):
        """
        Load metrics from JSON file.
        
        Args:
            input_path: Path to metrics file
        """
        with open(input_path, 'r') as f:
            self.metrics = json.load(f)
        
        print(f"✓ Metrics loaded from: {input_path}")


# Example usage
if __name__ == "__main__":
    # Example data
    y_true = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1]
    y_pred = [0, 1, 0, 1, 0, 0, 1, 0, 0, 1]
    y_prob = [
        [0.8, 0.2], [0.1, 0.9], [0.7, 0.3], [0.2, 0.8], [0.6, 0.4],
        [0.9, 0.1], [0.3, 0.7], [0.85, 0.15], [0.75, 0.25], [0.1, 0.9]
    ]
    
    # Calculate metrics
    calculator = MetricsCalculator(num_classes=2)
    metrics = calculator.calculate_all_metrics(y_true, y_pred, y_prob)
    
    # Print metrics
    calculator.print_metrics()
    
    # Get classification report
    report = calculator.get_classification_report(
        y_true, y_pred,
        target_names=['Normal', 'Suspicious']
    )
    print("Classification Report:")
    print(report)
    
    # Save metrics
    calculator.save_metrics("python_ml/evaluation/reports/example_metrics.json")
