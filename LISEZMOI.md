# TerraSuite, version à publier

Ce dossier contient la version publiable de TerraSuite. Il peut être déposé tel quel sur un hébergement de pages web.

## Ce qui a été retiré par rapport à la version de travail
- Coordonnées de l'agence (nom, adresse, e-mail) : chaque utilisateur renseigne les siennes dans les réglages de chaque application.
- Données des projets : plannings, estimations, DPGF des entreprises, CCTP de projet, produits prescrits.
- Fichier des avis collectés de TerraSourcing (la collecte quotidienne tourne sur votre poste).

## Bases de départ fournies
- TerraEstim : bibliothèque type des articles de CCTP (219 chapitres et articles) et liste des prestations (3 811), sans les prix issus des offres.
- TerraDocs : 304 produits de fabricants (sanitaires, chauffage, terre cuite, carrelage, fenêtres de toit, mortiers et enduits, plâtrerie, plafonds et habillages bois, acoustique textile, mobilier, ossature bois, charpente, ascenseurs, paysage, installations de chantier, électricité, ventilation, plomberie, menuiseries, peinture, sols, VRD, gros œuvre).
Ces bases sont ajoutées une seule fois, au premier lancement.

## Où sont les données
Chaque utilisateur garde ses données dans son propre navigateur, sur son poste. Rien n'est envoyé au serveur.
- Les données ne suivent pas d'un ordinateur à l'autre : utiliser les exports (JSON) pour les transférer.
- Deux personnes qui partagent la même session de navigateur voient les mêmes données.
- Vider les données du navigateur efface les données : exporter régulièrement.
- TerraChantier et TerraContacts peuvent, au choix de chacun, se synchroniser avec sa propre base Supabase (voir TerraChantier/README.md).

## Mettre en ligne avec des identifiants (Cloudflare)
1. Créer un compte gratuit sur cloudflare.com.
2. Héberger les pages : rubrique Workers & Pages, créer un projet Pages par téléversement direct, puis déposer le contenu de ce dossier. Cloudflare donne une adresse du type `terrasuite.pages.dev`.
3. Protéger l'accès : rubrique Zero Trust, puis Access, Applications, ajouter une application auto-hébergée sur l'adresse du site. Créer une règle « Autoriser » avec la liste des adresses e-mail autorisées, et choisir la connexion par code envoyé par e-mail (One-time PIN). Gratuit jusqu'à 50 utilisateurs.
4. Ajouter ou retirer une personne : modifier la liste d'adresses de la règle.
5. Mettre à jour les applications : déposer à nouveau le dossier dans le projet Pages. Les données des utilisateurs ne sont pas touchées.

## Votre propre passage à la version en ligne
Vos données actuelles sont liées aux fichiers ouverts depuis votre ordinateur. Elles n'apparaîtront pas dans la version en ligne. Pour les y retrouver, exportez-les depuis la version de travail (export JSON de chaque application), puis importez-les dans la version en ligne.
