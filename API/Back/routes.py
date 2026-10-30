
from fastapi import HTTPException, Depends, APIRouter
from fastapi.security import HTTPBearer
from sqlmodel import Session, select
from typing import Optional
from sqlalchemy import func, or_

from database import get_Session
from auth.hashing import password_hash
from auth.jwt import create_acces_token
from auth.verifrole import verif_role
from schemas import Roles, Contract, Categories, UsersLogin, AdsIn, ApplicationIn, ParticulierRegisterIn, EntrepriseRegisterIn
from models import Users, Companies, Ads, Applications

security = HTTPBearer()

auth_router = APIRouter(prefix="/auth", tags=["auth"])  # /auth/register/...
router = APIRouter()                                    # /login, /ads/...


@auth_router.post("/register/entreprise", status_code=201)
def register_entreprise(data: EntrepriseRegisterIn, db: Session = Depends(get_Session)):
    user = db.exec(select(Users).where(Users.email == data.company_email)).first()
    if user:
        raise HTTPException(status_code=409, detail="Cet e-mail est déjà utilisé")

    # Création du user (le nom de l'entreprise devient le nom du user)
    user = Users(
        name=data.company_name,
        email=data.company_email,
        password=password_hash.hash(data.password),
        role=Roles.COMPANY,
    )
    db.add(user)
    db.flush()  # Récupère l'ID du user

    company = Companies(
        name=data.company_name,
        city=data.company_city,
        email=data.company_email,
        user_id=user.id,
    )
    db.add(company)
    db.commit()
    db.refresh(user)
    db.refresh(company)

    return {"message": "Entreprise créée avec succès", "user_id": user.id, "company_id": company.id}


