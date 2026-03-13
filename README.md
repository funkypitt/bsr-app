# Bibliothèque Sonore

Application mobile pour la bibliothèque sonore [e-bibliomedia Lausanne](https://lausanne.ebibliomedia.ch). Permet de chercher, emprunter, réserver et écouter des livres audio depuis la collection numérique de la bibliothèque.

## Fonctionnalités

- **Recherche** — recherche plein texte dans le catalogue, filtre livres audio
- **Emprunts & réservations** — emprunter, réserver, retourner, annuler
- **Écoute** — lecteur audio HTML5 intégré (Cantooka)
- **Progression** — sauvegarde automatique de la position de lecture (locale + serveur)
- **Hors-ligne** — cache local des métadonnées via AsyncStorage
- **Authentification** — OAuth2 avec rafraîchissement de token

## Stack technique

- **React Native** + **Expo SDK 55** (TypeScript)
- **Expo Router** — navigation par fichiers
- **AsyncStorage** — cache local (livres, positions de lecture)
- **Expo Secure Store** — stockage des tokens d'authentification
- **WebView** — lecteur audio Cantooka intégré
- **OPDS 2.0** — protocole de communication avec la bibliothèque

## Structure

```
app/                  # Écrans (Expo Router)
  (tabs)/             # Onglets : Recherche, Mes emprunts, Paramètres
  book/[id].tsx       # Détail du livre
  player/[id].tsx     # Lecteur audio
  login.tsx           # Connexion
src/
  api/client.ts       # Client OPDS (auth, recherche, emprunts)
  context/auth.tsx    # Contexte d'authentification
  store.ts            # Cache local (AsyncStorage)
  theme.ts            # Design tokens
  types/              # Interfaces TypeScript
```

## Développement

```bash
npm install
npx expo start
```

## Build

```bash
# Android (APK)
eas build --profile preview --platform android

# Android (AAB pour Play Store)
eas build --profile production --platform android
```

## Identifiants des apps

- iOS : `ch.ebibliomedia.bsr`
- Android : `ch.ebibliomedia.bsr`
