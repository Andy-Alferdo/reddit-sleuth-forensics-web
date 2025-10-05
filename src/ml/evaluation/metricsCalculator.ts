/**
 * Metrics Calculator
 * 
 * Calculate various performance metrics for model evaluation
 */

export interface Prediction {
  actual: number;
  predicted: number;
  probability?: number;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  support: number;
}

export class MetricsCalculator {
  /**
   * Calculate accuracy
   */
  static calculateAccuracy(predictions: Prediction[]): number {
    const correct = predictions.filter(p => p.actual === p.predicted).length;
    return correct / predictions.length;
  }

  /**
   * Calculate precision, recall, and F1 score for a specific class
   */
  static calculateMetricsForClass(
    predictions: Prediction[], 
    targetClass: number
  ): ClassificationMetrics {
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let support = 0;

    predictions.forEach(p => {
      if (p.actual === targetClass) {
        support++;
        if (p.predicted === targetClass) {
          truePositives++;
        } else {
          falseNegatives++;
        }
      } else if (p.predicted === targetClass) {
        falsePositives++;
      }
    });

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    return {
      accuracy: this.calculateAccuracy(predictions),
      precision,
      recall,
      f1Score,
      support,
    };
  }

  /**
   * Calculate macro-averaged metrics (average across all classes)
   */
  static calculateMacroMetrics(predictions: Prediction[]): {
    macroAccuracy: number;
    macroPrecision: number;
    macroRecall: number;
    macroF1: number;
  } {
    const classes = [...new Set(predictions.map(p => p.actual))];
    
    const classMetrics = classes.map(cls => 
      this.calculateMetricsForClass(predictions, cls)
    );

    return {
      macroAccuracy: this.calculateAccuracy(predictions),
      macroPrecision: classMetrics.reduce((sum, m) => sum + m.precision, 0) / classes.length,
      macroRecall: classMetrics.reduce((sum, m) => sum + m.recall, 0) / classes.length,
      macroF1: classMetrics.reduce((sum, m) => sum + m.f1Score, 0) / classes.length,
    };
  }

  /**
   * Calculate weighted-averaged metrics (weighted by class support)
   */
  static calculateWeightedMetrics(predictions: Prediction[]): {
    weightedPrecision: number;
    weightedRecall: number;
    weightedF1: number;
  } {
    const classes = [...new Set(predictions.map(p => p.actual))];
    const total = predictions.length;
    
    const classMetrics = classes.map(cls => 
      this.calculateMetricsForClass(predictions, cls)
    );

    const weightedPrecision = classMetrics.reduce(
      (sum, m) => sum + (m.precision * m.support), 0
    ) / total;

    const weightedRecall = classMetrics.reduce(
      (sum, m) => sum + (m.recall * m.support), 0
    ) / total;

    const weightedF1 = classMetrics.reduce(
      (sum, m) => sum + (m.f1Score * m.support), 0
    ) / total;

    return {
      weightedPrecision,
      weightedRecall,
      weightedF1,
    };
  }

  /**
   * Generate full classification report
   */
  static generateReport(predictions: Prediction[]): {
    overall: ReturnType<typeof MetricsCalculator.calculateMacroMetrics>;
    weighted: ReturnType<typeof MetricsCalculator.calculateWeightedMetrics>;
    perClass: Map<number, ClassificationMetrics>;
  } {
    const classes = [...new Set(predictions.map(p => p.actual))];
    const perClass = new Map<number, ClassificationMetrics>();

    classes.forEach(cls => {
      perClass.set(cls, this.calculateMetricsForClass(predictions, cls));
    });

    return {
      overall: this.calculateMacroMetrics(predictions),
      weighted: this.calculateWeightedMetrics(predictions),
      perClass,
    };
  }

  /**
   * Print metrics report to console
   */
  static printReport(predictions: Prediction[]): void {
    const report = this.generateReport(predictions);

    console.log('\n=== Classification Report ===\n');
    console.log('Overall Metrics:');
    console.log(`  Accuracy: ${(report.overall.macroAccuracy * 100).toFixed(2)}%`);
    console.log(`  Macro Precision: ${(report.overall.macroPrecision * 100).toFixed(2)}%`);
    console.log(`  Macro Recall: ${(report.overall.macroRecall * 100).toFixed(2)}%`);
    console.log(`  Macro F1: ${(report.overall.macroF1 * 100).toFixed(2)}%`);

    console.log('\nWeighted Metrics:');
    console.log(`  Weighted Precision: ${(report.weighted.weightedPrecision * 100).toFixed(2)}%`);
    console.log(`  Weighted Recall: ${(report.weighted.weightedRecall * 100).toFixed(2)}%`);
    console.log(`  Weighted F1: ${(report.weighted.weightedF1 * 100).toFixed(2)}%`);

    console.log('\nPer-Class Metrics:');
    report.perClass.forEach((metrics, classLabel) => {
      console.log(`\n  Class ${classLabel}:`);
      console.log(`    Precision: ${(metrics.precision * 100).toFixed(2)}%`);
      console.log(`    Recall: ${(metrics.recall * 100).toFixed(2)}%`);
      console.log(`    F1 Score: ${(metrics.f1Score * 100).toFixed(2)}%`);
      console.log(`    Support: ${metrics.support}`);
    });
  }
}
