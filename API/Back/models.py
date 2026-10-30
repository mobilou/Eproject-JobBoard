from sqlmodel import SQLModel, Field
from schemas import Roles, Categories
from datetime import datetime,timezone



class Users(SQLModel, table=True):
    id : int | None = Field(default=None, primary_key=True)
    name : str = Field(nullable=False)
    firstname : str = Field(nullable=True)
    email : str = Field(unique=True, nullable=False)
    password : str = Field(nullable=False)
    role: Roles = Field(nullable=False)

class Companies(SQLModel, table=True):
    id : int | None = Field(default=None, primary_key=True)
    user_id : int | None = Field(default=None, foreign_key="users.id")
    name : str = Field(nullable=False)
    city : str = Field(nullable=False)
    email : str = Field(unique=True, nullable=False)

class Ads(SQLModel, table=True):
    id : int | None = Field(default=None, primary_key=True)
    companies_id : int | None = Field(default=None, foreign_key="companies.id")
    name : str = Field(nullable=False)
    categorie : Categories = Field(nullable=False)
    title : str = Field(nullable=False)
    description : str = Field(nullable=False)
    place : str = Field(nullable=False)
    contract_type : str
    salary : str = Field(nullable=False)
    date : datetime = Field(default_factory=lambda : datetime.now(timezone.utc))

class Applications(SQLModel, table=True):
    id : int | None = Field(default=None, primary_key=True)
    ads_id : int | None = Field(default=None, foreign_key="ads.id")
    user_id : int | None = Field(default=None, foreign_key="users.id")
    name : str = Field(nullable=False)
    email: str = Field(nullable=False)
    message : str = Field(nullable=False)
    date : datetime = Field(default_factory=lambda : datetime.now(timezone.utc))