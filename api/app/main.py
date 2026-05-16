from pathlib import Path
import re
import shutil
import unicodedata

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:1420",
    "http://127.0.0.1:1420",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_ROOT = Path("C:/StudioFlowStorage")
OPERATIONAL_CATEGORIES = ["lookbooks", "stills", "conceitos"]


class LoginRequest(BaseModel):
    email: str
    password: str


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = value.strip("_")

    return value


def ensure_collection_folders(client_name: str, collection_name: str) -> Path:
    client_slug = slugify(client_name)
    collection_slug = slugify(collection_name)

    collection_path = STORAGE_ROOT / client_slug / collection_slug

    for category in OPERATIONAL_CATEGORIES:
        category_path = collection_path / category
        (category_path / "finalizadas").mkdir(parents=True, exist_ok=True)
        (category_path / "canceladas").mkdir(parents=True, exist_ok=True)

    (collection_path / "informacoes").mkdir(parents=True, exist_ok=True)

    return collection_path


def get_upload_target_path(
    client_name: str,
    collection_name: str,
    category: str,
    upload_mode: str,
) -> Path:
    collection_path = ensure_collection_folders(
        client_name=client_name,
        collection_name=collection_name,
    )

    category_slug = slugify(category)

    if category_slug not in OPERATIONAL_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Categoria inválida: {category}",
        )

    category_path = collection_path / category_slug

    if upload_mode == "finalizado":
        return category_path / "finalizadas"

    return category_path


@app.get("/")
async def root():
    return {"message": "API do StudioFlow"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/login")
async def login(data: LoginRequest):
    if data.email == "admin@teste.com" and data.password == "123":
        return {
            "user": {
                "name": "Jean",
                "role": "supervisor",
            }
        }

    return {"error": "Email ou senha inválidos"}


@app.post("/upload")
async def upload(
    client_name: str = Form(...),
    collection_name: str = Form(...),
    category: str = Form(...),
    work_origin: str = Form(...),
    upload_mode: str = Form(...),
    files: list[UploadFile] = File(...),
):
    if upload_mode not in ["normal", "finalizado"]:
        raise HTTPException(
            status_code=400,
            detail=f"Modo de upload inválido: {upload_mode}",
        )

    target_path = get_upload_target_path(
        client_name=client_name,
        collection_name=collection_name,
        category=category,
        upload_mode=upload_mode,
    )

    target_path.mkdir(parents=True, exist_ok=True)

    duplicate_files = [
        file.filename
        for file in files
        if file.filename and (target_path / file.filename).exists()
    ]

    if duplicate_files:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Um ou mais arquivos já existem no destino.",
                "duplicate_files": duplicate_files,
            },
        )

    saved_files = []

    for file in files:
        if not file.filename:
            continue

        destination = target_path / file.filename

        with destination.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_files.append(
            {
                "file_name": file.filename,
                "saved_path": str(destination),
            }
        )

    return {
        "message": "Upload realizado com sucesso",
        "client_name": client_name,
        "collection_name": collection_name,
        "category": category,
        "work_origin": work_origin,
        "upload_mode": upload_mode,
        "target_path": str(target_path),
        "saved_files": saved_files,
    }