# Model Training Module

This folder contains scripts for training machine learning models on preprocessed Reddit data.

## Purpose
Train pre-trained models (BERT, etc.) on your preprocessed Reddit dataset for various NLP tasks.

## Current Models
- **BERT** - Bidirectional Encoder Representations from Transformers

## Usage

1. **Prepare your dataset**: Ensure you've run the preprocessing pipeline
2. **Configure training**: Update training parameters in config files
3. **Add dataset**: Follow the TODO comments in the code to add your dataset
4. **Run training**: Execute the training script
5. **Monitor progress**: Track training metrics and loss

## Files

- `bertTrainer.ts` - BERT model training implementation
- `trainingConfig.ts` - Training hyperparameters and configuration
- `modelUtils.ts` - Model loading and saving utilities

## Training Process

1. Load preprocessed dataset
2. Tokenize text using BERT tokenizer
3. Split data into train/validation sets
4. Train model with specified hyperparameters
5. Validate and save best model

## Requirements

- Preprocessed dataset from `/preprocessing` folder
- Sufficient memory for model training
- GPU recommended for faster training (optional)
