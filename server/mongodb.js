/**
 * MongoDB Data Layer for Reddit Sleuth
 * 
 * Handles connection to local MongoDB and provides collection helpers
 * for unstructured Reddit data (posts, comments, profiles, analyses, monitoring).
 * 
 * Usage:
 *   import { connectMongo, getCollections } from './mongodb.js';
 *   await connectMongo();
 *   const { posts, comments } = getCollections();
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reddit_sleuth';
const DB_NAME = 'reddit_sleuth';

let client = null;
let db = null;

/**
 * Connect to MongoDB and create indexes
 */
export async function connectMongo() {
  if (db) return db;

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);

  console.log(`[MongoDB] Connected to ${MONGODB_URI}`);

  // Create indexes for performance
  await Promise.all([
    // reddit_posts indexes
    db.collection('reddit_posts').createIndex({ case_id: 1 }),
    db.collection('reddit_posts').createIndex({ post_id: 1 }, { unique: true, sparse: true }),
    db.collection('reddit_posts').createIndex({ author: 1 }),
    db.collection('reddit_posts').createIndex({ subreddit: 1 }),
    db.collection('reddit_posts').createIndex({ collected_at: -1 }),

    // reddit_comments indexes
    db.collection('reddit_comments').createIndex({ case_id: 1 }),
    db.collection('reddit_comments').createIndex({ comment_id: 1 }, { unique: true, sparse: true }),
    db.collection('reddit_comments').createIndex({ author: 1 }),
    db.collection('reddit_comments').createIndex({ subreddit: 1 }),
    db.collection('reddit_comments').createIndex({ collected_at: -1 }),

    // user_profiles_analyzed indexes
    db.collection('user_profiles_analyzed').createIndex({ case_id: 1 }),
    db.collection('user_profiles_analyzed').createIndex({ username: 1 }),
    db.collection('user_profiles_analyzed').createIndex({ analyzed_at: -1 }),

    // analysis_results indexes
    db.collection('analysis_results').createIndex({ case_id: 1 }),
    db.collection('analysis_results').createIndex({ analysis_type: 1 }),
    db.collection('analysis_results').createIndex({ analyzed_at: -1 }),

    // monitoring_sessions indexes
    db.collection('monitoring_sessions').createIndex({ case_id: 1 }),
    db.collection('monitoring_sessions').createIndex({ ended_at: -1 }),
  ]);

  console.log('[MongoDB] Indexes created successfully');
  return db;
}

/**
 * Get MongoDB collection references
 */
export function getCollections() {
  if (!db) throw new Error('MongoDB not connected. Call connectMongo() first.');
  return {
    posts: db.collection('reddit_posts'),
    comments: db.collection('reddit_comments'),
    profiles: db.collection('user_profiles_analyzed'),
    analyses: db.collection('analysis_results'),
    sessions: db.collection('monitoring_sessions'),
  };
}

/**
 * Gracefully close the MongoDB connection
 */
export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed');
  }
}

export { db, client };
