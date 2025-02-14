import sys
import json
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np

# Charger le modèle et le tokenizer
model_name = "../Model/llm/mistral-7b-instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

def get_embeddings(texts):
    # Tokeniser les textes
    encoded_input = tokenizer(texts, padding=True, truncation=True, return_tensors='pt', max_length=512)
    
    # Obtenir les embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)
        
    # Utiliser la moyenne des derniers hidden states comme embeddings
    embeddings = model_output.last_hidden_state.mean(dim=1)
    
    # Convertir en liste pour la sérialisation JSON
    return embeddings.numpy().tolist()

# Boucle principale pour traiter les entrées
print("Embedding service ready", flush=True)
for line in sys.stdin:
    try:
        data = json.loads(line)
        texts = data['texts']
        embeddings = get_embeddings(texts)
        response = {'embeddings': embeddings}
        print(json.dumps(response), flush=True)
    except Exception as e:
        print(json.dumps({'error': str(e)}), flush=True)
