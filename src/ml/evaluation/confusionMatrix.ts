/**
 * Confusion Matrix
 * 
 * Generate and visualize confusion matrices
 */

import { Prediction } from './metricsCalculator';

export type ConfusionMatrix = number[][];

export class ConfusionMatrixGenerator {
  /**
   * Generate confusion matrix from predictions
   */
  static generate(predictions: Prediction[]): {
    matrix: ConfusionMatrix;
    classes: number[];
  } {
    const classes = [...new Set([
      ...predictions.map(p => p.actual),
      ...predictions.map(p => p.predicted),
    ])].sort((a, b) => a - b);

    const size = classes.length;
    const matrix: ConfusionMatrix = Array(size).fill(0).map(() => Array(size).fill(0));

    predictions.forEach(p => {
      const actualIdx = classes.indexOf(p.actual);
      const predictedIdx = classes.indexOf(p.predicted);
      matrix[actualIdx][predictedIdx]++;
    });

    return { matrix, classes };
  }

  /**
   * Print confusion matrix to console
   */
  static print(predictions: Prediction[]): void {
    const { matrix, classes } = this.generate(predictions);

    console.log('\n=== Confusion Matrix ===\n');
    console.log('Predicted →');
    console.log('Actual ↓\n');

    // Header row
    const header = '     ' + classes.map(c => `  ${c}  `).join('');
    console.log(header);
    console.log('-'.repeat(header.length));

    // Matrix rows
    matrix.forEach((row, i) => {
      const rowStr = `${classes[i]}  | ` + row.map(val => {
        const str = val.toString();
        return ' '.repeat(4 - str.length) + str;
      }).join(' ');
      console.log(rowStr);
    });
  }

  /**
   * Calculate normalized confusion matrix (percentages)
   */
  static normalize(matrix: ConfusionMatrix): ConfusionMatrix {
    return matrix.map(row => {
      const sum = row.reduce((a, b) => a + b, 0);
      return row.map(val => sum > 0 ? val / sum : 0);
    });
  }

  /**
   * Get confusion matrix metrics
   */
  static getMetrics(matrix: ConfusionMatrix): {
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
  } {
    const totalPredictions = matrix.reduce(
      (sum, row) => sum + row.reduce((a, b) => a + b, 0), 
      0
    );

    const correctPredictions = matrix.reduce(
      (sum, row, i) => sum + row[i], 
      0
    );

    const accuracy = correctPredictions / totalPredictions;

    return {
      totalPredictions,
      correctPredictions,
      accuracy,
    };
  }

  /**
   * Export confusion matrix to CSV
   */
  static toCSV(predictions: Prediction[]): string {
    const { matrix, classes } = this.generate(predictions);

    const header = ',' + classes.join(',');
    const rows = matrix.map((row, i) => `${classes[i]},${row.join(',')}`);

    return [header, ...rows].join('\n');
  }
}
