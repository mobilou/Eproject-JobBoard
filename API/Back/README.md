Documentation :

API : Application Programming Interface : interface accessible via htpp

REST : Representational State Tranfer : façon de structurer une API de manière claire, cohérente et prévisible. (style architectural)

Une API fonctionne avec des requêtes HTTP afin de communiquer avec un serveur

Requêtes HTPP :
- POSTE : créer un new element dans la DB
- GET : permet de récupérer des données
- PUT : modifier un élement
- DELETE : supprimer un élement


uvicorn est un serveur ASGI qui permet de lancer fastapi
ASGI : Asynchronous Server Gateway Interface : serveur qui va écouter un port, comprendre le htpp et appel FASTAPI

Endpoint : c'est un point d'accès précis sur un serveur qui permet de communiquer avec une appli, c'est un adresse (souvent une URL), qui comporte une route. On peut utiliser CRUD sur les endpoints. Enemble d'un methode et d'une route.
https://blog.crea-troyes.fr/12484/endpoint-definition-simple-exemples-et-fonctionnement/#aioseo-quest-ce-quun-endpoint-definition-simple-7

Route : c'est un chemin d'accès, permet d'orienter l'API. URL sans l'action CRUD.

SQLmodel est une librairie python qui permet de définir des modèles données pour des fin de validations.
    -définir des modèles de données
    -valider automatiquement les données entrentes
    -convertir les données dans le bon type


ORM : Object Relational Mappin
outil qui gère la relation entre la DB et python

Concept de relation :

-La table Entreprises contient les infos avec un id unique (PRIMARY KEY)
-La table annonces contient les offres + un champ supp clé étrangère (entreprise_id) cette clé point vers l'idde l'entreprise qui a créer l'annonce.

SQLModel :
Coté entreprise : l'entreprise doit avoir un moyen de lister toutes ses annonces (relationship) qui va chercher toutes la annonces dont le entreprise_id correspond à son propre id

COté annonces : l'annonce doit avoir la cle etrangere (FOREIGN KEY) et un attribut de liaison qui permet d'acceder directement à l'objet ENtreprises sans refaire de requete manuelle.

Etapes :
-Définir les modeles :
creer la classe entreprise et la class annonces en déclarant le champ de liaison et le relationship

-Créer les tables dans MySQL





Reflechir a mes tables, et faire mon schema SQL, mettre en place ma DB

pwdlib : permet de hasher les mots de passes pour ne pas les avoir en clair dans la DB


JWT : JSON Web Token : jeton numérique qui permet de prouver l'identité d'un user de manieère sécurisée.
 -le but va etre que un token sera creer quand l'user va se connecter, et se token lui sera propre ce qui va permettre au backend de repecer a quelle user appartient se token

Le concept du JWT :
HTTP n'a pas de mémoire, chaque requête est indépendante, quand un user se login, l'API doit pouvoir le reconnaitre dans les requêtes suivantes sans que l'user donne son mdp chaque instant.
Apres un login reussi, l'API donne un token (badge numérique) à l'user, qui va s'en servir pour chaque requetes afin que l'API le reconnaisse.

