from pathlib import Path
import re
import shutil
import unicodedata

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
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
NON_WORKING_FOLDERS = ["finalizadas", "canceladas"]


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


def list_storage_options():
    if not STORAGE_ROOT.exists():
        return []

    clients = []

    for client_path in STORAGE_ROOT.iterdir():
        if not client_path.is_dir():
            continue

        collections = []

        for collection_path in client_path.iterdir():
            if not collection_path.is_dir():
                continue

            collections.append(
                {
                    "name": collection_path.name,
                    "path": str(collection_path),
                }
            )

        clients.append(
            {
                "name": client_path.name,
                "path": str(client_path),
                "collections": collections,
            }
        )

    return clients


def get_file_reference_code(file_name: str) -> str:
    stem = Path(file_name).stem
    return stem.split("-")[0]


def is_working_file(file_path: Path) -> bool:
    if not file_path.is_file():
        return False

    lower_parts = [part.lower() for part in file_path.parts]

    for folder in NON_WORKING_FOLDERS:
        if folder in lower_parts:
            return False

    return True


def item_matches_search(item: dict, search: str | None) -> bool:
    if not search:
        return True

    search_lower = search.lower()

    searchable_values = [
        str(item.get("client_name", "")),
        str(item.get("collection_name", "")),
        str(item.get("category", "")),
        str(item.get("reference_code", "")),
        str(item.get("file_name", "")),
    ]

    for file in item.get("files", []):
        searchable_values.append(str(file.get("file_name", "")))
        searchable_values.append(str(file.get("path", "")))

    return any(search_lower in value.lower() for value in searchable_values)


def build_queue_items(search: str | None = None):
    queue_items = []

    if not STORAGE_ROOT.exists():
        return queue_items

    for client_path in STORAGE_ROOT.iterdir():
        if not client_path.is_dir():
            continue

        for collection_path in client_path.iterdir():
            if not collection_path.is_dir():
                continue

            for category in OPERATIONAL_CATEGORIES:
                category_path = collection_path / category

                if not category_path.exists():
                    continue

                working_files = [
                    file_path
                    for file_path in category_path.iterdir()
                    if is_working_file(file_path)
                ]

                if category == "stills":
                    grouped_by_reference: dict[str, list[Path]] = {}

                    for file_path in working_files:
                        reference_code = get_file_reference_code(file_path.name)

                        if reference_code not in grouped_by_reference:
                            grouped_by_reference[reference_code] = []

                        grouped_by_reference[reference_code].append(file_path)

                    for reference_code, files in grouped_by_reference.items():
                        item = {
                            "item_type": "reference",
                            "client_name": client_path.name,
                            "collection_name": collection_path.name,
                            "category": category,
                            "reference_code": reference_code,
                            "file_name": None,
                            "file_count": len(files),
                            "files": [
                                {
                                    "file_name": file.name,
                                    "path": str(file),
                                }
                                for file in files
                            ],
                        }

                        if item_matches_search(item, search):
                            queue_items.append(item)

                else:
                    for file_path in working_files:
                        item = {
                            "item_type": "file",
                            "client_name": client_path.name,
                            "collection_name": collection_path.name,
                            "category": category,
                            "reference_code": get_file_reference_code(file_path.name),
                            "file_name": file_path.name,
                            "file_count": 1,
                            "files": [
                                {
                                    "file_name": file_path.name,
                                    "path": str(file_path),
                                }
                            ],
                        }

                        if item_matches_search(item, search):
                            queue_items.append(item)

    return queue_items


@app.get("/")
async def root():
    return {"message": "API do StudioFlow"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/storage/options")
async def storage_options():
    return {
        "storage_root": str(STORAGE_ROOT),
        "clients": list_storage_options(),
    }


@app.get("/queue")
async def queue(search: str | None = Query(default=None)):
    items = build_queue_items(search=search)

    return {
        "total": len(items),
        "items": items,
    }


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