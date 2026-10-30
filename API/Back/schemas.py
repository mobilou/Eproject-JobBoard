from sqlmodel import SQLModel, Field
from enum import Enum



class Roles(str, Enum):
    ADMIN = "admin"
    INDIVIDUAL = "individual"
    COMPANY = "company"

class Contract(str, Enum):
    CDI = "CDI"
    CDD = "CDD"
    STAGE = "STAGE"
    ALTERNANCE = "ALTERNANCE"



class Categories(str, Enum):
    Agriculture = "agriculture"
    Artisanat = "artisanat"
    Batiment = "batiment"
    Commerce = "commerce"
    Finance = "finance"
    Marketing = "marketing"
    Droit = "droit"
    Education = "education"
    Medical = "medical"
    Transport = "transport"
    Alimentaire = "alimentaire"
    Informatique = "informatique"

    
class UsersLogin(SQLModel):
    email : str = Field(min_length=1)
    password : str = Field(min_length=1)

class AdsIn(SQLModel):
    name : str = Field(min_length=1)
    categorie : Categories
    title : str = Field(min_length=1)
    description : str = Field(min_length=1)
    place : str = Field(min_length=1)
    contract_type : Contract
    salary : str = Field(min_length=1)

class ApplicationIn(SQLModel):
    message : str


class ParticulierRegisterIn(SQLModel):
    name : str = Field(min_length=1)
    firstname : str = Field(min_length=1)
    email : str = Field(min_length=1)
    password : str = Field(min_length=8)

class EntrepriseRegisterIn(SQLModel):
    company_name: str = Field(min_length=1)
    company_city: str = Field(min_length=1)
    company_email: str = Field(min_length=1)
    password: str = Field(min_length=8)
