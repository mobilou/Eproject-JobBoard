import { getToken } from "./ApiAuth.js";

const API_URL = "http://localhost:8000";

async function adminFetch(path, method = "GET", body) {
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

// resource = "users" | "companies" | "ads" | "applications"
export const listItems = (resource) => adminFetch(`/admin/${resource}`);
export const createItem = (resource, body) => adminFetch(`/admin/${resource}`, "POST", body);
export const updateItem = (resource, id, body) => adminFetch(`/admin/${resource}/${id}`, "PUT", body);
export const deleteItem = (resource, id) => adminFetch(`/admin/${resource}/${id}`, "DELETE");

// Lit le rôle dans le token (confort d'affichage uniquement : la vraie sécurité est dans le back)
export function getRole() {
    const token = getToken();
    if (!token) return null;
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(base64)).role;
    } catch {
        return null;
    }
}