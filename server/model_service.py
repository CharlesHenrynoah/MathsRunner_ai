import requests
import os
import json
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
CHUNKS_DIR = '/Users/charles-henrynoah/Desktop/MathMastery 2/Model'

def load_chunks():
    """Load all chunks from the Model directory"""
    chunks = []
    for filename in os.listdir(CHUNKS_DIR):
        if filename.endswith('.txt'):
            with open(os.path.join(CHUNKS_DIR, filename), 'r', encoding='utf-8') as f:
                chunks.append(f.read().strip())
    return chunks

def extract_user_stats(prompt):
    """Extract user statistics from the prompt"""
    stats = {}
    
    # Extraire les statistiques personnelles
    stats_match = re.search(r'Statistiques de l\'utilisateur :\s*- Niveau actuel : (.*?)\s*- Score moyen : (.*?)\s*- Meilleur score : (.*?)\s*- Temps de réponse moyen : (.*?)s', prompt, re.DOTALL)
    if stats_match:
        stats['niveau'] = stats_match.group(1).strip()
        stats['score_moyen'] = float(stats_match.group(2).strip())
        stats['meilleur_score'] = float(stats_match.group(3).strip())
        stats['temps_moyen'] = float(stats_match.group(4).strip())
    
    # Extraire les derniers exercices
    exercices_match = re.search(r'Derniers exercices :\s*((?:- .*?\n)*)', prompt, re.DOTALL)
    if exercices_match:
        exercices_text = exercices_match.group(1)
        stats['derniers_exercices'] = []
        for line in exercices_text.split('\n'):
            if line.strip().startswith('-'):
                ex_match = re.match(r'- (.*?) \((Réussi|Échoué)\) en ([\d.]+)s', line.strip())
                if ex_match:
                    stats['derniers_exercices'].append({
                        'type': ex_match.group(1),
                        'succes': ex_match.group(2) == 'Réussi',
                        'temps': float(ex_match.group(3))
                    })
    
    # Extraire les performances par type
    perf_match = re.search(r'Performances par type :\s*(.*?)(?:\n\n|$)', prompt, re.DOTALL)
    if perf_match:
        perfs_text = perf_match.group(1)
        stats['performances'] = {}
        for line in perfs_text.split('\n'):
            if line.strip().startswith('-'):
                type_match = re.match(r'- (.*?): ([\d.]+)% de réussite, ([\d.]+)s en moyenne', line.strip())
                if type_match:
                    type_name = type_match.group(1)
                    stats['performances'][type_name] = {
                        'reussite': float(type_match.group(2)),
                        'temps': float(type_match.group(3))
                    }
    
    # Extraire les tendances
    trends_match = re.search(r'Tendances récentes :\s*(.*?)(?:\n\n|$)', prompt, re.DOTALL)
    if trends_match:
        trends_text = trends_match.group(1)
        stats['tendances'] = []
        for line in trends_text.split('\n'):
            if line.strip().startswith('-'):
                trend_match = re.match(r'- (\d+/\d+/\d+): Score ([\d.]+), (\d+) sessions', line.strip())
                if trend_match:
                    stats['tendances'].append({
                        'date': trend_match.group(1),
                        'score': float(trend_match.group(2)),
                        'sessions': int(trend_match.group(3))
                    })
    
    return stats

def generate_response_with_context(prompt, user_stats):
    """Generate a response using Gemini API with context from chunks and user data"""
    try:
        # Load relevant chunks
        chunks = load_chunks()
        
        # Combine chunks into context
        context = "\n".join(chunks)
        
        # Create a comprehensive prompt with context and user stats
        enhanced_prompt = f"""
Context from mathematical knowledge base:
{context}

User Information:
Level: {user_stats.get('niveau', 'Unknown')}
Score: {user_stats.get('score_moyen', 'Unknown')}

User Question:
{prompt}

Please provide a response that:
1. Uses the mathematical context provided
2. Is appropriate for the user's level
3. Helps them progress in their learning journey
"""

        headers = {
            'Content-Type': 'application/json'
        }
        
        data = {
            'contents': [{
                'parts': [{
                    'text': enhanced_prompt
                }]
            }]
        }
        
        response = requests.post(
            f'{GEMINI_API_URL}?key={GEMINI_API_KEY}',
            headers=headers,
            json=data
        )
        response.raise_for_status()
        result = response.json()
        
        if 'candidates' in result and len(result['candidates']) > 0:
            return result['candidates'][0].get('content', {}).get('parts', [{}])[0].get('text', '')
        return ''
        
    except Exception as e:
        print(f"Error generating response: {str(e)}")
        return ''

