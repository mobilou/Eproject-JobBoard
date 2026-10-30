import { getRole, listItems, createItem, updateItem, deleteItem } from "./ApiAdmin.js";
import { logout } from "./ApiAuth.js";

// Garde : seul un admin peut rester ici
if (getRole() !== "admin") {
    window.location.href = "index.html";
}

const ROLES = ["individual", "company", "admin"];
const CONTRATS = ["CDI", "CDD", "STAGE", "ALTERNANCE"];
const CATEGORIES = [
    "agriculture", "artisanat", "batiment", "commerce", "finance", "marketing",
    "droit", "education", "medical", "transport", "alimentaire", "informatique",
];

/*
 Configuration de chaque onglet :
 - colonnes : colonnes du tableau [clé, titre]
 - champs   : champs du formulaire
     modes   : "create", "edit" (ou les deux si absent)
     options : liste de valeurs, OU source : { ressource, valeur, label } pour charger depuis l'API
     nombre  : true = envoyé comme nombre (ids)
*/
const TABLES = {
    users: {
        titre: "Utilisateurs",
        colonnes: [["id", "ID"], ["name", "Nom"], ["firstname", "Prénom"], ["email", "E-mail"], ["role", "Rôle"]],
        label: (r) => r.email,
        champs: [
            { cle: "name", label: "Nom", type: "text", requis: true },
            { cle: "firstname", label: "Prénom", type: "text" },
            { cle: "email", label: "E-mail", type: "email", requis: true },
            { cle: "password", label: "Mot de passe", type: "password", requisCreation: true,
              aide: "Laisser vide pour ne pas le changer" },
            { cle: "role", label: "Rôle", type: "select", options: ROLES, requis: true },
        ],
    },
    companies: {
        titre: "Entreprises",
        colonnes: [["id", "ID"], ["name", "Nom"], ["city", "Ville"], ["email", "E-mail"]],
        label: (r) => `l'entreprise ${r.name} (et ses annonces)`,
        champs: [
            { cle: "name", label: "Nom de l'entreprise", type: "text", requis: true },
            { cle: "city", label: "Ville", type: "text", requis: true },
            { cle: "email", label: "E-mail", type: "email", requis: true },
            { cle: "password", label: "Mot de passe", type: "password", modes: ["create"], requisCreation: true },
        ],
    },
    ads: {
        titre: "Annonces",
        colonnes: [["id", "ID"], ["title", "Titre"], ["name", "Entreprise"], ["contract_type", "Contrat"], ["categorie", "Catégorie"], ["salary", "Salaire"]],
        label: (r) => `l'annonce ${r.title}`,
        champs: [
            { cle: "companies_id", label: "Entreprise", type: "select", modes: ["create"], requis: true, nombre: true,
              source: { ressource: "companies", valeur: (c) => c.id, label: (c) => c.name } },
            { cle: "title", label: "Titre du poste", type: "text", requis: true },
            { cle: "description", label: "Description", type: "textarea", requis: true },
            { cle: "place", label: "Lieu", type: "text", requis: true },
            { cle: "contract_type", label: "Contrat", type: "select", options: CONTRATS, requis: true },
            { cle: "categorie", label: "Catégorie", type: "select", options: CATEGORIES, requis: true },
            { cle: "salary", label: "Salaire", type: "text" },
        ],
    },
    applications: {
        titre: "Candidatures",
        colonnes: [["id", "ID"], ["name", "Candidat"], ["email", "E-mail"], ["ads_id", "ID annonce"], ["message", "Message"]],
        label: (r) => `la candidature de ${r.name}`,
        champs: [
            { cle: "ads_id", label: "Annonce", type: "select", modes: ["create"], requis: true, nombre: true,
              source: { ressource: "ads", valeur: (a) => a.id, label: (a) => `${a.title} (${a.name})` } },
            { cle: "user_id", label: "Candidat", type: "select", modes: ["create"], requis: true, nombre: true,
              source: { ressource: "users", valeur: (u) => u.id, label: (u) => `${u.firstname ?? ""} ${u.name} (${u.email})`,
                        filtre: (u) => u.role === "individual" } },
            { cle: "message", label: "Message", type: "textarea", requis: true },
        ],
    },
};

const erreur = document.getElementById("admin-error");
const popup = document.getElementById("popupForm");
let ongletActif = "users";
let modeForm = "create";
let ligneEnEdition = null;

function el(tag, texte, parent) {
    const e = document.createElement(tag);
    if (texte !== undefined) e.textContent = texte;   // textContent : protège des injections HTML
    if (parent) parent.appendChild(e);
    return e;
}

function bouton(texte, onClick, parent) {
    const b = el("button", texte, parent);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
}

// ---------- Onglets ----------

