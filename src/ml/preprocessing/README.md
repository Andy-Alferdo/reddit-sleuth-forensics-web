# Data Preprocessing Module

This folder contains utilities for preprocessing unlabeled Reddit datasets before model training.

## Purpose
Prepare raw, unlabeled Reddit data for machine learning model training by cleaning, normalizing, and extracting relevant features.

## Usage

1. **Place your dataset**: Add your Reddit dataset file to this folder
2. **Run preprocessing**: Execute the preprocessing pipeline
3. **Output**: Cleaned and formatted data ready for model training

## Files

- `dataLoader.ts` - Load and validate Reddit dataset files
- `textCleaner.ts` - Clean and normalize text data
- `featureExtractor.ts` - Extract relevant features from Reddit posts
- `dataValidator.ts` - Validate data quality and completeness
- `preprocessingPipeline.ts` - Main preprocessing pipeline orchestrator

## Dataset Format

Your Reddit dataset should be in JSON or CSV format with the following fields:
- `post_id` - Unique identifier for each post
- `title` - Post title
- `text` - Post content/body
- `subreddit` - Subreddit name
- `author` - Username (optional)
- `created_utc` - Timestamp (optional)
- `score` - Post score (optional)
- `num_comments` - Comment count (optional)