@auth_router.post("/register/particulier", status_code=201)
def register_particulier(data: ParticulierRegisterIn, db: Session = Depends(get_Session)):
    user = db.exec(select(Users).where(Users.email == data.email)).first()
    if user:
        raise HTTPException(status_code=409, detail="Email déjà utilisé")

    user = Users(
        name=data.name,
        firstname=data.firstname,
        email=data.email,
        password=password_hash.hash(data.password),
        role=Roles.INDIVIDUAL,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", status_code=201)
def login(user: UsersLogin, db: Session = Depends(get_Session)):
    db_user = db.exec(select(Users).where(Users.email == user.email)).first()

    if not db_user or not password_hash.verify(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Identification invalide")

    acces_token = create_acces_token({"sub": str(db_user.id), "type": "acces", "role": db_user.role})
    return {"acces_token": acces_token}


@router.post("/entreprises/annonces", status_code=201)
def new_annonces(data: AdsIn, db: Session = Depends(get_Session), credentials=Depends(security)):
    payload = verif_role(credentials.credentials, "company")
    user_id = int(payload["sub"])

    company = db.exec(select(Companies).where(Companies.user_id == user_id)).first()
    if not company:
        raise HTTPException(status_code=404, detail="Créer d'abord votre entreprise")

    ads = Ads(
        name=company.name,          # forcé côté serveur
        categorie=data.categorie,
        title=data.title,
        description=data.description,
        place=data.place,
        contract_type=data.contract_type,
        salary=data.salary,
        companies_id=company.id,
    )
    db.add(ads)
    db.commit()
    db.refresh(ads)
    return ads

@router.get("/entreprises/me")
def mon_entreprise(db: Session = Depends(get_Session), credentials=Depends(security)):
    payload = verif_role(credentials.credentials, "company")
    company = db.exec(select(Companies).where(Companies.user_id == int(payload["sub"]))).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    return {"id": company.id, "name": company.name, "city": company.city, "email": company.email}


@router.get("/entreprises/annonces")
def mes_annonces(db: Session = Depends(get_Session), credentials=Depends(security)):
    payload = verif_role(credentials.credentials, "company")
    company = db.exec(select(Companies).where(Companies.user_id == int(payload["sub"]))).first()
    

    resultat = []
    for ad in db.exec(select(Ads).where(Ads.companies_id == company.id)).all():
        candidatures = []
        for c in db.exec(select(Applications).where(Applications.ads_id == ad.id)).all():
            u = db.get(Users, c.user_id)
            candidatures.append({
                "id": c.id,
                "name": c.name,
                "firstname": u.firstname if u else None,
                "email": c.email,
                "message": c.message,
            })
        resultat.append({**ad.model_dump(), "candidatures": candidatures})
    return resultat


@router.get("/companies/{company_name}/ads", status_code=200)
def list_ads(company_name: str, db: Session = Depends(get_Session)):
    company = db.exec(select(Ads).where(Ads.name == company_name)).all()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    return company


@router.get("/ads/name/{ads_title}", status_code=200)
def see_ads_by_name(ads_title: str, db: Session = Depends(get_Session)):
    annonce = db.exec(select(Ads).where(Ads.title == ads_title)).first()
    if not annonce:
        raise HTTPException(status_code=404, detail="Annonce non trouvée")
    return annonce


@router.post("/ads/{ads_id}/applications", status_code=201)
def postuler(ads_id: int, data: ApplicationIn, db: Session = Depends(get_Session), credentials=Depends(security)):
    payload = verif_role(credentials.credentials, "individual")
    user_id = int(payload["sub"])

    annonce = db.get(Ads, ads_id)
    if not annonce:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    user = db.get(Users, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    deja = db.exec(
        select(Applications).where(Applications.ads_id == ads_id, Applications.user_id == user_id)
    ).first()
    if deja:
        raise HTTPException(status_code=409, detail="Tu as déjà postulé à cette annonce")

    candidature = Applications(
        ads_id=ads_id,
        user_id=user_id,
        message=data.message,
        name=user.name,
        email=user.email,
    )
    db.add(candidature)
    db.commit()
    db.refresh(candidature)
    return candidature

@router.get("/candidatures/me")
def mes_candidatures(db: Session = Depends(get_Session), credentials=Depends(security)):
    payload = verif_role(credentials.credentials, "individual")
    user_id = int(payload["sub"])

    resultat = []
    for c in db.exec(select(Applications).where(Applications.user_id == user_id)).all():
        ad = db.get(Ads, c.ads_id)
        resultat.append({
            "id": c.id,
            "message": c.message,
            "annonce": ad.model_dump() if ad else None,
        })
    return resultat

@router.get("/ads")
def list_all_ads(
    q: Optional[str] = None,
    contract_type: Optional[Contract] = None,
    categorie: Optional[Categories] = None,
    page: int = 1,
    per_page: int = 6,
    db: Session = Depends(get_Session),
):
    page = max(page, 1)
    per_page = min(max(per_page, 1), 50)

    query = select(Ads)
    if q:
        motif = f"%{q}%"
        query = query.where(or_(
            Ads.title.ilike(motif),
            Ads.name.ilike(motif),
            Ads.place.ilike(motif),
            Ads.description.ilike(motif),
        ))
    if contract_type:
        query = query.where(Ads.contract_type == contract_type)
    if categorie:
        query = query.where(Ads.categorie == categorie)

    total = db.exec(select(func.count()).select_from(query.subquery())).one()
    items = db.exec(
        query.order_by(Ads.id.desc()).offset((page - 1) * per_page).limit(per_page)
    ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, -(-total // per_page)),   # arrondi au supérieur
    }

@router.delete("/entreprises/annonces/{ads_id}")
def supprimer_mon_annonce(ads_id: int, db: Session = Depends(get_Session), credentials=Depends(security)):
    payload = verif_role(credentials.credentials, "company")
    company = db.exec(select(Companies).where(Companies.user_id == int(payload["sub"]))).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")

    ad = db.get(Ads, ads_id)
    if not ad or ad.companies_id != company.id:
        raise HTTPException(status_code=404, detail="Annonce introuvable")

    # on supprime d'abord les candidatures liées
    for cand in db.exec(select(Applications).where(Applications.ads_id == ads_id)).all():
        db.delete(cand)
    db.flush()
    db.delete(ad)
    db.commit()
    return {"message": "Annonce supprimée"}