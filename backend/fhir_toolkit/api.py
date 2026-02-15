from fastapi import FastAPI, Query, HTTPException
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
        create_indexes()
    except Exception as e:
        print(f"Warning: Could not create Mongo indexes: {e}")
    yield
    await PostgresManager.close()


app = FastAPI(
    title="FHIR Hybrid Data API",
    version="0.1.4",
    description="API for accessing both NoSQL FHIR data and Relational SQL data.",
    openapi_tags=tags_metadata,
    lifespan=lifespan,
)


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
    coll = db[settings.mongodb_collection]
    res = coll.delete_many({"tenant": settings.tenant})
    return {"deleted": res.deleted_count, "tenant": settings.tenant}


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
        "patient_info_log",
        "address_detail",
        "document_type",
        "patient_hospital_data",
        "hospital"
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
# Application API (kept as-is from your original)
# -------------------------------------------------------------------------

@app.get("/api/v1/cpi_case/_by-team/", tags=["Application API"], summary="[SPEC] Get CPI cases by team (GET)")
@app.post("/api/v1/cpi_case/_by-team/find", tags=["Application API"], summary="[SPEC] Get CPI cases by team (POST)")
def spec_cpi_cases_by_team(
    hospCode: str,
    teamCode: Optional[str] = None,
    wardCode: Optional[str] = None,
    specCode: Optional[str] = None,
    statusCode: Optional[str] = None,
    caseType: Optional[str] = None,
    limit: int = 20,
    page: int = 1,
):
    q = {"tenant": settings.tenant, "resourceType": "Encounter", "search.hospCode": hospCode}
    if teamCode:
        q["search.teamCode"] = teamCode
    if wardCode:
        q["search.wardCode"] = wardCode
    if specCode:
        q["search.specCode"] = specCode
    if statusCode:
        q["search.statusCode"] = statusCode
    if caseType:
        q["search.caseType"] = caseType

    client = get_client()
    db = client[settings.mongodb_db]
    coll = db[settings.mongodb_collection]

    total = coll.count_documents(q)
    enc_docs = list(
        coll.find(q).sort("search.start", -1).skip((page - 1) * limit).limit(limit)
    )

    patient_ids = [d.get("search", {}).get("patientKey") for d in enc_docs]
    patient_ids = list(filter(None, patient_ids))

    patient_map = {}
    if patient_ids:
        p_cursor = coll.find(
            {"tenant": settings.tenant, "resourceType": "Patient", "resource.id": {"$in": patient_ids}}
        )
        for p in p_cursor:
            patient_map[p.get("resource", {}).get("id")] = p

    data = []
    for doc in enc_docs:
        pid = doc.get("search", {}).get("patientKey")
        pat = patient_map.get(pid)

        p_payload = None
        if pat:
            p_payload = build_patient_payload(pat.get("resource"), pat.get("app"), pat.get("_id"))

        payload = build_cpi_payload(doc.get("resource"), doc.get("app"), doc.get("_id"), None, p_payload)
        data.append(payload)

    return {"data": data, "count": total}


@app.get("/api/v1/cpi_case/_by-mo/", tags=["Application API"])
def spec_cpi_cases_by_mo(
    hospCode: str,
    doctorCode: Optional[str] = None,
    specialistCode: Optional[str] = None,
    caseType: Optional[List[str]] = Query(default=None),
    statusCode: Optional[str] = "AC",
    limit: int = 20,
    page: int = 1,
):
    if caseType is None:
        caseType = ["I", "A"]

    q = {"tenant": settings.tenant, "resourceType": "Encounter", "search.hospCode": hospCode}
    if doctorCode:
        q["search.doctorCode"] = doctorCode
    if specialistCode:
        q["search.specialistCode"] = specialistCode
    if statusCode:
        q["search.statusCode"] = statusCode
    if caseType:
        q["search.caseType"] = {"$in": caseType}

    client = get_client()
    db = client[settings.mongodb_db]
    coll = db[settings.mongodb_collection]

    total = coll.count_documents(q)
    enc_docs = list(
        coll.find(q).sort("search.start", -1).skip((page - 1) * limit).limit(limit)
    )

    patient_ids = [d.get("search", {}).get("patientKey") for d in enc_docs]
    patient_ids = list(filter(None, patient_ids))

    patient_map = {}
    if patient_ids:
        p_cursor = coll.find(
            {"tenant": settings.tenant, "resourceType": "Patient", "resource.id": {"$in": patient_ids}}
        )
        for p in p_cursor:
            patient_map[p.get("resource", {}).get("id")] = p

    data = []
    for doc in enc_docs:
        pid = doc.get("search", {}).get("patientKey")
        pat = patient_map.get(pid)

        p_payload = None
        if pat:
            p_payload = build_patient_payload(pat.get("resource"), pat.get("app"), pat.get("_id"))

        payload = build_cpi_payload(doc.get("resource"), doc.get("app"), doc.get("_id"), None, p_payload)
        data.append(payload)

    return {"data": data, "count": total}


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
        # double-check after acquiring lock
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
