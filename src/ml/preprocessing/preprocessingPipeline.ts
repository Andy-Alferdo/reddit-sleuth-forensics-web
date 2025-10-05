/**
 * Preprocessing Pipeline
 * 
 * Main orchestrator for the preprocessing workflow
 */

import { DataLoader, RedditPost } from './dataLoader';
import { TextCleaner } from './textCleaner';
import { FeatureExtractor, ExtractedFeatures } from './featureExtractor';

export class PreprocessingPipeline {
  /**
   * Run full preprocessing pipeline
   * 
   * TODO: UPDATE THIS PATH to point to your Reddit dataset file
   * Example: const datasetPath = './data/reddit_dataset.json';
   */
  static async run(datasetPath: string): Promise<{
    features: ExtractedFeatures[];
    stats: any;
  }> {
    console.log('Starting preprocessing pipeline...');

    // Step 1: Load data
    console.log('Step 1: Loading data...');
    let posts: RedditPost[];
    
    if (datasetPath.endsWith('.json')) {
      posts = await DataLoader.loadFromJSON(datasetPath);
    } else if (datasetPath.endsWith('.csv')) {
      posts = await DataLoader.loadFromCSV(datasetPath);
    } else {
      throw new Error('Unsupported file format. Use .json or .csv');
    }

    const dataStats = DataLoader.getStats(posts);
    console.log('Data loaded:', dataStats);

    // Step 2: Clean text
    console.log('Step 2: Cleaning text...');
    const cleanedTexts = posts.map(post => {
      const combinedText = `${post.title} ${post.text}`;
      return TextCleaner.cleanText(combinedText);
    });

    // Step 3: Extract features
    console.log('Step 3: Extracting features...');
    const features = FeatureExtractor.extractBatch(posts, cleanedTexts);
    const featureStats = FeatureExtractor.getFeatureStats(features);
    console.log('Feature extraction complete:', featureStats);

    // Step 4: Filter out empty or too short posts
    console.log('Step 4: Filtering data...');
    const filteredFeatures = features.filter(f => f.word_count >= 3);
    console.log(`Filtered: ${features.length} -> ${filteredFeatures.length} posts`);

    return {
      features: filteredFeatures,
      stats: {
        original: dataStats,
        features: featureStats,
        filtered: {
          originalCount: features.length,
          filteredCount: filteredFeatures.length,
          removedCount: features.length - filteredFeatures.length,
        },
      },
    };
  }

  /**
   * Export preprocessed data to JSON
   */
  static exportToJSON(features: ExtractedFeatures[]): string {
    return JSON.stringify(features, null, 2);
  }

  /**
   * Export preprocessed data to CSV
   */
  static exportToCSV(features: ExtractedFeatures[]): string {
    if (features.length === 0) return '';

    const headers = Object.keys(features[0]);
    const rows = features.map(f => 
      headers.map(h => (f as any)[h]).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
