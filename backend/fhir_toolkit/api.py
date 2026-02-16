from fastapi import FastAPI, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from .config import settings
from .db import get_client, create_indexes
from .ingest import ingest_bundle
from .mappings import build_patient_payload, build_cpi_payload
from .synth import generate_fhir_bundle
from .customer_specs import tags_metadata
from .db_pg import PostgresManager

# Tapdata helpers
import json
import time
import asyncio
import urllib.request
import urllib.error


@asynccontextmanager
async def lifespan(app: FastAPI):
    await PostgresManager.connect()
    try:
        # Note: Index creation logic might need update for split collections
        # create_indexes() 
        pass
    except Exception as e:
        print(f"Warning: Could not create Mongo indexes: {e}")
    yield
    await PostgresManager.close()


app = FastAPI(
    title="FHIR Hybrid Data API",
    version="0.1.5",
    description="API for accessing both NoSQL FHIR data and Relational SQL data.",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)


# -------------------------------------------------------------------------
# Helper: Get Collection by Resource Type
# -------------------------------------------------------------------------
def get_fhir_collection(resource_type: str):
    """
    Route to specific MongoDB collection based on resource type.
    Default collections: FHIR_Patient, FHIR_Encounter
    """
    client = get_client()
    db = client[settings.mongodb_db]
    
    # Map resource types to collection names from settings or defaults
    # Ensure settings has these fields or use defaults here
    coll_patient = getattr(settings, "collection_patient", "FHIR_Patient")
    coll_encounter = getattr(settings, "collection_encounter", "FHIR_Encounter")
    
    rt = resource_type.lower()
    if rt == "patient":
        return db[coll_patient]
    elif rt == "encounter":
        return db[coll_encounter]
    else:
        # Default fallback or raise error
        return db[coll_patient]


# -------------------------------------------------------------------------
# System
# -------------------------------------------------------------------------

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "ok", "tenant": settings.tenant}


# -------------------------------------------------------------------------
# Admin
# -------------------------------------------------------------------------

@app.post("/admin/seed", tags=["Admin API"])
def seed_data(
    patients: int = 10,
    encounters_per_patient: int = 3,
    practitioners: int = 5,
    careteams: int = 2,
    tenant: str = None,
):
    if tenant:
        settings.tenant = tenant
    bundle = generate_fhir_bundle(patients, encounters_per_patient, practitioners, careteams)
    result = ingest_bundle(bundle)
    return result


@app.post("/admin/wipe", tags=["Admin API"])
def wipe_data(confirm: bool = False, tenant: str = None):
    if not confirm:
        return {"message": "Pass confirm=true to wipe"}
    if tenant:
        settings.tenant = tenant

    client = get_client()
    db = client[settings.mongodb_db]
    
    # Wipe both collections
    coll_pat = get_fhir_collection("Patient")
    coll_enc = get_fhir_collection("Encounter")
    
    res1 = coll_pat.delete_many({}) # Wipe all for simplicity in demo
    res2 = coll_enc.delete_many({})
    
    return {
        "deleted_patients": res1.deleted_count, 
        "deleted_encounters": res2.deleted_count, 
        "tenant": settings.tenant
    }


# -------------------------------------------------------------------------
# Postgres Relational Viewer
# -------------------------------------------------------------------------

@app.get("/postgres/{table_name}", tags=["Relational Data Viewer"])
async def get_pg_table_data(table_name: str, limit: int = 50, offset: int = 0):
    """
    Fetch raw data from the relational database tables.
    """
    ALLOWED_TABLES = {
        "patient",
        "patient_type",
        "patient_info_log",
        "pmi_case",
        "address_detail",
        "district",
        "elderly_home_table",
        "document_type",
        "patient_hospital_data",
        "hospital",
        "patient_doc_info",
    }

    if table_name not in ALLOWED_TABLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid table name. Allowed: {', '.join(sorted(ALLOWED_TABLES))}",
        )

    query = f"SELECT * FROM public.{table_name} LIMIT $1 OFFSET $2"
    try:
        data = await PostgresManager.fetch_all(query, limit, offset)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------------
# INSPECTION ENDPOINTS (Data Viewer Support)
# -------------------------------------------------------------------------

@app.get("/inspect/distinctResourceTypes")
def get_distinct_resource_types():
    # Hardcoded for the new dual-collection architecture
    return {"resourceTypes": ["Patient", "Encounter"]}


