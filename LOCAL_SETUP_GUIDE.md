# Running Reddit Sleuth Locally - Complete Setup Guide

This guide explains how to run the Reddit Sleuth project entirely on your local system without Lovable Cloud/Gateway, using your own PostgreSQL database and direct API access.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local PostgreSQL Database Setup](#local-postgresql-database-setup)
3. [Database Schema Recreation](#database-schema-recreation)
4. [Environment Configuration](#environment-configuration)
5. [API Keys Setup](#api-keys-setup)
6. [Modifying Edge Functions for Direct API Access](#modifying-edge-functions-for-direct-api-access)
7. [Using Custom Trained Models (Alternative to Gemini AI)](#using-custom-trained-models-alternative-to-gemini-ai)
8. [Adding Explainable AI (XAI)](#adding-explainable-ai-xai)
9. [Running the Application Locally](#running-the-application-locally)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install the following on your system:

1. **Node.js** (v18 or higher): https://nodejs.org/
2. **PostgreSQL** (v14 or higher): https://www.postgresql.org/download/
3. **Git**: https://git-scm.com/downloads
4. **npm** or **bun**: Comes with Node.js
5. **Supabase CLI** (optional, for edge functions): https://supabase.com/docs/guides/cli

---

## Local PostgreSQL Database Setup

### Step 1: Install PostgreSQL

**On Windows:**
- Download installer from https://www.postgresql.org/download/windows/
- Run installer and set a password for the `postgres` user
- Default port: 5432

**On macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**On Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Step 2: Create Database

Open PostgreSQL command line (psql):

```bash
# On Windows: Use pgAdmin or Command Prompt
psql -U postgres

# On macOS/Linux:
sudo -u postgres psql
```

Create the database:

```sql
CREATE DATABASE reddit_sleuth;
\c reddit_sleuth
```

### Step 3: Create Database User (Optional but recommended)

```sql
CREATE USER reddit_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE reddit_sleuth TO reddit_admin;
\c reddit_sleuth
GRANT ALL ON SCHEMA public TO reddit_admin;
```

---

## Database Schema Recreation

Connect to your database and run the following SQL commands to recreate the exact schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Note: RLS policies require auth.uid() which is Supabase-specific
-- For local PostgreSQL without Supabase Auth, you'll need to implement
-- authentication differently or disable RLS for development
```

### Adding Authentication Support (Without Supabase)

Since `auth.users` is Supabase-specific, you have two options:

**Option A: Use Supabase Local Development**
- Install Supabase CLI and run `supabase init` and `supabase start`
- This gives you local Supabase Auth

**Option B: Create Your Own Auth Table**
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key to profiles
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_fkey
FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add foreign key to user_roles
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
```

---

## Environment Configuration

### Step 1: Create `.env.local` File

Create a `.env.local` file in the project root:

```env
# Database Connection
VITE_DATABASE_URL=postgresql://reddit_admin:your_secure_password@localhost:5432/reddit_sleuth

# Reddit API Credentials
VITE_REDDIT_CLIENT_ID=your_reddit_client_id
VITE_REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Google Gemini API
VITE_GEMINI_API_KEY=your_gemini_api_key

# Application Settings
VITE_API_URL=http://localhost:3000
```

### Step 2: Update Supabase Client

Since you're not using Supabase, you'll need to replace the Supabase client with a PostgreSQL client.

Install PostgreSQL client:
```bash
npm install pg
```

Create a new database client file `src/lib/database.ts`:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: import.meta.env.VITE_DATABASE_URL,
  ssl: false // Set to true if using SSL
});

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result.rows;
};

export default pool;
```

---

## API Keys Setup

### 1. Reddit API Setup

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in:
   - **Name**: Reddit Sleuth Local
   - **App type**: Script
   - **Description**: Local development
   - **About URL**: http://localhost:8080
   - **Redirect URI**: http://localhost:8080/callback
4. Click "Create app"
5. Note down:
   - **Client ID** (under the app name)
   - **Client Secret** (next to "secret")

### 2. Google Gemini API Setup

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Select or create a Google Cloud project
4. Copy the API key
5. Add to `.env.local`

**Pricing**: https://ai.google.dev/pricing
- Gemini 2.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
- Has free tier with rate limits

---

## Modifying Edge Functions for Direct API Access

### Option 1: Convert to Express.js Backend

Create a local Express server `server/index.js`:

```javascript
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Reddit Scraper Endpoint
app.post('/api/reddit-scraper', async (req, res) => {
  const { username, type, subreddit } = req.body;
  
  try {
    // Get Reddit OAuth token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Fetch Reddit data based on type
    let data = {};
    
    if (type === 'user') {
      const aboutRes = await fetch(`https://oauth.reddit.com/user/${username}/about`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const postsRes = await fetch(`https://oauth.reddit.com/user/${username}/submitted?limit=100`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const commentsRes = await fetch(`https://oauth.reddit.com/user/${username}/comments?limit=100`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      
      data = {
        about: await aboutRes.json(),
        posts: await postsRes.json(),
        comments: await commentsRes.json()
      };
    } else if (type === 'community') {
      const aboutRes = await fetch(`https://oauth.reddit.com/r/${subreddit}/about`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const postsRes = await fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=100`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      
      data = {
        about: await aboutRes.json(),
        posts: await postsRes.json()
      };
    }
    
    res.json(data);
  } catch (error) {
    console.error('Reddit API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze Content Endpoint
app.post('/api/analyze-content', async (req, res) => {
  const { posts, comments } = req.body;
  
  try {
    // Format content for Gemini
    const formattedContent = [
      ...posts.map(p => `POST: ${p.title}\n${p.selftext || ''}\nSubreddit: ${p.subreddit}`),
      ...comments.map(c => `COMMENT: ${c.body}\nSubreddit: ${c.subreddit}`)
    ].join('\n\n');
    
    // Call Google Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the following Reddit content and provide sentiment analysis, detected locations, and behavior patterns in JSON format:\n\n${formattedContent}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );
    
    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysisText = data.candidates[0].content.parts[0].text;
    
    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

Install dependencies:
```bash
npm install express cors node-fetch dotenv
```

### Option 2: Use Supabase CLI Locally

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Start local Supabase (includes Auth, Database, Edge Functions)
supabase start

# This will give you local URLs for all services
```

Modify edge functions to use direct API calls:

**`supabase/functions/analyze-content/index.ts`** (Direct Gemini API):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { posts, comments } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    const formattedContent = [
      ...posts.map((p: any) => `POST: ${p.title}\n${p.selftext || ''}`),
      ...comments.map((c: any) => `COMMENT: ${c.body}`)
    ].join('\n\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Analyze this Reddit content and return JSON with sentiment, locations, patterns:\n\n${formattedContent}` }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.candidates[0].content.parts[0].text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## Using Custom Trained Models (Alternative to Gemini AI)

If you have trained your own machine learning model for Reddit content analysis, you can replace the Gemini AI integration with your custom model.

### Supported Model Formats

- **`.pkl`** (Python Pickle): Scikit-learn, traditional ML models
- **`.safetensors`**: PyTorch, Transformers models (secure format)
- **`.pt` / `.pth`**: PyTorch models
- **`.h5`** / **`.keras`**: TensorFlow/Keras models
- **`.onnx`**: Cross-platform ONNX models

### Option A: Run Model Locally

#### Step 1: Install Python Dependencies

Create `requirements.txt`:
```txt
flask==3.0.0
flask-cors==4.0.0
torch==2.1.0
transformers==4.35.0
safetensors==0.4.0
scikit-learn==1.3.2
numpy==1.24.3
```

Install:
```bash
pip install -r requirements.txt
```

#### Step 2: Create Model Inference Server

Create `server/model_server.py`:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from safetensors.torch import load_file
import pickle
import numpy as np

app = Flask(__name__)
CORS(app)

# Load your model
MODEL_PATH = "./models/reddit_classifier.safetensors"  # or .pkl, .pt
MODEL_TYPE = "transformer"  # or "sklearn", "pytorch"

# Initialize model based on type
if MODEL_TYPE == "transformer":
    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    model = AutoModelForSequenceClassification.from_pretrained(
        "bert-base-uncased",
        num_labels=3  # Adjust based on your model
    )
    # Load trained weights
    state_dict = load_file(MODEL_PATH)
    model.load_state_dict(state_dict)
    model.eval()
    
elif MODEL_TYPE == "sklearn":
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
        
elif MODEL_TYPE == "pytorch":
    model = torch.load(MODEL_PATH)
    model.eval()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        texts = data.get('texts', [])
        
        if MODEL_TYPE == "transformer":
            # Tokenize inputs
            inputs = tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )
            
            # Get predictions
            with torch.no_grad():
                outputs = model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            
            # Format results
            results = []
            for i, text in enumerate(texts):
                probs = predictions[i].tolist()
                predicted_class = torch.argmax(predictions[i]).item()
                
                results.append({
                    "text": text,
                    "prediction": predicted_class,
                    "confidence": probs[predicted_class],
                    "probabilities": {
                        "normal": probs[0],
                        "suspicious": probs[1],
                        "harmful": probs[2]
                    }
                })
        
        elif MODEL_TYPE == "sklearn":
            predictions = model.predict(texts)
            probabilities = model.predict_proba(texts)
            
            results = []
            for i, text in enumerate(texts):
                results.append({
                    "text": text,
                    "prediction": int(predictions[i]),
                    "confidence": float(np.max(probabilities[i])),
                    "probabilities": {
                        "normal": float(probabilities[i][0]),
                        "suspicious": float(probabilities[i][1]),
                        "harmful": float(probabilities[i][2])
                    }
                })
        
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model_type": MODEL_TYPE})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

#### Step 3: Start Model Server

```bash
python server/model_server.py
# Server runs on http://localhost:5000
```

#### Step 4: Update Edge Function to Use Custom Model

Modify `supabase/functions/analyze-content/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { posts, comments } = await req.json();
    
    // Format texts for analysis
    const texts = [
      ...posts.map((p: any) => `${p.title} ${p.selftext || ''}`),
      ...comments.map((c: any) => c.body)
    ];

    // Call your local model server
    const MODEL_SERVER_URL = Deno.env.get('MODEL_SERVER_URL') || 'http://localhost:5000';
    
    const response = await fetch(`${MODEL_SERVER_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts })
    });

    if (!response.ok) {
      throw new Error(`Model server error: ${response.status}`);
    }

    const predictions = await response.json();
    
    // Format response to match expected structure
    const analysis = {
      sentiment: calculateOverallSentiment(predictions.results),
      patterns: identifyPatterns(predictions.results),
      suspicious_content: predictions.results.filter(r => r.prediction === 1)
    };

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function calculateOverallSentiment(results: any[]) {
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const suspiciousCount = results.filter(r => r.prediction === 1).length;
  
  return {
    overall: suspiciousCount > results.length * 0.3 ? "suspicious" : "normal",
    confidence: avgConfidence,
    suspicious_ratio: suspiciousCount / results.length
  };
}

function identifyPatterns(results: any[]) {
  // Implement pattern identification logic based on predictions
  return results
    .filter(r => r.prediction !== 0)
    .map(r => ({
      text: r.text.substring(0, 100),
      category: r.prediction === 1 ? "suspicious" : "harmful",
      confidence: r.confidence
    }));
}
```

### Option B: Host Model Online

#### 1. Using Hugging Face Model Hub

**Upload your model:**

```bash
# Install Hugging Face CLI
pip install huggingface_hub

# Login
huggingface-cli login

# Upload model
python upload_model.py
```

**`upload_model.py`:**
```python
from huggingface_hub import HfApi, create_repo
import torch

# Create repository
repo_id = "your-username/reddit-sleuth-model"
create_repo(repo_id, private=False)

# Upload model files
api = HfApi()
api.upload_file(
    path_or_fileobj="./models/reddit_classifier.safetensors",
    path_in_repo="model.safetensors",
    repo_id=repo_id,
)
api.upload_file(
    path_or_fileobj="./models/config.json",
    path_in_repo="config.json",
    repo_id=repo_id,
)
```

**Load model in your application:**

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Load from Hugging Face Hub
model = AutoModelForSequenceClassification.from_pretrained("your-username/reddit-sleuth-model")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
```

#### 2. Using Cloud Storage (S3, Google Cloud Storage)

**Upload to AWS S3:**

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Upload model
aws s3 cp ./models/reddit_classifier.safetensors s3://your-bucket/models/
```

**Download in application:**

```python
import boto3
from safetensors.torch import load_file

# Download from S3
s3 = boto3.client('s3')
s3.download_file('your-bucket', 'models/reddit_classifier.safetensors', '/tmp/model.safetensors')

# Load model
state_dict = load_file('/tmp/model.safetensors')
model.load_state_dict(state_dict)
```

#### 3. Deploy Model as API (Hugging Face Inference API)

```python
import requests

API_URL = "https://api-inference.huggingface.co/models/your-username/reddit-sleuth-model"
headers = {"Authorization": f"Bearer {HUGGING_FACE_API_TOKEN}"}

def query(texts):
    response = requests.post(API_URL, headers=headers, json={"inputs": texts})
    return response.json()

# Use in your application
results = query(["Text to analyze", "Another text"])
```

---

## Adding Explainable AI (XAI)

Implement XAI to show why your model made specific predictions.

### Method 1: LIME (Local Interpretable Model-agnostic Explanations)

#### Install LIME

```bash
pip install lime
```

#### Add to Model Server

```python
from lime.lime_text import LimeTextExplainer

# Initialize explainer
explainer = LimeTextExplainer(class_names=['normal', 'suspicious', 'harmful'])

@app.route('/explain', methods=['POST'])
def explain():
    try:
        data = request.json
        text = data.get('text')
        
        # Define prediction function for LIME
        def predict_proba(texts):
            inputs = tokenizer(
                texts,
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt"
            )
            with torch.no_grad():
                outputs = model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            return probs.numpy()
        
        # Generate explanation
        exp = explainer.explain_instance(
            text,
            predict_proba,
            num_features=10,
            num_samples=1000
        )
        
        # Get feature importance
        explanation = exp.as_list()
        prediction = exp.predict_proba.argmax()
        
        return jsonify({
            "text": text,
            "prediction": int(prediction),
            "explanation": [
                {
                    "feature": feature,
                    "importance": float(weight)
                }
                for feature, weight in explanation
            ],
            "html": exp.as_html()  # Visual representation
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### Method 2: SHAP (SHapley Additive exPlanations)

#### Install SHAP

```bash
pip install shap
```

#### Add to Model Server

```python
import shap

# Initialize SHAP explainer
# For transformer models
explainer = shap.Explainer(model, tokenizer)

@app.route('/explain-shap', methods=['POST'])
def explain_shap():
    try:
        data = request.json
        text = data.get('text')
        
        # Get SHAP values
        shap_values = explainer([text])
        
        # Extract token importance
        tokens = tokenizer.tokenize(text)
        values = shap_values.values[0]
        
        explanation = []
        for token, value in zip(tokens, values):
            explanation.append({
                "token": token,
                "importance": float(value[1])  # Importance for suspicious class
            })
        
        # Sort by absolute importance
        explanation.sort(key=lambda x: abs(x['importance']), reverse=True)
        
        return jsonify({
            "text": text,
            "explanation": explanation[:20],  # Top 20 tokens
            "visualization_data": {
                "tokens": tokens,
                "values": values.tolist()
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### Method 3: Attention Visualization (For Transformer Models)

```python
@app.route('/explain-attention', methods=['POST'])
def explain_attention():
    try:
        data = request.json
        text = data.get('text')
        
        # Get model attention weights
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        with torch.no_grad():
            outputs = model(**inputs, output_attentions=True)
            attentions = outputs.attentions  # Tuple of attention weights
        
        # Get last layer attention (most relevant for prediction)
        last_layer_attention = attentions[-1][0]  # [num_heads, seq_len, seq_len]
        
        # Average across attention heads
        avg_attention = last_layer_attention.mean(dim=0)  # [seq_len, seq_len]
        
        # Get attention to [CLS] token (used for classification)
        cls_attention = avg_attention[0, :].tolist()
        
        tokens = tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])
        
        explanation = [
            {
                "token": token,
                "attention_weight": float(weight)
            }
            for token, weight in zip(tokens, cls_attention)
        ]
        
        # Sort by attention weight
        explanation.sort(key=lambda x: x['attention_weight'], reverse=True)
        
        return jsonify({
            "text": text,
            "explanation": explanation,
            "method": "attention_weights"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### Frontend Integration - Display XAI Results

Create `src/components/ExplanationView.tsx`:

```typescript
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExplanationProps {
  text: string;
  explanation: Array<{
    feature: string;
    importance: number;
  }>;
}

export const ExplanationView: React.FC<ExplanationProps> = ({ text, explanation }) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Why This Prediction?</h3>
      
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Analyzed Text:</p>
        <p className="p-3 bg-muted rounded-md">{text}</p>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Key Contributing Factors:</p>
        <div className="space-y-2">
          {explanation.slice(0, 10).map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{item.feature}</span>
              <div className="flex items-center gap-2">
                <div 
                  className="h-2 rounded"
                  style={{
                    width: `${Math.abs(item.importance) * 100}px`,
                    backgroundColor: item.importance > 0 ? '#ef4444' : '#10b981'
                  }}
                />
                <Badge variant={item.importance > 0 ? 'destructive' : 'default'}>
                  {item.importance > 0 ? 'Increases Risk' : 'Decreases Risk'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
```

### Update Analysis Page to Include XAI

```typescript
const explainPrediction = async (text: string) => {
  const response = await fetch('http://localhost:5000/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  
  const explanation = await response.json();
  setExplanationData(explanation);
};

// In your component JSX
{explanationData && (
  <ExplanationView 
    text={explanationData.text}
    explanation={explanationData.explanation}
  />
)}
```

---

## Running the Application Locally

### Option 1: With Express Backend

1. **Start PostgreSQL**:
   ```bash
   # Should already be running from earlier setup
   ```

2. **Start Express Backend**:
   ```bash
   cd server
   node index.js
   # Server runs on http://localhost:3000
   ```

3. **Start React Frontend**:
   ```bash
   npm install
   npm run dev
   # App runs on http://localhost:8080
   ```

4. **Update Frontend API Calls**:
   Replace Supabase function calls with direct API calls:

   ```typescript
   // Instead of:
   const { data } = await supabase.functions.invoke('reddit-scraper', { body: { username } });

   // Use:
   const response = await fetch('http://localhost:3000/api/reddit-scraper', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ username, type: 'user' })
   });
   const data = await response.json();
   ```

### Option 2: With Supabase CLI

1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Deploy functions locally**:
   ```bash
   supabase functions deploy reddit-scraper
   supabase functions deploy analyze-content
   ```

3. **Update `.env.local`** with local Supabase URLs (provided by `supabase start`)

4. **Start React Frontend**:
   ```bash
   npm run dev
   ```

---

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS
services.msc  # Windows (look for postgresql)

# Test connection
psql -U reddit_admin -d reddit_sleuth -h localhost
```

### Reddit API Rate Limits
- Reddit limits: 60 requests per minute
- Solution: Implement request queuing or caching

### Gemini API Errors
- **403 Forbidden**: Invalid API key
- **429 Too Many Requests**: Rate limited (free tier: 15 RPM)
- **400 Bad Request**: Check request format matches Gemini API specs

### CORS Issues
- Ensure backend has proper CORS headers
- For Express, use `cors` middleware
- For local Supabase, CORS is handled automatically

### Database Permission Errors
```sql
-- Grant all permissions to your user
GRANT ALL PRIVILEGES ON DATABASE reddit_sleuth TO reddit_admin;
\c reddit_sleuth
GRANT ALL ON SCHEMA public TO reddit_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO reddit_admin;
```

---

## Summary

You now have a complete local setup:

1. ✅ Local PostgreSQL database with Reddit Sleuth schema
2. ✅ Direct Reddit API access (no gateway)
3. ✅ Direct Google Gemini API access (no Lovable AI Gateway)
4. ✅ Local backend (Express or Supabase CLI)
5. ✅ React frontend running locally

**Key Differences from Lovable Cloud:**
- You manage your own database
- You pay for API usage directly (Reddit is free, Gemini has free tier)
- You handle authentication yourself
- You deploy and scale your own infrastructure

**Cost Estimates:**
- PostgreSQL: Free (self-hosted)
- Reddit API: Free (with rate limits)
- Gemini API: Free tier available, then ~$0.075 per 1M tokens
- Total: $0-5/month for hobby projects

**Next Steps:**
- Implement authentication (JWT, session-based, or use Supabase Auth locally)
- Add rate limiting to your API endpoints
- Set up monitoring and logging
- Consider Docker containers for easier deployment
