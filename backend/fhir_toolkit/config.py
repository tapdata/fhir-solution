from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    # MongoDB Settings (Existing)
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
    mongodb_db: str = os.getenv("MONGODB_DB", "fhir_demo")
    mongodb_collection: str = os.getenv("MONGODB_COLLECTION", "fhir")

    # Postgres Settings (New)
    postgres_uri: str = os.getenv(
        "POSTGRES_URI",
        "postgresql://postgres:Gotapd54!@127.0.0.1:5432/postgres"
    )

    # Common
    tenant: str = os.getenv("MONGODB_TENANT", os.getenv("TENANT", "acme"))
    fhir_base_url: str = os.getenv("FHIR_BASE_URL", "http://127.0.0.1:3100/fhir")
    enable_fhir_denorm: bool = os.getenv("ENABLE_FHIR_DENORMALIZATION", "true").lower() in ("1", "true", "yes")

    # Tapdata (New)
    tapdata_base_url: str = os.getenv("TAPDATA_BASE_URL", "http://113.98.206.142:3030")
    tapdata_access_code: str = os.getenv(
        "TAPDATA_ACCESS_CODE",
        "3324cfdf-7d3e-4792-bd32-571638d4562e"
    )
    # 预留刷新提前量（秒），避免临界过期
    tapdata_token_skew_seconds: int = int(os.getenv("TAPDATA_TOKEN_SKEW_SECONDS", "60"))

settings = Settings()
