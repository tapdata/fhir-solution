from typing import Iterable, Tuple, Dict, Any, List, Optional
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError
from .db import get_collection
from .mappings import envelope, ensure_resource_id

def _flush_bulk(coll, ops: List[UpdateOne]) -> None:
    if not ops:
        return
    try:
        result = coll.bulk_write(ops, ordered=False)
    except Exception as e:
        import traceback
        print("bulk_write raised:", repr(e), flush=True)
        traceback.print_exc()
        raise
    finally:
        ops.clear()

def upsert_documents(
    pairs: Iterable[Tuple[Dict[str, Any], Dict[str, Any]]],
    tenant: Optional[str] = None,
) -> int:
    print(">>> upsert_documents called", flush=True)
    coll = get_collection()
    ops: List[UpdateOne] = []
    count = 0
    for resource, app in pairs:
        ensure_resource_id(resource)
        doc = envelope(resource, app, tenant=tenant)
        filt = {
            "tenant": doc["tenant"],
            "resourceType": doc["resourceType"],
            "resource.id": doc["resource"]["id"],
        }
        ops.append(UpdateOne(filt, {"$set": doc}, upsert=True))
        count += 1
        if len(ops) >= 1000:
            _flush_bulk(coll, ops)
    _flush_bulk(coll, ops)
    return count

def ingest_bundle(bundle_pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Wrapper to ingest a generated bundle of (resource, app) pairs.
    Used by the /admin/seed endpoint.
    """
    count = upsert_documents(bundle_pairs)
    return {"status": "ok", "inserted_count": count}