Contenant d'un token :
-Header : algo de signature (cle cryptographique)
-Playload : les données (sub : id de l'user, role : son role, type : type du token, exp)
-Signature : calculée a partir du header, du playload et de la clé secrète

Le playload n'est pas chiffré,= : n'importe qui peut le lire
La signature comporte : cle secrete + playload + header, sans la clé secrete un pirate ne peut pas calculer la bonne signature.

Le token va dans un header appelée authorization, et cela se trouve dans une requete HTPP
Une requete HTTP a deux partie :
-le header : infos sur la requête (format, id...)
-le body : les données JSON


ETAPES :

importer les libs :
-FastAPI
-SQLModel

installer l'ORM :
-pip install SQLModel


Création des class (les class servent pour le typage)

Définir les roles du site :
-Admin : peut tout faire
-Individual : particulier : peut seulement postuler à des annonces
-Company : peuvent créers des annonces

Definir les différents types de contrats :
-CDI
-CDD
-STAGE
-ALTERNANCE

LA DATABASE
creation de la db dans mysql
le but est de créer des relations entre les tables, afin de faciliter la recherche de données, quand un user va creer son compte, il aura une cle primaire correspondant à son id, le but est d'associer
à cette même clé, des clés etrangère afin de suivre ses etapes dans les différentes tables.

LES TABLES :

le but est créer des tables afin que chaque tables soient liée avec son role.
tout le monde passe par la création d'un user et le choix d'un role.

Le role individual :
son id sera dans la table user, il aura une primary key, qui sera en relation avec la table des annonces, afin de retourver dans quelles annonces cet user à postuler grace à la foreign key.

Le role company :
son id sera dans la table user, il aura une primary key, qui sera en relation avec la table des entreprises, et la tables des annonces via les foreign keys.


La table Users :
-id : primary_key
-email (unique et obligatoire)
-password (obligatoire)
-role : (obligatoire)

La table Compagnies :
-id : primary key
-user_id : foreign_key lié à la primary key de l'user
-name : (obligatoire)
-city : (obligatoire)
-email : (unique et obligatoire)

La table Ads:
-id : primary key
-companies_id : foreign key lié a la primary key de la compagnies
-title : (obligatoire)
-description : (obligatoire)
-place : (obligatoire)
-type de contrat : (obligatoire)
-salaire : (obligatoire)
-date de publication

La table Applications:
-id : primary key
-ads_id : foreign key lié à la primary key de la ads
-user_id : foreign key lié à la primary key de la user
-message (obligatoire)
-date de postulation

Création des tables dans MYSQL : utilisation de l'ORM

Creation des endpoints :

POST :

Endpoint register : permet à tout nouveau users de s'enregistrer :
-le nouveau user doit entrer ses infos selon le modele de la class User
-son mdp doit etre hasher

Creation du hashage
-installer pwdlib
-importation de PasswordHash (gestionnaire # OUtil qui va gerer tout les mdp et qui va se servir pass@er l'algoritmhe de hashage sur les mdp)
-importation de Argon2Hasher via pwdlib.hashers.argon2 (importation de l'aglo de hashage)

Endpoint login : permet aux user déja enregistrer de se login
-la requetes doit verifier si l'user existe dans la db (chercher si son mail existe, si oui, chercher si son mdp correspond avec le mdp hasher de la db) (importer select via sqlmodel)
-si son mail ne correspond pas, retourner un status 401
-si son mail correspond, mais pas son mdp, retourner un status 401
-si les deux correspondent, on lui donne un acces token valable sur une durée.

CREATION DE L'acces Token
-importation de datetime (date/heure), timezone(etre en UTC), timedelta (durée)
-importation du module jwt de la lib python-jose, permet de créer et lire des tokens
-création de la clé secrète
-création de l'algo de signature (regarder celui qui correspond)
-creation d'une fonction qui reçoit un dict pour le playload en params:
-la fonction doit ajouter l'expiration dans le dict
-fabrique et return le token

Endpoint new_entreprise :
-la requete doit creer un nouvelle entreprise
-verifier si le role choisir par l'user correponds à company

Endpoint new_annonces :
-la requête doit creer une nouvelle annonce
-verifier si le role choisi par l'user correspond à company

Endpoint postuler_annonces :
-la requete doit permetre de postuler à une annonce
-verifie si le role choisi par l'user correspoond bien à particulier
-cherche si l'annonce existe dans la table Ads (renvoyer une erreur si ce n'est pas le cas)
-si elle existe, on creer la ligne candidature dans la table Ads (avec l'annonce visé, l'id du candidat, et son msg)


GET :

Endpoints users:
-lister tout les users inscrits

Endpoint companies/companies_id/ads:
-lister toutes les annonces d'une entreprise

Endpoint ads:
-recupere le contenu d'une annonce



Les codes de status HTTP :
200 : signifie qu'une requête a abouti
201 : signifie "crée", est utiliser lorsqu'une nouvelle ressource à été créée sur le serveur
400 : "Bad Request" est une reponse du serveur indiquant qui'il n'a pas pu comprendre ou traiter la requête avoyée par le client
404 : "Unauthorized" indique que la reqête n'a pas été exécutée car elle nécessite une authentification utilisateur valide.



IMPORTANT :
il me manque :
page admin : peut tout faire

particulier : possibiblité de modif son profile et supprimer
entreprise : possibilité de modif son profile et supprimer





LIER l'API au front

fonction fetch() (javascript) : permet de composer une requête HTTP et de l'envoyer
la fonction fetch() renvoie une promoesse, elle promet de repondre et d'envoyer un resultat

CORS : Cross-Origin Resource Sharing
Le CORS permet de donner autorisation au navigateur concernant le partage de données entre le serveur et le site


NE PAS OUBLIER LE W3C