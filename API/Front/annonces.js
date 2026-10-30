import { getToken } from "./ApiAuth.js";
import { getRole } from "./ApiAdmin.js";

const API_URL = "http://localhost:8000";
const PAR_PAGE = 6;

let annonceCible = null;
let pageCourante = 1;

function el(tag, texte, parent, classe) {
    const e = document.createElement(tag);
    if (texte !== undefined) e.textContent = texte;   // textContent : protège des injections HTML
    if (classe) e.className = classe;
    if (parent) parent.appendChild(e);
    return e;
}

// ---------- Postuler ----------

function ouvrirPostuler(ad) {
    if (!getToken()) {
        document.getElementById("maPopup").showModal();
        return;
    }
    if (getRole() !== "individual") {
        alert("Seuls les comptes particuliers peuvent postuler.");
        return;
    }
    annonceCible = ad;
    document.getElementById("postuler-titre").textContent = `${ad.title} - ${ad.name}`;
    document.getElementById("postuler-message").value = "";
    document.getElementById("postuler-error").textContent = "";
    document.getElementById("popupPostuler").showModal();
}

document.getElementById("form-postuler")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("postuler-error");
    err.textContent = "";

    try {
        const reponse = await fetch(`${API_URL}/ads/${annonceCible.id}/applications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ message: document.getElementById("postuler-message").value }),
        });
        const data = await reponse.json().catch(() => ({}));
        if (!reponse.ok) {
            const detail = Array.isArray(data.detail)
                ? data.detail.map((d) => `${d.loc.slice(1).join(".")} : ${d.msg}`).join(" | ")
                : data.detail;
            throw new Error(detail || `Erreur HTTP ${reponse.status}`);
        }
        document.getElementById("popupPostuler").close();
        alert("Candidature envoyée !");
    } catch (error) {
        err.textContent = error.message;
    }
});

// ---------- Affichage des annonces ----------

function afficherAnnonces(ads) {
    const conteneur = document.getElementById("liste-annonces");
    conteneur.replaceChildren();

    if (ads.length === 0) {
        el("p", "Aucune annonce ne correspond à ta recherche.", conteneur);
        return;
    }

    ads.forEach((ad) => {
        const carte = el("div", undefined, conteneur, "card bg-base-100 w-96 shadow-sm");
        const corps = el("div", undefined, carte, "card-body");

        el("h2", ad.title, corps, "card-title");
        el("p", `${ad.name} - ${ad.place}`, corps);
        el("p", `${ad.contract_type} - ${ad.categorie}${ad.salary ? " - " + ad.salary : ""}`, corps);

        const description = el("p", ad.description, corps);
        description.style.display = "none";

        const actions = el("div", undefined, corps, "card-actions justify-end");

        const btnPostuler = el("button", "Postuler", actions, "btn btn-primary");
        btnPostuler.type = "button";
        btnPostuler.addEventListener("click", () => ouvrirPostuler(ad));

        const btnPlus = el("button", "En savoir plus", actions, "btn btn-primary");
        btnPlus.type = "button";
        btnPlus.addEventListener("click", () => {
            const ferme = description.style.display === "none";
            description.style.display = ferme ? "block" : "none";
            btnPlus.textContent = ferme ? "Réduire" : "En savoir plus";
        });
    });
}

// ---------- Pagination ----------

function afficherPagination(page, pages, total) {
    const nav = document.getElementById("pagination");
    nav.replaceChildren();
    if (total === 0) return;

    const bouton = (texte, cible, desactive = false, actif = false) => {
        const b = el("button", texte, nav, actif ? "btn btn-primary" : "btn");
        b.type = "button";
        b.disabled = desactive;
        b.addEventListener("click", () => {
            pageCourante = cible;
            chargerAnnonces();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    bouton("« Précédent", page - 1, page <= 1);

    // fenêtre de 5 numéros autour de la page courante
    let debut = Math.max(1, page - 2);
    let fin = Math.min(pages, debut + 4);
    debut = Math.max(1, fin - 4);
    for (let p = debut; p <= fin; p++) {
        bouton(String(p), p, false, p === page);
    }

    bouton("Suivant »", page + 1, page >= pages);
    el("p", `${total} annonce${total > 1 ? "s" : ""} - page ${page} sur ${pages}`, nav);
}

// ---------- Chargement (avec filtres) ----------

async function chargerAnnonces() {
    const params = new URLSearchParams({ page: pageCourante, per_page: PAR_PAGE });

    const q = document.getElementById("recherche-q").value.trim();
    const contrat = document.getElementById("recherche-contrat").value;
    const categorie = document.getElementById("recherche-categorie").value;
    if (q) params.set("q", q);
    if (contrat) params.set("contract_type", contrat);
    if (categorie) params.set("categorie", categorie);

    try {
        const reponse = await fetch(`${API_URL}/ads?${params}`);
        if (!reponse.ok) throw new Error(`Erreur HTTP ${reponse.status}`);
        const data = await reponse.json();

        // si la page demandée n'existe plus (ex. dernière annonce supprimée), on revient en arrière
        if (data.items.length === 0 && data.page > 1) {
            pageCourante = data.pages;
            return chargerAnnonces();
        }

        afficherAnnonces(data.items);
        afficherPagination(data.page, data.pages, data.total);
    } catch (e) {
        document.getElementById("liste-annonces").textContent = "Impossible de charger les annonces.";
        document.getElementById("pagination").replaceChildren();
    }
}

// ---------- Recherche ----------

document.getElementById("form-recherche")?.addEventListener("submit", (e) => {
    e.preventDefault();
    pageCourante = 1;          // une nouvelle recherche repart de la page 1
    chargerAnnonces();
});

document.getElementById("form-recherche")?.addEventListener("reset", () => {
    pageCourante = 1;
    setTimeout(chargerAnnonces, 0);   // attend que le formulaire soit vidé
});

chargerAnnonces();