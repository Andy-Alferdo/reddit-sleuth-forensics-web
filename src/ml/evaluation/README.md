# Model Evaluation Module

This folder contains utilities for testing and evaluating trained models using various metrics.

## Purpose
Evaluate trained ML models to measure their performance on test datasets using industry-standard metrics.

## Metrics Included

### Classification Metrics
- **Accuracy** - Overall correctness of predictions
- **Precision** - Ratio of true positives to predicted positives
- **Recall** - Ratio of true positives to actual positives
- **F1 Score** - Harmonic mean of precision and recall
- **Confusion Matrix** - Visual representation of prediction results

### Advanced Metrics
- **ROC-AUC** - Area under the ROC curve
- **Classification Report** - Comprehensive metric summary

## Usage

1. **Load trained model**: Import your trained model
2. **Load test dataset**: Prepare test data (separate from training)
3. **Run evaluation**: Execute evaluation script
4. **Analyze results**: Review metrics and identify improvements

## Files

- `metricsCalculator.ts` - Calculate various performance metrics
- `confusionMatrix.ts` - Generate and visualize confusion matrices
- `evaluationPipeline.ts` - Main evaluation orchestrator
- `reportGenerator.ts` - Generate evaluation reports

## Evaluation Process

1. Load test dataset
2. Generate predictions using trained model
3. Calculate metrics comparing predictions to ground truth
4. Generate visualizations and reports
5. Save results for comparison
