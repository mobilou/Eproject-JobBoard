from sqlmodel import create_engine, Session

DATABASE_URL = "mysql+pymysql://my_user:motdepasse@localhost:3306/JobBoard"
engine = create_engine(DATABASE_URL, echo=True)

def get_Session():
    with Session(engine) as session: # permet de ouvrir et fermer un session, cela evite de laisser des sessions ouvertes à chaque requetes.
        yield session # met en pause la session le temps que les données s'enregistres dans la database.

