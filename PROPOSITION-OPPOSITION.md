# Proposition — Repositionnement du site pour le travail d'opposition

**Date :** 15 mai 2026
**Contexte :** Élection municipale du 22 mars 2026 derrière nous. Le site, conçu pour la mobilisation électorale, doit évoluer pour accompagner notre rôle d'opposition au sein du conseil municipal.

---

## 1. Ce qui a déjà été fait

### Rapport quotidien désactivé
La fonction planifiée `daily-stats` (envoi automatique d'un email récapitulatif Plausible tous les jours à 3h du matin) est **désactivée** dans `netlify.toml`.

- Le code de la fonction est conservé intact (`netlify/functions/daily-stats.js`).
- Réactivation possible en deux lignes si besoin.
- Plausible continue de collecter les statistiques en arrière-plan — seul l'envoi quotidien est suspendu.

---

## 2. Inventaire — ce qui appartient à la phase campagne

Plusieurs pages et fonctions ont été bâties pour la campagne et n'ont plus de raison d'être actives. Aucune suppression n'a été faite, c'est un inventaire à valider :

| Élément | Rôle campagne | Statut suggéré |
|---|---|---|
| `procurations.html` | Procurations électorales | Archiver / retirer du menu |
| `liste.html` | Liste des candidats | Archiver ou transformer en page « L'équipe d'opposition » |
| `don.html` | Dons de campagne | Désactiver le formulaire |
| `admin/strategie.html` | Outil stratégie interne | À conserver en privé, ne pas maintenir |
| `admin/dashboard.html` | Tableau de bord campagne | À évaluer |
| Fonctions Netlify `submit-procuration`, `submit-liste`, `submit-donation`, `admin-match`, `confirm-match` | Workflows campagne | À désactiver progressivement |

**Recommandation :** ne rien supprimer pour l'instant. On masque dans la navigation, on garde le code en place le temps de stabiliser la nouvelle direction.

---

## 3. Pistes pour la phase opposition

Cinq directions possibles, à arbitrer ensemble. On peut commencer par une seule et étoffer ensuite.

### A. Rubrique « Tribune »
Publications régulières sur les décisions du conseil, nos positions, les votes auxquels nous nous sommes opposés. C'est généralement le cœur d'un site d'opposition — il crée la mémoire publique du mandat.

### B. Suivi des votes du conseil
Une page simple qui consigne chaque délibération : l'objet, le vote de notre groupe, la justification. Construit la crédibilité sur la durée et donne une matière unique aux journalistes locaux.

### C. Contact / Permanence
Une page claire « Comment joindre vos élus d'opposition » qui remplace les appels à l'action campagne sur la page d'accueil (formulaire de contact, horaires de permanence, coordonnées des conseillers).

### D. Newsletter recyclée
L'infrastructure newsletter est déjà en place. La transformer d'un outil de mobilisation campagne en un **bilan mensuel d'opposition** : décisions importantes, positions prises, dossiers à suivre.

### E. Refonte de la page d'accueil
Le hero actuel est construit autour de la date du 22 mars. Le remplacer par un cadrage du type « Votre groupe d'opposition au conseil municipal de Senlis » avec :
- Présentation des conseillers d'opposition
- Dernières prises de position
- Lien vers la tribune et le suivi des votes

---

## 4. Ordre de bataille suggéré

Si on veut avancer vite et garder le site cohérent :

1. **Refonte page d'accueil** (E) — c'est ce que les visiteurs voient, donc prioritaire.
2. **Page Contact / Permanence** (C) — utilitaire, simple, immédiat.
3. **Rubrique Tribune** (A) — structure éditoriale qui s'étoffe dans le temps.
4. **Newsletter recyclée** (D) — quand on a 2-3 tribunes publiées.
5. **Suivi des votes** (B) — chantier de fond, à lancer une fois le rythme éditorial trouvé.

Le nettoyage des pages campagne peut se faire en parallèle, au fil de l'eau.

---

## Prochaine étape

Dites-moi par quel chantier on commence et je m'y mets.
