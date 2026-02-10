import asyncpg
from typing import Optional, List, Dict, Any
from .config import settings

class PostgresManager:
    _pool: Optional[asyncpg.Pool] = None

    @classmethod
    async def connect(cls):
        if cls._pool is None:
            try:
                cls._pool = await asyncpg.create_pool(
                    dsn=settings.postgres_uri,
                    min_size=1,
                    max_size=10
                )
                print("✅ Connected to PostgreSQL")
            except Exception as e:
                print(f"❌ Failed to connect to PostgreSQL: {e}")

    @classmethod
    async def close(cls):
        if cls._pool:
            await cls._pool.close()
            cls._pool = None
            print("🛑 Closed PostgreSQL connection")

    @classmethod
    async def get_pool(cls) -> asyncpg.Pool:
        if cls._pool is None:
            await cls.connect()
        return cls._pool

    @classmethod
    async def fetch_all(cls, query: str, *args) -> List[Dict[str, Any]]:
        pool = await cls.get_pool()
        async with pool.acquire() as conn:
            # Helper to convert Record objects to dicts
            records = await conn.fetch(query, *args)
            return [dict(r) for r in records]
