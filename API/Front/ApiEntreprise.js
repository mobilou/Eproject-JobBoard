import { getToken } from "./ApiAuth.js";

const API_URL = "http://localhost:8000";

async function authFetch(path, method = "GET", body) {
    const reponse = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${getToken()}`,
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await reponse.json().catch(() => ({}));
    if (!reponse.ok) {
    const detail = Array.isArray(data.detail)
        ? data.detail.map((d) => `${d.loc.slice(1).join(".")} : ${d.msg}`).join(" | ")
        : data.detail;
    throw new Error(detail || `Erreur HTTP ${reponse.status}`);
}
    return data;
}

export const getMyCompany = () => authFetch("/entreprises/me");
export const getMyAds = () => authFetch("/entreprises/annonces");
export const createAd = (ad) => authFetch("/entreprises/annonces", "POST", ad);
export const deleteMyAd = (id) => authFetch(`/entreprises/annonces/${id}`, "DELETE");