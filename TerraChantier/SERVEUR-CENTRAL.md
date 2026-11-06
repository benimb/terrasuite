# TerraSuite, serveur central : mise en service

## Principe
- Un compte par personne (e-mail, mot de passe), commun à toutes les applications de la suite.
- Chaque compte appartient à une agence. La bibliothèque de l'agence (projets, contacts, chantiers, photos, plans) n'est visible que de ses membres.
- Tout ce qui est saisi dans les applications alimente la base commune, anonymisé : projets, DPGF, estimations, CCTP de projet, plannings, études de faisabilité, produits prescrits. Photos et plans n'y vont jamais.
- L'agence qui contribue n'est jamais visible des autres utilisateurs.

## Mise en service (une fois, par TERRAFORM)
1. Créer un projet sur supabase.com (offre gratuite pour commencer ; offre Pro quand la base dépasse 500 Mo).
2. Dans Authentication > Providers > Email : laisser l'inscription ouverte ; la confirmation par e-mail peut rester active.
3. Dans SQL Editor : coller le contenu de `serveur-central.sql`, lancer. Le fichier peut être relancé à chaque mise à jour, sans perte de données.
   Si le projet Supabase est l'ancien serveur de l'agence, les données existantes sont rangées dans une agence « Agence (données existantes) » dont le code d'invitation s'affiche à la fin : la rejoindre avec ce code (le premier membre en devient l'administrateur).
4. Relever dans Project Settings > API l'adresse du projet et la clé publique (anon).
5. Dans TerraContacts, onglet « Mon compte » : renseigner adresse et clé, créer son compte, créer l'agence (ou la rejoindre avec le code), accepter les conditions de la base commune.
6. Pour que les autres utilisateurs n'aient pas à saisir adresse et clé : les inscrire une fois pour toutes dans `terrasuite-compte.js` (constante `DEF`, en tête du fichier).

## Ce qui est envoyé à la base commune
Pour chaque élément : genre, département, indice de prix du lieu, type d'ouvrage, nature des travaux, phase, mois, surface, et :
- projet : état, enveloppe, années des étapes, lots du marché (sans les entreprises), nombre de parcelles ;
- DPGF : lots, offre retenue ou non, rang, montant, lignes (désignation, unité, quantité, prix) ;
- estimation : lignes (lot, désignation, unité, quantité, prix saisis), aléas ;
- CCTP de projet : pièces et articles (titre, texte) ;
- planning : tâches (niveau, intitulé, durée, liens), calendrier ;
- étude de faisabilité : nombre de parcelles, surface du terrain, zonage ;
- produits prescrits : lot, fabricant, produit, référence.

Retirés avant l'envoi : noms d'opération et de projet, sigles de l'opération, adresses, codes postaux et communes, maîtres d'ouvrage, entreprises, intervenants nommés dans les CCTP, personnes du carnet, e-mails, téléphones, SIRET, nom de l'agence. Le bouton « Voir ce qui est envoyé » (Mon compte) montre le contenu exact.

Les envois se font en arrière-plan depuis n'importe quelle application ouverte, toutes les 10 minutes, et seulement pour les éléments nouveaux ou modifiés.
