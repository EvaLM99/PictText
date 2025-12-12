# PictText

Réseau social avec messagerie en temps réel.

## Installation

### 1. Backend (server)
```bash
cd server
npm install
cp .env.example .env
```
Modifiez le fichier `.env` avec vos vraies valeurs :
- `MONGO_URI` : Votre URI MongoDB
- `JWT_SECRET` : Une clé secrète pour les tokens JWT
- `REFRESH_SECRET` : Une clé secrète pour les refresh tokens
- `CLIENT_URL` : L'URL de votre frontend
```bash
npm start
```

### 2. Frontend (client)
```bash
cd client
npm install
cp .env.example .env
```
Modifiez le fichier `.env` avec l'URL de votre backend :
- `REACT_APP_API_URL` : URL du serveur backend
```bash
npm start
```

## Technologies utilisées

- **Frontend** : React, Material-UI, Socket.io-client
- **Backend** : Node.js, Express, MongoDB, Socket.io
- **Authentification** : JWT

## Variables d'environnement

Consultez les fichiers `.env.example` dans chaque dossier pour voir les variables nécessaires.