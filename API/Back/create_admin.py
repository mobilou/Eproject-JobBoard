from sqlmodel import Session, select
from database import engine
from models import Users
from auth.hashing import password_hash
from schemas import Roles

EMAIL = "admin@jobboard.com"
MOT_DE_PASSE = "motdepasse"

with Session(engine) as db:
    if db.exec(select(Users).where(Users.email == EMAIL)).first():
        print("Cet admin existe déjà")
    else:
        db.add(Users(
            name="Admin",
            firstname="Admin",
            email=EMAIL,
            password=password_hash.hash(MOT_DE_PASSE),
            role=Roles.ADMIN,
        ))
        db.commit()
        print("Admin créé")