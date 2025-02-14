# MathsRunner_ai

1. Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants sur votre machine :

    Node.js (vérifiez avec node -v)
    npm (inclus avec Node.js, vérifiez avec npm -v)

Si vous souhaitez utiliser la partie Machine Learning du projet, Python et pip doivent également être installés.
2. Installation des dépendances

Dans le répertoire du projet, exécutez la commande suivante pour installer toutes les dépendances nécessaires :

npm install

Cela téléchargera et configurera toutes les bibliothèques requises listées dans package.json.

Si la partie Machine Learning est requise, installez également les dépendances Python :

pip install -r requirements.txt

3. Lancer le projet en mode développement

Pour démarrer l'application en mode développement, utilisez la commande :

npm run dev

Cela exécute le serveur Express en mode développement avec tsx.
