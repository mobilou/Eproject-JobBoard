from datetime import datetime, timezone, timedelta
from jose import jwt


SECRET_KEY = "cle secrete"
ALGO = "HS256"

def create_acces_token(data : dict):
    expire = datetime.now(timezone.utc) + timedelta(minutes=20)
    data.update({"exp" : expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGO)