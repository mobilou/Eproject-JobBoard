import { getRole } from "./ApiAdmin.js";
import { getToken, logout } from "./ApiAuth.js";
import { getMyCompany, getMyAds, createAd, deleteMyAd } from "./ApiEntreprise.js";

const CONTRATS = ["CDI", "CDD", "Stage", "Alternance"];
const CATEGORIES = [
    "Agriculture", "Artisanat", "Bâtiment", "Commerce", "Finance", "Marketing",
    "Droit", "Éducation", "Médical", "Transport", "Alimentaire", "Informatique",
];

// --- Gardes ---
const role = getRole();
if (!getToken()) window.location.href = "index.html";
if (role === "admin") window.location.href = "admin.html";

const message = document.getElementById("profil-message");

document.getElementById("btn-logout").addEventListener("click", () => {
    logout();
    window.location.href = "index.html";
});

// Crée un élément avec du texte (textContent : protège des injections HTML)
function el(tag, texte, parent) {
    const e = document.createElement(tag);
    if (texte !== undefined) e.textContent = texte;
    if (parent) parent.appendChild(e);
    return e;
}

function remplirSelect(id, valeurs, majuscules = false) {
    const select = document.getElementById(id);
    valeurs.forEach((v) => {
        const option = el("option", v, select);
        const propre = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        option.value = majuscules ? propre.toUpperCase() : propre.toLowerCase();
    });
}

// ---------- ENTREPRISE ----------

function afficherAnnonces(annonces) {
    const conteneur = document.getElementById("liste-annonces");
    conteneur.replaceChildren();
    document.getElementById("compteur-annonces").textContent = annonces.length;

    if (annonces.length === 0) {
        el("p", "Tu n'as pas encore publié d'annonce.", conteneur);
        return;
    }

    annonces.forEach((ad) => {
        const carte = el("article", undefined, conteneur);
        el("h4", ad.title, carte);

        const btnSupprimer = el("button", "Supprimer l'annonce", carte);
        btnSupprimer.type = "button";
        btnSupprimer.addEventListener("click", async () => {
            if (!confirm(`Supprimer l'annonce « ${ad.title} » et ses candidatures ?`)) return;
            try {
                await deleteMyAd(ad.id);
                await chargerAnnonces();
            } catch (e) {
                message.textContent = e.message;
            }
        });

        el("p", `${ad.contract_type} - ${ad.categorie} - ${ad.place}`, carte);
        el("p", ad.description, carte);

        const cands = ad.candidatures;
        el("h5", `Candidatures (${cands.length})`, carte);

        if (cands.length === 0) {
            el("p", "Aucune candidature pour le moment.", carte);
        } else {
            const ul = el("ul", undefined, carte);
            cands.forEach((c) => {
                const li = el("li", undefined, ul);
                el("strong", `${c.firstname ?? ""} ${c.name}`.trim(), li);
                li.append(` - ${c.email} : ${c.message ?? ""}`);
            });
        }
        el("hr", undefined, carte);
    });
}

async function chargerAnnonces() {
    afficherAnnonces(await getMyAds());
}

async function initEntreprise() {
    document.getElementById("espace-entreprise").style.display = "block";
    remplirSelect("a-contract", CONTRATS, true);
    remplirSelect("a-categorie", CATEGORIES);

    try {
        const company = await getMyCompany();
        document.getElementById("nom-entreprise").textContent = `${company.name} - ${company.city}`;
        await chargerAnnonces();
    } catch (e) {
        message.textContent = e.message;
    }

    document.getElementById("form-annonce").addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = document.getElementById("a-error");
        err.textContent = "";
        const salaire = document.getElementById("a-salary").value;

        try {
            await createAd({
                name: document.getElementById("nom-entreprise").textContent.split(" - ")[0],
                title: document.getElementById("a-title").value,
                description: document.getElementById("a-description").value,
                place: document.getElementById("a-place").value,
                contract_type: document.getElementById("a-contract").value,
                categorie: document.getElementById("a-categorie").value,
                salary: salaire,
            });
            e.target.reset();
            await chargerAnnonces();
        } catch (error) {
            err.textContent = error.message;
        }
    });
}

// ---------- PARTICULIER ----------

function afficherCandidatures(candidatures) {
    const conteneur = document.getElementById("liste-candidatures");
    conteneur.replaceChildren();
    document.getElementById("compteur-candidatures").textContent = candidatures.length;

    if (candidatures.length === 0) {
        el("p", "Tu n'as pas encore postulé à une annonce.", conteneur);
        return;
    }

    candidatures.forEach((c) => {
        const carte = el("article", undefined, conteneur);
        const ad = c.annonce;

        if (ad) {
            el("h4", ad.title, carte);
            el("p", `${ad.name} - ${ad.place}`, carte);
            el("p", `${ad.contract_type} - ${ad.categorie}`, carte);
        } else {
            el("h4", "Annonce supprimée", carte);
        }
        el("p", `Ton message : ${c.message ?? ""}`, carte);
        el("hr", undefined, carte);
    });
}

async function initParticulier() {
    document.getElementById("espace-particulier").style.display = "block";
    try {
        const reponse = await fetch("http://localhost:8000/candidatures/me", {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await reponse.json().catch(() => ({}));
        if (!reponse.ok) throw new Error(data.detail || `Erreur HTTP ${reponse.status}`);
        afficherCandidatures(data);
    } catch (e) {
        message.textContent = e.message;
    }
}

// ---------- DÉMARRAGE ----------

if (role === "company") {
    initEntreprise();
} else if (role === "individual") {
    initParticulier();
}