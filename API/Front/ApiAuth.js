const API_URL = "http://localhost:8000";  // defini stock l'adresse du back API dans une constante
const API_AUTH = `${API_URL}/auth`; // on stock API_URL pour y ajouter /auth

async function post(url, body) {  // url = adresse cible, body = objet Js (il contient les données)
    const reponse = await fetch(url, { // fetch = outil Js pour envoyer des requêtes HTTP, await permet de mettre le serveur en pause en attendant que le serveur reponde, sans await le serveur continurai sans les données
        method: "POST",  // methode POST car ce sont des routes POST
        headers: { "Content-Type": "application/json" }, // Content-type nom officiel du header, application/json est le format JSON du contenu du header
        body: JSON.stringify(body),  // permet de transormer l'objet en format JSON, car le serveur de comprend pas le Js 
    });
    const data = await reponse.json().catch(() => ({}));   // reponse est l'objet de réponse renvoyé par le serveur apres le fetch, .json() prend le text en brut et le convetit en object ou tableau Js exploitable, catch s'execute uniquiement si il y a un erreur, et au lieu de crash il renvoi un objet vide {}
    if (reponse.ok == false) throw new Error(data.detail || `Erreur HTTP ${reponse.status}`); // throw = "lancer", provoque un erreur, data.detail = renvoie le msg de l'API, || OU, si le serv a rien envoyé, renvoie Erreur HTTP aver le status de la reposne, les accent grave (gabarit de string : equivalaent au f string, et le $ sert a appeler une variable comment les {} dnas les f srting)
    return data;
}

export const creerUserentreprise = (u) => {
    return post(`${API_AUTH}/register/entreprise`, u) // on accord la fonction post a l'url finale
}
export const creerUserparticulier = (u) => {
    return post(`${API_AUTH}/register/particulier`, u);
}

export async function login(email, password) {
    const data = await post(`${API_URL}/login`, { email, password });
    localStorage.setItem("token", data.acces_token);
    return data;
}

export function getToken() {
    return localStorage.getItem("token");
}

export function logout() {
    localStorage.removeItem("token");
}