def process_prompt(prompt):
    """Process the prompt and generate a response"""
    # Extract user stats
    user_stats = extract_user_stats(prompt)
    
    # Clean the prompt to get just the question
    question_match = re.search(r'Question: (.*?)\s*\[/INST\]', prompt)
    if question_match:
        question = question_match.group(1)
    else:
        question = prompt
    
    # Generate response with context and user stats
    response = generate_response_with_context(question, user_stats)
    
    # Questions sur le temps de réponse
    if "temps" in question and "moyen" in question:
        if 'temps_moyen' in user_stats:
            temps_global = user_stats['temps_moyen']
            details_temps = []
            if 'performances' in user_stats:
                for type_ex, perf in user_stats['performances'].items():
                    details_temps.append(f"{perf['temps']}s en {type_ex}")
            
            reponse = f"Votre temps de réponse moyen est de {temps_global}s. "
            if details_temps:
                reponse += f"En détail : {', '.join(details_temps)}."
            return reponse
    
    # Questions sur le score
    if "score" in question:
        if "dernier" in question or "dernière partie" in question:
            if 'tendances' in user_stats and user_stats['tendances']:
                dernier_score = user_stats['tendances'][0]['score']
                return f"Lors de votre dernière partie, vous avez obtenu un score de {dernier_score}."
        elif "meilleur" in question:
            return f"Votre meilleur score est de {user_stats['meilleur_score']}."
        else:
            return f"Votre score moyen est de {user_stats['score_moyen']}. Votre meilleur score est de {user_stats['meilleur_score']}."
    
    # Questions sur les performances par type d'exercice
    if "performance" in question or "exercice" in question:
        if 'performances' in user_stats:
            details = []
            meilleur_type = None
            meilleur_taux = 0
            pire_type = None
            pire_taux = 100
            
            for type_ex, perf in user_stats['performances'].items():
                details.append(f"en {type_ex} : {perf['reussite']}% de réussite en {perf['temps']}s en moyenne")
                if perf['reussite'] > meilleur_taux:
                    meilleur_taux = perf['reussite']
                    meilleur_type = type_ex
                if perf['reussite'] < pire_taux:
                    pire_taux = perf['reussite']
                    pire_type = type_ex
            
            reponse = f"Vos performances : {'. '.join(details)}. "
            if meilleur_type and pire_type:
                reponse += f"\nVous excellez en {meilleur_type} ({meilleur_taux}%) mais vous pourriez vous améliorer en {pire_type} ({pire_taux}%)."
            return reponse
    
    # Questions sur la progression
    if "progression" in question or "évolution" in question or "tendance" in question:
        if 'tendances' in user_stats and len(user_stats['tendances']) > 1:
            trends = user_stats['tendances']
            first_trend = trends[-1]
            last_trend = trends[0]
            diff = last_trend['score'] - first_trend['score']
            direction = "augmenté" if diff > 0 else "diminué" if diff < 0 else "maintenu"
            return f"Sur les {len(trends)} derniers jours, votre score a {direction} de {abs(diff):.1f} points, passant de {first_trend['score']} à {last_trend['score']}."
    
    # Questions sur le niveau
    if "niveau" in question:
        return f"Vous êtes actuellement au niveau {user_stats['niveau']}."
    
    # Salutations ou question générale
    if "bonjour" in question or "salut" in question or "ça va" in question:
        return f"Bonjour ! Je suis votre assistant mathématique. Vous êtes niveau {user_stats['niveau']} avec un score moyen de {user_stats['score_moyen']}. Comment puis-je vous aider aujourd'hui ?"
    
    # Question non reconnue
    return "Je ne suis pas sûr de comprendre votre question. Vous pouvez me demander des informations sur :\n" + \
           "- Votre temps de réponse moyen\n" + \
           "- Vos scores (dernier, meilleur, moyen)\n" + \
           "- Vos performances par type d'exercice\n" + \
           "- Votre progression\n" + \
           "- Votre niveau actuel"

def main():
    """Main function to process input and generate responses"""
    for line in sys.stdin:
        try:
            data = json.loads(line)
            prompt = data.get('prompt', '')
            
            response = process_prompt(prompt)
            
            print(json.dumps({'response': response}))
            sys.stdout.flush()
            
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON input'}))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({'error': str(e)}))
            sys.stdout.flush()

if __name__ == '__main__':
    main()
