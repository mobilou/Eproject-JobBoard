from typing import Optional
from fastapi import HTTPException, Depends, APIRouter
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_Session
from auth.verifrole import verif_role
from auth.hashing import password_hash
from schemas import Roles, Contract, Categories
from models import Users, Companies, Ads, Applications

security = HTTPBearer()
router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- Schémas d'entrée ----------

class UserAdminIn(BaseModel):
    name: str
    firstname: Optional[str] = None
    email: str
    password: Optional[str] = None   # obligatoire à la création, facultatif à la modification
    role: Roles

class CompanyAdminIn(BaseModel):
    name: str
    city: str
    email: str
    password: Optional[str] = None   # obligatoire à la création uniquement

class AdAdminIn(BaseModel):
    companies_id: Optional[int] = None   # obligatoire à la création uniquement
    title: str
    description: str
    place: str
    contract_type: Contract
    categorie: Categories
    salary: str = ""

class ApplicationAdminIn(BaseModel):
    ads_id: Optional[int] = None    # création uniquement
    user_id: Optional[int] = None   # création uniquement
    message: str


# ---------- Utilitaires ----------

def email_pris(db: Session, email: str, sauf_user_id: Optional[int] = None) -> bool:
    user = db.exec(select(Users).where(Users.email == email)).first()
    return bool(user and user.id != sauf_user_id)

def supprimer_annonce(db: Session, ad: Ads):
    for cand in db.exec(select(Applications).where(Applications.ads_id == ad.id)).all():
        db.delete(cand)
    db.flush()
    db.delete(ad)
    db.flush()

def supprimer_entreprise(db: Session, company: Companies):
    for ad in db.exec(select(Ads).where(Ads.companies_id == company.id)).all():
        supprimer_annonce(db, ad)
    db.delete(company)
    db.flush()


# ---------- Utilisateurs ----------

