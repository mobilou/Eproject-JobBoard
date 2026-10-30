from fastapi import HTTPException
from jose import jwt
from auth.jwt import SECRET_KEY, ALGO

def verif_role(token : str, role_attendu : str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGO]) # recalcule la signature et renvoi dans un dict
    except:
        raise HTTPException(status_code=401, detail="Token invalide") # raise permet de stopper la requete en cours et de ne plus lire les lignes suivantes
    if payload.get("role") != role_attendu and payload.get("role") != "admin": # .get() lis la valeure d'une clé et retourne None si la cle n'existe pas contrairement à une KeyError
        raise HTTPException(status_code=403, detail="Accès refusé") # si le role ne convient pas "acces refusé"
    
    return payload