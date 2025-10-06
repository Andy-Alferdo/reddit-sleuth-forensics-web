# Reddit Sleuth - ML Training Pipeline

This directory contains Python scripts for training and evaluating BERT models on Reddit data for forensic analysis.

## 🚀 Setup

### 1. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

## 📁 Directory Structure

```
python_ml/
├── preprocessing/     # Data preprocessing pipeline
├── training/         # BERT model training
├── evaluation/       # Model evaluation & metrics
└── models/          # Saved models (auto-created)
```

## 🔄 Workflow

### Step 1: Preprocess Dataset
```bash
python -m python_ml.preprocessing.pipeline
```
- Loads your Reddit dataset
- Cleans and normalizes text
- Extracts features
- Saves preprocessed data

### Step 2: Train BERT Model
```bash
python -m python_ml.training.bert_trainer
```
- Fine-tunes BERT on preprocessed data
- Supports GPU acceleration (CUDA)
- Saves model checkpoints

### Step 3: Evaluate Model
```bash
python -m python_ml.evaluation.evaluate
```
- Calculates accuracy, precision, recall, F1
- Generates confusion matrix
- Saves evaluation report

## 📊 Dataset Format

Your Reddit dataset should be in CSV or JSON format with these fields:
- `text`: The Reddit post/comment content
- `label`: The classification label (e.g., 0 for normal, 1 for suspicious)

Example CSV:
```csv
text,label
"This is a normal post",0
"Suspicious content here",1
```

## 🔧 Configuration

Edit `training/config.py` to adjust:
- Batch size
- Learning rate
- Number of epochs
- Model name (different BERT variants)

## 💡 Tips

- GPU Training: Ensure PyTorch with CUDA is installed for faster training
- Dataset Size: Minimum 1000 samples recommended for good results
- Model Selection: `bert-base-uncased` is the default, use `bert-large-uncased` for better accuracy (slower)

## 📝 Notes

- Models are saved to `python_ml/models/`
- Evaluation reports saved to `python_ml/evaluation/reports/`
- Check TODO comments in each file for dataset path configuration
