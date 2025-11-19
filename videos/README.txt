DOSSIER VIDÉOS
==============

Instructions pour ajouter des vidéos :
---------------------------------------

Les vidéos doivent être hébergées sur une plateforme externe :
- YouTube (recommandé)
- Vimeo
- Dailymotion

Procédure :
-----------

1. TÉLÉCHARGER VOS VIDÉOS sur YouTube
   - Créez une chaîne YouTube pour la campagne
   - Téléchargez vos vidéos de campagne
   - Configurez la visibilité (publique ou non répertoriée)

2. RÉCUPÉRER LE CODE D'INTÉGRATION
   - Cliquez sur "Partager" sous la vidéo
   - Sélectionnez "Intégrer"
   - Copiez le code iframe

3. AJOUTER LA VIDÉO DANS LE SITE
   - Ouvrez index.html
   - Trouvez la section "Videos Section" (ligne 161)
   - Remplacez le contenu de <div id="videosGrid"> avec :

   <div class="video-item">
       <iframe src="https://www.youtube.com/embed/VIDEO_ID"
               allowfullscreen
               loading="lazy">
       </iframe>
       <div class="video-info">
           <h3>Titre de la vidéo</h3>
           <p>Description courte de la vidéo</p>
       </div>
   </div>

4. EXEMPLE COMPLET
   <div class="videos-grid" id="videosGrid">
       <div class="video-item">
           <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                   allowfullscreen
                   loading="lazy">
           </iframe>
           <div class="video-info">
               <h3>Présentation du programme</h3>
               <p>Découvrez nos principales propositions pour Senlis</p>
           </div>
       </div>

       <div class="video-item">
           <iframe src="https://www.youtube.com/embed/AUTRE_VIDEO_ID"
                   allowfullscreen
                   loading="lazy">
           </iframe>
           <div class="video-info">
               <h3>Interview de la candidate</h3>
               <p>Pascale Loiseleur répond à vos questions</p>
           </div>
       </div>
   </div>

Conseils :
----------
- Ajoutez des titres et descriptions pertinents
- Optimisez vos vidéos YouTube (miniatures, titres, descriptions)
- Activez les sous-titres pour l'accessibilité
- Vidéos courtes (2-5 minutes) pour une meilleure engagement

Note : Ce dossier est vide car les vidéos sont hébergées en ligne.