@app.get("/inspect/resources")
def inspect_resources(
    resourceType: str = "Patient", 
    q: Optional[str] = None, 
    limit: int = 20, 
    page: int = 1
):
    """
    Unified inspector for Data Viewer.
    Routes to correct collection and applies basic search.
    """
    coll = get_fhir_collection(resourceType)
    
    # Basic filter (optional: add tenant check if needed)
    filter_doc = {}
    
    if q:
        # Search logic adapted for new JSON structure
        regex_q = {"$regex": q, "$options": "i"}
        
        if resourceType == "Patient":
            filter_doc["$or"] = [
                # Search by FHIR Name text
                {"resource.name.text": regex_q},
                # Search by AdminID (in identifier array)
                {"resource.identifier": {"$elemMatch": {"system": "adminid", "value": regex_q}}},
                # Search by MRN (in identifier array)
                {"resource.identifier": {"$elemMatch": {"system": "mrn:EDH", "value": regex_q}}}, # Adapt system as needed
                # Search by App extension patientName
                {"app.patientName": regex_q}
            ]
        elif resourceType == "Encounter":
            filter_doc["$or"] = [
                {"resource.id": regex_q},
                {"resource.status": regex_q},
                {"resource.class.code": regex_q}
            ]
        else:
            # Generic fallback
            filter_doc["resource.id"] = regex_q

    total = coll.count_documents(filter_doc)
    cursor = coll.find(filter_doc).skip((page - 1) * limit).limit(limit)
    
    items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)
        
    return {"items": items, "total": total}


# -------------------------------------------------------------------------
# Tapdata: generate token & provide dataflow URL (JSON)
# -------------------------------------------------------------------------

_TAPDATA_CACHE: Dict[str, Any] = {
    "token": None,
    "expires_at": 0.0,
    "ttl": None,
    "last_fetch_at": 0.0,
}
_TAPDATA_LOCK = asyncio.Lock()


def _tapdata_generate_token_sync() -> Dict[str, Any]:
    url = f"{settings.tapdata_base_url}/api/users/generatetoken"
    payload = {"accesscode": settings.tapdata_access_code}
    body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw)


async def _get_tapdata_token() -> Dict[str, Any]:
    now = time.time()
    token = _TAPDATA_CACHE.get("token")
    expires_at = float(_TAPDATA_CACHE.get("expires_at") or 0.0)

    if token and (now + settings.tapdata_token_skew_seconds) < expires_at:
        return {
            "access_token": token,
            "cached": True,
            "expires_at": expires_at,
            "ttl": _TAPDATA_CACHE.get("ttl"),
        }

    if not settings.tapdata_access_code:
        raise HTTPException(status_code=500, detail="TAPDATA_ACCESS_CODE is not configured")

    async with _TAPDATA_LOCK:
        now = time.time()
        token = _TAPDATA_CACHE.get("token")
        expires_at = float(_TAPDATA_CACHE.get("expires_at") or 0.0)
        if token and (now + settings.tapdata_token_skew_seconds) < expires_at:
            return {
                "access_token": token,
                "cached": True,
                "expires_at": expires_at,
                "ttl": _TAPDATA_CACHE.get("ttl"),
            }

        try:
            resp = await asyncio.to_thread(_tapdata_generate_token_sync)
        except urllib.error.HTTPError as e:
            try:
                err_body = e.read().decode("utf-8")
            except Exception:
                err_body = ""
            raise HTTPException(status_code=502, detail=f"Tapdata upstream HTTPError: {e.code} {err_body}")
        except urllib.error.URLError as e:
            raise HTTPException(status_code=502, detail=f"Tapdata upstream URLError: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Tapdata token request failed: {str(e)}")

        if resp.get("code") != "ok":
            raise HTTPException(status_code=502, detail=f"Tapdata API error: {resp}")

        data = resp.get("data") or {}
        new_token = data.get("id")
        ttl = data.get("ttl")

        if not new_token:
            raise HTTPException(status_code=502, detail=f"Tapdata token missing in response: {resp}")

        expires_at = time.time() + (int(ttl) if ttl else 0)

        _TAPDATA_CACHE["token"] = new_token
        _TAPDATA_CACHE["ttl"] = ttl
        _TAPDATA_CACHE["expires_at"] = expires_at
        _TAPDATA_CACHE["last_fetch_at"] = time.time()

        return {"access_token": new_token, "cached": False, "expires_at": expires_at, "ttl": ttl}


@app.get("/tapdata/dataflow", tags=["Tapdata"])
async def tapdata_dataflow_url():
    token_info = await _get_tapdata_token()
    target_url = f"{settings.tapdata_base_url}/#/dataflow?access_token={token_info['access_token']}"
    return {"target_url": target_url, "cached": token_info["cached"], "expires_at": token_info["expires_at"]}


@app.post("/tapdata/token", tags=["Tapdata"])
async def tapdata_token_debug():
    token_info = await _get_tapdata_token()
    target_url = f"{settings.tapdata_base_url}/#/dataflow?access_token={token_info['access_token']}"
    return {**token_info, "target_url": target_url}
