from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    # MongoDB Settings (Existing)
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb+srv://fhir:fhirGotapd54!@fhir.bd38rjg.mongodb.net")
    mongodb_db: str = os.getenv("MONGODB_DB", "fhir")
    collection_patient: str = os.getenv("COLLECTION_PATIENT", "FHIR_Patient")
    collection_encounter: str = os.getenv("COLLECTION_ENCOUNTER", "FHIR_Encounter")

    # Postgres Settings (New)
    postgres_uri: str = os.getenv(
        "POSTGRES_URI",
        "postgresql://postgres:Gotapd54!@47.76.248.214:5432/postgres"
    )

    # Common
    tenant: str = os.getenv("MONGODB_TENANT", os.getenv("TENANT", "acme"))
    fhir_base_url: str = os.getenv("FHIR_BASE_URL", "http://127.0.0.1:3100/fhir")
    enable_fhir_denorm: bool = os.getenv("ENABLE_FHIR_DENORMALIZATION", "true").lower() in ("1", "true", "yes")

    # Tapdata (New)
    tapdata_base_url: str = os.getenv("TAPDATA_BASE_URL", "http://113.98.206.142:3030")
    tapdata_access_code: str = os.getenv(
        "TAPDATA_ACCESS_CODE",
        "d9918d20568bc0a5c550685fdca4453d"
    )
    # 预留刷新提前量（秒），避免临界过期
    tapdata_token_skew_seconds: int = int(os.getenv("TAPDATA_TOKEN_SKEW_SECONDS", "60"))

settings = Settings()
