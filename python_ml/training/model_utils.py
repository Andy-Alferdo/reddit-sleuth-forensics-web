"""
Model Utilities

Helper functions for model management, inference, and deployment.
"""

import torch
from pathlib import Path
from typing import List, Dict, Union
from transformers import BertTokenizer, BertForSequenceClassification


class ModelInference:
    """Inference utilities for trained BERT models."""
    
    def __init__(self, model_path: str, device: str = "auto"):
        """
        Initialize inference engine.
        
        Args:
            model_path: Path to saved model
            device: Device to use for inference
        """
        self.model_path = Path(model_path)
        
        # Auto-detect device
        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        print(f"Loading model for inference on: {self.device}")
        
        # Load model and tokenizer
        self.tokenizer = BertTokenizer.from_pretrained(self.model_path)
        self.model = BertForSequenceClassification.from_pretrained(self.model_path)
        self.model.to(self.device)
        self.model.eval()
        
        print(f"✓ Model loaded from: {self.model_path}")
    
    def predict(self, text: str, return_probabilities: bool = False) -> Union[int, Dict]:
        """
        Predict label for a single text.
        
        Args:
            text: Input text
            return_probabilities: Return class probabilities
            
        Returns:
            Predicted label or dict with label and probabilities
        """
        # Tokenize
        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=512,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        # Move to device
        input_ids = encoding['input_ids'].to(self.device)
        attention_mask = encoding['attention_mask'].to(self.device)
        
        # Predict
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=1)
            predicted_label = torch.argmax(probabilities, dim=1).item()
        
        if return_probabilities:
            return {
                'label': predicted_label,
                'probabilities': probabilities[0].cpu().numpy().tolist(),
                'confidence': probabilities[0][predicted_label].item()
            }
        
        return predicted_label
    
    def predict_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
        return_probabilities: bool = False
    ) -> List[Union[int, Dict]]:
        """
        Predict labels for multiple texts.
        
        Args:
            texts: List of input texts
            batch_size: Batch size for processing
            return_probabilities: Return class probabilities
            
        Returns:
            List of predictions
        """
        predictions = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            # Tokenize batch
            encodings = self.tokenizer(
                batch_texts,
                add_special_tokens=True,
                max_length=512,
                padding='max_length',
                truncation=True,
                return_tensors='pt'
            )
            
            # Move to device
            input_ids = encodings['input_ids'].to(self.device)
            attention_mask = encodings['attention_mask'].to(self.device)
            
            # Predict
            with torch.no_grad():
                outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
                logits = outputs.logits
                probabilities = torch.softmax(logits, dim=1)
                predicted_labels = torch.argmax(probabilities, dim=1)
            
            # Process results
            for j in range(len(batch_texts)):
                if return_probabilities:
                    predictions.append({
                        'label': predicted_labels[j].item(),
                        'probabilities': probabilities[j].cpu().numpy().tolist(),
                        'confidence': probabilities[j][predicted_labels[j]].item()
                    })
                else:
                    predictions.append(predicted_labels[j].item())
        
        return predictions


def get_model_info(model_path: str) -> Dict:
    """
    Get information about a saved model.
    
    Args:
        model_path: Path to saved model
        
    Returns:
        Dictionary with model information
    """
    model_path = Path(model_path)
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    
    # Load config
    import json
    config_path = model_path / 'config.json'
    if config_path.exists():
        with open(config_path, 'r') as f:
            config = json.load(f)
    else:
        config = {}
    
    # Get model size
    model_files = list(model_path.glob('*.bin')) + list(model_path.glob('*.safetensors'))
    total_size = sum(f.stat().st_size for f in model_files) / (1024 ** 2)  # MB
    
    return {
        'model_path': str(model_path),
        'model_type': config.get('model_type', 'unknown'),
        'num_labels': config.get('num_labels', 'unknown'),
        'vocab_size': config.get('vocab_size', 'unknown'),
        'size_mb': round(total_size, 2),
        'files': [f.name for f in model_files]
    }


# Example usage
if __name__ == "__main__":
    # Example: Load model and make predictions
    MODEL_PATH = "python_ml/models/bert_classifier"
    
    # Initialize inference
    inference = ModelInference(MODEL_PATH)
    
    # Single prediction
    test_text = "This is a test Reddit post"
    result = inference.predict(test_text, return_probabilities=True)
    
    print("\nSingle Prediction:")
    print(f"Text: {test_text}")
    print(f"Predicted label: {result['label']}")
    print(f"Confidence: {result['confidence']:.4f}")
    print(f"Probabilities: {result['probabilities']}")
    
    # Batch prediction
    test_texts = [
        "First test post",
        "Second test post",
        "Third test post"
    ]
    
    results = inference.predict_batch(test_texts, return_probabilities=True)
    
    print("\nBatch Predictions:")
    for text, result in zip(test_texts, results):
        print(f"\nText: {text}")
        print(f"Label: {result['label']}, Confidence: {result['confidence']:.4f}")
    
    # Get model info
    print("\nModel Information:")
    info = get_model_info(MODEL_PATH)
    for key, value in info.items():
        print(f"  {key}: {value}")
