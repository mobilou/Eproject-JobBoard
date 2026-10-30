from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from contextlib import asynccontextmanager

from database import engine
from routes import router as main_router, auth_router
from routesadmin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)    # /auth/register/...
app.include_router(main_router)    # /login, /entreprises/annonces, /ads/...
app.include_router(admin_router)   # /admin/...