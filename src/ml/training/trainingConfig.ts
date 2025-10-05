/**
 * Training Configuration
 * 
 * Hyperparameters and settings for model training
 */

export interface TrainingConfig {
  // Model parameters
  modelName: string;
  maxSequenceLength: number;
  
  // Training parameters
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number;
  
  // Data parameters
  trainTestSplit: number;
  randomSeed: number;
  
  // Output parameters
  saveModelPath: string;
  checkpointInterval: number;
}

/**
 * Default BERT training configuration
 * 
 * TODO: Adjust these parameters based on your dataset size and available resources
 */
export const DEFAULT_BERT_CONFIG: TrainingConfig = {
  // Model settings
  modelName: 'bert-base-uncased',
  maxSequenceLength: 128, // Adjust based on your average text length
  
  // Training settings
  batchSize: 16, // Reduce if running out of memory
  epochs: 3, // Increase for better performance, decrease for faster training
  learningRate: 2e-5, // Standard BERT learning rate
  validationSplit: 0.2, // 20% of data for validation
  
  // Data settings
  trainTestSplit: 0.8, // 80% train, 20% test
  randomSeed: 42, // For reproducibility
  
  // Output settings
  saveModelPath: './models/bert-reddit-model',
  checkpointInterval: 100, // Save checkpoint every N batches
};

/**
 * Get configuration for different dataset sizes
 */
export const getConfigForDatasetSize = (datasetSize: number): TrainingConfig => {
  const config = { ...DEFAULT_BERT_CONFIG };
  
  if (datasetSize < 1000) {
    // Small dataset
    config.batchSize = 8;
    config.epochs = 5;
  } else if (datasetSize < 10000) {
    // Medium dataset
    config.batchSize = 16;
    config.epochs = 3;
  } else {
    // Large dataset
    config.batchSize = 32;
    config.epochs = 2;
  }
  
  return config;
};