function afficherOnglets() {
    const nav = document.getElementById("onglets");
    nav.replaceChildren();
    Object.entries(TABLES).forEach(([cle, t]) => {
        const b = bouton(t.titre, () => {
            ongletActif = cle;
            afficherOnglets();
            charger();
        }, nav);
        b.disabled = cle === ongletActif;
    });
}

// ---------- Tableau ----------

async function charger() {
    const t = TABLES[ongletActif];
    erreur.textContent = "";
    document.getElementById("titre-table").textContent = t.titre;

    const head = document.getElementById("table-head");
    head.replaceChildren();
    t.colonnes.forEach(([, nom]) => el("th", nom, head));
    el("th", "Actions", head);

    try {
        const lignes = await listItems(ongletActif);
        const body = document.getElementById("table-body");
        body.replaceChildren();

        lignes.forEach((ligne) => {
            const tr = el("tr", undefined, body);
            t.colonnes.forEach(([cle]) => el("td", ligne[cle] ?? "", tr));

            const actions = el("td", undefined, tr);
            bouton("Modifier", () => ouvrirFormulaire("edit", ligne), actions);
            bouton("Supprimer", async () => {
                if (!confirm(`Supprimer ${t.label(ligne)} ?`)) return;
                try {
                    await deleteItem(ongletActif, ligne.id);
                    await charger();
                } catch (e) {
                    erreur.textContent = e.message;
                }
            }, actions);
        });

        document.getElementById("compteur").textContent = lignes.length;
    } catch (e) {
        erreur.textContent = e.message;
    }
}

// ---------- Formulaire Ajouter / Modifier ----------

async function ouvrirFormulaire(mode, ligne = null) {
    modeForm = mode;
    ligneEnEdition = ligne;
    const t = TABLES[ongletActif];

    document.getElementById("form-titre").textContent =
        `${mode === "create" ? "Ajouter" : "Modifier"} - ${t.titre}`;
    document.getElementById("form-error").textContent = "";
    const conteneur = document.getElementById("form-champs");
    conteneur.replaceChildren();

    try {
        for (const champ of t.champs) {
            if (champ.modes && !champ.modes.includes(mode)) continue;

            const bloc = el("div", undefined, conteneur);
            const label = el("label", champ.label, bloc);
            label.htmlFor = `champ-${champ.cle}`;
            el("br", undefined, bloc);

            let input;
            if (champ.type === "select") {
                input = el("select", undefined, bloc);
                let options = champ.options?.map((v) => ({ valeur: v, label: v })) ?? [];
                if (champ.source) {
                    const donnees = await listItems(champ.source.ressource);
                    options = donnees
                        .filter(champ.source.filtre ?? (() => true))
                        .map((d) => ({ valeur: champ.source.valeur(d), label: champ.source.label(d) }));
                }
                options.forEach((o) => {
                    const opt = el("option", o.label, input);
                    opt.value = o.valeur;
                });
            } else if (champ.type === "textarea") {
                input = el("textarea", undefined, bloc);
            } else {
                input = el("input", undefined, bloc);
                input.type = champ.type;
            }

            input.id = `champ-${champ.cle}`;
            input.required = Boolean(champ.requis || (mode === "create" && champ.requisCreation));
            if (champ.type === "password") input.autocomplete = "new-password";

            if (mode === "edit" && champ.type !== "password" && ligne[champ.cle] !== undefined && ligne[champ.cle] !== null) {
                input.value = ligne[champ.cle];
            }
            if (champ.aide && mode === "edit") el("small", champ.aide, bloc);
        }
        popup.showModal();
    } catch (e) {
        erreur.textContent = e.message;
    }
}

document.getElementById("btn-ajouter").addEventListener("click", () => ouvrirFormulaire("create"));
document.getElementById("form-annuler").addEventListener("click", () => popup.close());

document.getElementById("form-admin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = TABLES[ongletActif];
    const err = document.getElementById("form-error");
    err.textContent = "";

    const body = {};
    t.champs.forEach((champ) => {
        if (champ.modes && !champ.modes.includes(modeForm)) return;
        const valeur = document.getElementById(`champ-${champ.cle}`).value;
        if (champ.type === "password" && valeur === "") return;   // vide = inchangé
        body[champ.cle] = champ.nombre ? Number(valeur) : valeur;
    });

    try {
        if (modeForm === "create") {
            await createItem(ongletActif, body);
        } else {
            await updateItem(ongletActif, ligneEnEdition.id, body);
        }
        popup.close();
        await charger();
    } catch (error) {
        err.textContent = error.message;
    }
});

// ---------- Déconnexion ----------

document.getElementById("btn-logout").addEventListener("click", () => {
    logout();
    window.location.href = "index.html";
});

afficherOnglets();
charger();