@router.get("/users")
def list_users(db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    return [
        {"id": u.id, "name": u.name, "firstname": u.firstname, "email": u.email, "role": u.role}
        for u in db.exec(select(Users)).all()
    ]

@router.post("/users", status_code=201)
def create_user(data: UserAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    if not data.password:
        raise HTTPException(status_code=422, detail="Le mot de passe est obligatoire")
    if email_pris(db, data.email):
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")

    user = Users(
        name=data.name, firstname=data.firstname, email=data.email,
        password=password_hash.hash(data.password), role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id}

@router.put("/users/{user_id}")
def update_user(user_id: int, data: UserAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    payload = verif_role(auth.credentials, "admin")
    user = db.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user_id == int(payload["sub"]) and data.role != Roles.ADMIN:
        raise HTTPException(status_code=400, detail="Tu ne peux pas retirer ton propre rôle admin")
    if email_pris(db, data.email, sauf_user_id=user_id):
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")

    user.name = data.name
    user.firstname = data.firstname
    user.email = data.email
    user.role = data.role
    if data.password:                       # vide = mot de passe inchangé
        user.password = password_hash.hash(data.password)
    db.add(user)
    db.commit()
    return {"message": "Utilisateur modifié"}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_Session), auth=Depends(security)):
    payload = verif_role(auth.credentials, "admin")
    if user_id == int(payload["sub"]):
        raise HTTPException(status_code=400, detail="Tu ne peux pas te supprimer toi-même")
    user = db.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    for cand in db.exec(select(Applications).where(Applications.user_id == user_id)).all():
        db.delete(cand)
    db.flush()
    company = db.exec(select(Companies).where(Companies.user_id == user_id)).first()
    if company:
        supprimer_entreprise(db, company)
    db.delete(user)
    db.commit()
    return {"message": "Utilisateur supprimé"}


# ---------- Entreprises ----------

@router.get("/companies")
def list_companies(db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    return db.exec(select(Companies)).all()

@router.post("/companies", status_code=201)
def create_company(data: CompanyAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    if not data.password:
        raise HTTPException(status_code=422, detail="Le mot de passe est obligatoire")
    if email_pris(db, data.email):
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")

    user = Users(
        name=data.name, email=data.email,
        password=password_hash.hash(data.password), role=Roles.COMPANY,
    )
    db.add(user)
    db.flush()
    company = Companies(name=data.name, city=data.city, email=data.email, user_id=user.id)
    db.add(company)
    db.commit()
    db.refresh(company)
    return {"id": company.id}

@router.put("/companies/{company_id}")
def update_company(company_id: int, data: CompanyAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    company = db.get(Companies, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    if email_pris(db, data.email, sauf_user_id=company.user_id):
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")

    company.name = data.name
    company.city = data.city
    company.email = data.email
    db.add(company)

    # on garde le compte lié et les annonces cohérents avec le nouveau nom / e-mail
    user = db.get(Users, company.user_id)
    if user:
        user.name = data.name
        user.email = data.email
        db.add(user)
    for ad in db.exec(select(Ads).where(Ads.companies_id == company.id)).all():
        ad.name = data.name
        db.add(ad)

    db.commit()
    return {"message": "Entreprise modifiée"}

@router.delete("/companies/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    company = db.get(Companies, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")

    user_id = company.user_id
    supprimer_entreprise(db, company)
    user = db.get(Users, user_id)
    if user:
        db.delete(user)
    db.commit()
    return {"message": "Entreprise supprimée"}


# ---------- Annonces ----------

@router.get("/ads")
def list_ads(db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    return db.exec(select(Ads)).all()

@router.post("/ads", status_code=201)
def create_ad(data: AdAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    company = db.get(Companies, data.companies_id) if data.companies_id else None
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")

    ad = Ads(
        name=company.name, categorie=data.categorie, title=data.title,
        description=data.description, place=data.place,
        contract_type=data.contract_type, salary=data.salary, companies_id=company.id,
    )
    db.add(ad)
    db.commit()
    db.refresh(ad)
    return {"id": ad.id}

@router.put("/ads/{ads_id}")
def update_ad(ads_id: int, data: AdAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    ad = db.get(Ads, ads_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    ad.title = data.title
    ad.description = data.description
    ad.place = data.place
    ad.contract_type = data.contract_type
    ad.categorie = data.categorie
    ad.salary = data.salary
    db.add(ad)
    db.commit()
    return {"message": "Annonce modifiée"}

@router.delete("/ads/{ads_id}")
def delete_ad(ads_id: int, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    ad = db.get(Ads, ads_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    supprimer_annonce(db, ad)
    db.commit()
    return {"message": "Annonce supprimée"}


# ---------- Candidatures ----------

@router.get("/applications")
def list_applications(db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    return db.exec(select(Applications)).all()

@router.post("/applications", status_code=201)
def create_application(data: ApplicationAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    ad = db.get(Ads, data.ads_id) if data.ads_id else None
    user = db.get(Users, data.user_id) if data.user_id else None
    if not ad:
        raise HTTPException(status_code=404, detail="Annonce introuvable")
    if not user or user.role != Roles.INDIVIDUAL:
        raise HTTPException(status_code=404, detail="Particulier introuvable")

    deja = db.exec(
        select(Applications).where(Applications.ads_id == ad.id, Applications.user_id == user.id)
    ).first()
    if deja:
        raise HTTPException(status_code=409, detail="Ce particulier a déjà postulé à cette annonce")

    cand = Applications(ads_id=ad.id, user_id=user.id, message=data.message, name=user.name, email=user.email)
    db.add(cand)
    db.commit()
    db.refresh(cand)
    return {"id": cand.id}

@router.put("/applications/{app_id}")
def update_application(app_id: int, data: ApplicationAdminIn, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    cand = db.get(Applications, app_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    cand.message = data.message
    db.add(cand)
    db.commit()
    return {"message": "Candidature modifiée"}

@router.delete("/applications/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_Session), auth=Depends(security)):
    verif_role(auth.credentials, "admin")
    cand = db.get(Applications, app_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    db.delete(cand)
    db.commit()
    return {"message": "Candidature supprimée"}