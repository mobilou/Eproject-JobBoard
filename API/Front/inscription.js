import { creerUserentreprise, creerUserparticulier, login, getToken, logout } from "./ApiAuth.js";
import { getRole } from "./ApiAdmin.js";

// Affiche ou cache un élément, sans planter s'il n'existe pas dans la page
function afficher(id, visible, display = "block") {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? display : "none";
}

function majAffichageAuth() {
    const connecte = Boolean(getToken());
    afficher("auth-buttons-container", !connecte, "block");
    afficher("user-menu-container", connecte, "flex");
    afficher("admin-link", connecte && getRole() === "admin", "block");
}

majAffichageAuth();

// Redirige un admin vers sa page
function redirigerSiAdmin() {
    if (getRole() === "admin") {
        window.location.href = "admin.html";
        return true;
    }
    return false;
}

// Particulier
document.getElementById("form-particulier")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("p-error");
    const email = document.getElementById("p-email").value;
    const mdp = document.getElementById("p-password").value;

    if (mdp !== document.getElementById("p-confpassword").value) {
        err.textContent = "Les mots de passe sont différents";
        return;
    }
    try {
        await creerUserparticulier({
            name: document.getElementById("p-nom").value,
            firstname: document.getElementById("p-prenom").value,
            email: email,
            password: mdp,
        });
        await login(email, mdp);
        document.getElementById("Popup").close();
        majAffichageAuth();
    } catch (error) {
        err.textContent = error.message;
    }
});

// Entreprise
document.getElementById("form-entreprise")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("e-error");
    const email = document.getElementById("e-email").value;
    const mdp = document.getElementById("e-password").value;

    if (mdp !== document.getElementById("e-confpassword").value) {
        err.textContent = "Les mots de passe sont différents";
        return;
    }
    try {
        await creerUserentreprise({
            company_name: document.getElementById("e-nom").value,
            company_email: email,
            company_city: document.getElementById("e-ville").value,
            password: mdp,
        });
        await login(email, mdp);
        document.getElementById("Popup").close();
        majAffichageAuth();
    } catch (error) {
        err.textContent = error.message;
    }
});

// Connexion
document.getElementById("form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await login(
            document.getElementById("login-email").value,
            document.getElementById("login-password").value
        );
        if (redirigerSiAdmin()) return;

        document.getElementById("maPopup").close();
        majAffichageAuth();
    } catch (error) {
        document.getElementById("login-error").textContent = error.message;
    }
});

// Déconnexion
document.getElementById("btn-logout")?.addEventListener("click", () => {
    logout();
    majAffichageAuth();
});

document.getElementById("btn-profile")?.addEventListener("click", () => {
    window.location.href = "profil.html";
});