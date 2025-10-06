"""
Confusion Matrix Generator

Generate and visualize confusion matrices for model evaluation.
"""

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix
from typing import List, Optional
from pathlib import Path


class ConfusionMatrixGenerator:
    """Generate confusion matrices and visualizations."""
    
    def __init__(self, class_names: Optional[List[str]] = None):
        """
        Initialize confusion matrix generator.
        
        Args:
            class_names: Names for each class (e.g., ['Normal', 'Suspicious'])
        """
        self.class_names = class_names
        self.cm = None
    
    def generate(self, y_true: List[int], y_pred: List[int]) -> np.ndarray:
        """
        Generate confusion matrix.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels
            
        Returns:
            Confusion matrix as numpy array
        """
        self.cm = confusion_matrix(y_true, y_pred)
        return self.cm
    
    def plot(
        self,
        normalize: bool = False,
        title: str = "Confusion Matrix",
        cmap: str = "Blues",
        figsize: tuple = (10, 8)
    ) -> plt.Figure:
        """
        Plot confusion matrix.
        
        Args:
            normalize: Whether to normalize values
            title: Plot title
            cmap: Color map
            figsize: Figure size
            
        Returns:
            Matplotlib figure
        """
        if self.cm is None:
            raise ValueError("Generate confusion matrix first using generate()")
        
        # Create figure
        fig, ax = plt.subplots(figsize=figsize)
        
        # Normalize if requested
        cm_display = self.cm.astype('float') / self.cm.sum(axis=1)[:, np.newaxis] if normalize else self.cm
        
        # Create heatmap
        sns.heatmap(
            cm_display,
            annot=True,
            fmt='.2f' if normalize else 'd',
            cmap=cmap,
            square=True,
            linewidths=1,
            cbar_kws={'label': 'Proportion' if normalize else 'Count'},
            xticklabels=self.class_names or range(len(self.cm)),
            yticklabels=self.class_names or range(len(self.cm)),
            ax=ax
        )
        
        # Labels and title
        ax.set_xlabel('Predicted Label', fontsize=12, fontweight='bold')
        ax.set_ylabel('True Label', fontsize=12, fontweight='bold')
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        
        plt.tight_layout()
        return fig
    
    def save_plot(
        self,
        output_path: str,
        normalize: bool = False,
        title: str = "Confusion Matrix",
        dpi: int = 300
    ):
        """
        Save confusion matrix plot to file.
        
        Args:
            output_path: Path to save plot
            normalize: Whether to normalize values
            title: Plot title
            dpi: Image resolution
        """
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        fig = self.plot(normalize=normalize, title=title)
        fig.savefig(output_path, dpi=dpi, bbox_inches='tight')
        plt.close(fig)
        
        print(f"✓ Confusion matrix saved to: {output_path}")
    
    def get_statistics(self) -> dict:
        """
        Get statistics from confusion matrix.
        
        Returns:
            Dictionary with confusion matrix statistics
        """
        if self.cm is None:
            raise ValueError("Generate confusion matrix first using generate()")
        
        # Calculate per-class statistics
        stats = {
            'total_samples': int(self.cm.sum()),
            'correct_predictions': int(np.trace(self.cm)),
            'accuracy': float(np.trace(self.cm) / self.cm.sum()),
            'per_class': []
        }
        
        for i in range(len(self.cm)):
            tp = self.cm[i, i]  # True positives
            fp = self.cm[:, i].sum() - tp  # False positives
            fn = self.cm[i, :].sum() - tp  # False negatives
            tn = self.cm.sum() - tp - fp - fn  # True negatives
            
            class_stats = {
                'class': self.class_names[i] if self.class_names else f'Class {i}',
                'true_positives': int(tp),
                'false_positives': int(fp),
                'false_negatives': int(fn),
                'true_negatives': int(tn),
                'total': int(self.cm[i, :].sum())
            }
            
            stats['per_class'].append(class_stats)
        
        return stats
    
    def print_statistics(self):
        """Print confusion matrix statistics."""
        stats = self.get_statistics()
        
        print("\n" + "=" * 60)
        print("Confusion Matrix Statistics")
        print("=" * 60)
        
        print(f"\nOverall:")
        print(f"  Total samples: {stats['total_samples']}")
        print(f"  Correct predictions: {stats['correct_predictions']}")
        print(f"  Accuracy: {stats['accuracy']:.4f}")
        
        print(f"\nPer-Class Statistics:")
        for class_stat in stats['per_class']:
            print(f"\n  {class_stat['class']}:")
            print(f"    True Positives:  {class_stat['true_positives']}")
            print(f"    False Positives: {class_stat['false_positives']}")
            print(f"    False Negatives: {class_stat['false_negatives']}")
            print(f"    True Negatives:  {class_stat['true_negatives']}")
            print(f"    Total samples:   {class_stat['total']}")
        
        print("=" * 60 + "\n")


# Example usage
if __name__ == "__main__":
    # Example data
    y_true = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1]
    y_pred = [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1]
    
    # Generate confusion matrix
    cm_gen = ConfusionMatrixGenerator(class_names=['Normal', 'Suspicious'])
    cm = cm_gen.generate(y_true, y_pred)
    
    print("Confusion Matrix:")
    print(cm)
    
    # Print statistics
    cm_gen.print_statistics()
    
    # Save plots
    cm_gen.save_plot(
        "python_ml/evaluation/reports/confusion_matrix.png",
        normalize=False,
        title="Confusion Matrix (Counts)"
    )
    
    cm_gen.save_plot(
        "python_ml/evaluation/reports/confusion_matrix_normalized.png",
        normalize=True,
        title="Confusion Matrix (Normalized)"
    )
