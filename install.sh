#!/bin/bash

# Installer les dépendances du serveur
echo "Installation des dépendances du serveur..."
cd server
npm install

# Installer les dépendances du client
echo "Installation des dépendances du client..."
cd ..
npm install axios

# Créer le dossier data s'il n'existe pas
echo "Création du dossier data..."
mkdir -p server/data

# Donner les permissions d'exécution
chmod +x install.sh

echo "Installation terminée !"
echo "Pour démarrer le serveur : cd server && npm start"
