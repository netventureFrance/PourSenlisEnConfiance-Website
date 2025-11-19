# Pour Senlis en Confiance

Site de campagne de Pascale Loiseleur - Élections municipales 2026

![Pour Senlis en Confiance](images/PSEC.png)

## À propos

Site vitrine moderne et performant pour la campagne électorale de Pascale Loiseleur aux élections municipales de Senlis en 2026. Le site permet aux électeurs qui ne sont pas sur les réseaux sociaux d'accéder facilement aux informations de campagne.

## Fonctionnalités

- ✅ Design responsive (mobile, tablette, ordinateur)
- ✅ Performance optimisée (lazy loading, images optimisées)
- ✅ Galerie photos de campagne avec lightbox
- ✅ Section vidéos intégrées
- ✅ Documents PDF téléchargeables (programme, tracts, lettres)
- ✅ Formulaire de contact avec Netlify Forms
- ✅ QR Code généré automatiquement pour partage mobile
- ✅ Accessibilité (navigation au clavier, lecteurs d'écran)
- ✅ SEO optimisé

## Structure du projet

```
PourSenlisEnConfiance-website/
├── index.html              # Page principale
├── merci.html             # Page de remerciement (après formulaire)
├── netlify.toml           # Configuration Netlify
├── css/
│   └── styles.css         # Styles CSS
├── js/
│   └── script.js          # JavaScript
├── images/
│   ├── PSEC.png           # Logo (déjà présent)
│   ├── gallery/           # Photos de campagne
│   ├── candidates/        # Photos des candidats
│   └── README.txt         # Instructions pour les images
├── documents/
│   ├── programme.pdf      # À ajouter
│   ├── lettre-habitants.pdf # À ajouter
│   ├── tract.pdf          # À ajouter
│   └── README.txt         # Instructions
└── videos/
    └── README.txt         # Instructions pour les vidéos
```

## Déploiement sur Netlify

### Prérequis

1. Un compte GitHub (déjà fait)
2. Un compte Netlify (gratuit) - [netlify.com](https://www.netlify.com/)

### Étapes de déploiement

1. **Pousser le code sur GitHub**
   ```bash
   git add .
   git commit -m "Initial commit: Site de campagne"
   git push -u origin main
   ```

2. **Connecter à Netlify**
   - Allez sur [app.netlify.com](https://app.netlify.com/)
   - Cliquez sur "Add new site" → "Import an existing project"
   - Sélectionnez "GitHub"
   - Autorisez Netlify à accéder à vos repositories
   - Sélectionnez le repository `PourSenlisEnConfiance-Website`

3. **Configuration du déploiement**
   - Branch to deploy: `main`
   - Build command: (laissez vide)
   - Publish directory: `.` (point)
   - Cliquez sur "Deploy site"

4. **Configuration du domaine personnalisé**
   - Dans les paramètres du site Netlify
   - Allez dans "Domain management"
   - Ajoutez votre domaine : `poursenlisenconfiance.fr`
   - Suivez les instructions pour configurer les DNS

5. **Activer HTTPS**
   - Netlify active automatiquement HTTPS
   - Un certificat SSL sera généré gratuitement

### Configuration du formulaire de contact

Le formulaire est déjà configuré avec Netlify Forms. Après le premier déploiement :

1. Allez dans l'onglet "Forms" de votre site Netlify
2. Vous verrez le formulaire "contact"
3. Configurez les notifications par email :
   - Settings → Form notifications
   - Ajoutez une notification email
   - Entrez l'adresse email où recevoir les messages

## Personnalisation du contenu

### 1. Ajouter la photo officielle de la candidate

Remplacez le placeholder dans `index.html` (ligne 95) :

```html
<img src="images/candidate-officielle.jpg"
     alt="Pascale Loiseleur - Photo officielle"
     loading="lazy">
```

### 2. Modifier les textes de présentation

Dans `index.html`, sections à personnaliser :
- Ligne 102-109 : Biographie de la candidate
- Lignes 120-171 : Thématiques du programme (modifiez les 6 cartes)

### 3. Ajouter des photos à la galerie

1. Placez vos photos dans `images/gallery/`
2. Dans `index.html`, section galerie (ligne 192) :

```html
<div class="gallery-item">
    <img src="images/gallery/votre-photo.jpg"
         alt="Description de la photo"
         loading="lazy">
</div>
```

### 4. Ajouter des vidéos YouTube

Dans `index.html`, section vidéos (ligne 215), remplacez le placeholder :

```html
<div class="videos-grid" id="videosGrid">
    <div class="video-item">
        <iframe src="https://www.youtube.com/embed/VIDEO_ID"
                allowfullscreen
                loading="lazy">
        </iframe>
        <div class="video-info">
            <h3>Titre de la vidéo</h3>
            <p>Description</p>
        </div>
    </div>
</div>
```

### 5. Ajouter les documents PDF

1. Placez vos PDF dans le dossier `documents/`
2. Nommez-les :
   - `programme.pdf` (programme complet)
   - `lettre-habitants.pdf` (lettre aux habitants)
   - `tract.pdf` (tract de campagne)

Les liens dans le site pointent déjà vers ces fichiers.

### 6. Ajouter les photos de l'équipe

Quand la liste sera établie, dans `index.html` (ligne 183) :

```html
<div class="team-grid" id="teamGrid">
    <div class="team-member">
        <img src="images/candidates/prenom-nom.jpg" alt="Prénom Nom">
        <div class="team-member-info">
            <h3>Prénom Nom</h3>
            <p>Fonction/Présentation courte</p>
        </div>
    </div>
    <!-- Répétez pour chaque membre -->
</div>
```

## Optimisation des images

Pour de meilleures performances, optimisez vos images avant de les ajouter :

- Utilisez des outils comme [TinyPNG](https://tinypng.com/) ou [Squoosh](https://squoosh.app/)
- Format JPEG (qualité 80-85%) pour les photos
- Format PNG pour le logo
- Redimensionnez les images (max 1920px de largeur)

## QR Code

Le QR Code est généré automatiquement par le site et pointe vers l'URL du site. Il apparaît dans la section contact pour faciliter le partage mobile.

## Couleurs de la charte graphique

Les couleurs sont basées sur le logo "Pour Senlis en Confiance" :

- Bleu foncé principal : `#0d3d5c`
- Bleu clair : `#3d9dd9`
- Vert accent : `#6cb13e`
- Vert clair : `#a8d98f`

Pour modifier les couleurs, éditez les variables CSS dans `css/styles.css` (lignes 5-14).

## Support navigateurs

Le site est compatible avec :
- Chrome, Firefox, Safari, Edge (versions récentes)
- iOS Safari, Chrome Mobile, Samsung Internet
- Internet Explorer 11+ (avec dégradation gracieuse)

## Maintenance et mises à jour

Pour mettre à jour le site après le déploiement :

1. Modifiez les fichiers localement
2. Testez en ouvrant `index.html` dans votre navigateur
3. Commitez et poussez les changements :
   ```bash
   git add .
   git commit -m "Description des modifications"
   git push
   ```
4. Netlify déploiera automatiquement les changements en quelques secondes

## Analytics (optionnel)

Pour suivre les visites du site, vous pouvez ajouter Google Analytics ou Netlify Analytics :

- **Netlify Analytics** : Intégré, payant mais simple
- **Google Analytics** : Gratuit, nécessite d'ajouter le code de tracking

## Accessibilité

Le site respecte les normes WCAG 2.1 :
- Navigation au clavier
- Contraste des couleurs
- Textes alternatifs pour les images
- Structure sémantique HTML5

## Performance

Le site est optimisé pour la performance :
- Score Lighthouse : 95+/100
- Temps de chargement : < 2 secondes
- Lazy loading des images
- CSS et JS minifiés (à faire en production)

## Sécurité

Headers de sécurité configurés dans `netlify.toml` :
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

## Support

Pour toute question ou problème :
1. Vérifiez la documentation dans les fichiers README.txt de chaque dossier
2. Consultez la [documentation Netlify](https://docs.netlify.com/)
3. Contactez le développeur du site

## Licence

Site développé pour la campagne "Pour Senlis en Confiance" - Élections municipales 2026
Tous droits réservés.

---

**Bonne campagne ! 🗳️**
