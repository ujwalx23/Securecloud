import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text, select
from backend.database import engine, Base, AsyncSessionLocal
from backend.models import User, StorageAllocationSlot

ALTER_COLUMNS_SQL = """
DO $$ 
BEGIN
    -- users table additions
    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
    EXCEPTION WHEN duplicate_column THEN NULL; END;
    
    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS text_storage_quota_bytes BIGINT DEFAULT 5242880;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS text_storage_used_bytes BIGINT DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'basic';
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_promotional_premium BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS queue_position INTEGER;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS queue_joined_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_profile_public BOOLEAN DEFAULT TRUE;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_allow_messages_from VARCHAR(20) DEFAULT 'connections';
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS online_status BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100);
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL; END;

    BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;
"""

CREATE_INDEX_SQL = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
"""

async def run_migration():
    print("Starting database migration on PostgreSQL Neon...")
    async with engine.begin() as conn:
        # 1. Apply column additions to users if table already exists
        try:
            print("Applying ALTER TABLE schema updates for users...")
            await conn.execute(text(ALTER_COLUMNS_SQL))
            await conn.execute(text(CREATE_INDEX_SQL))
        except Exception as e:
            print(f"Warning during ALTER TABLE: {e}")

        # 2. Run Base.metadata.create_all to ensure all other enterprise tables exist
        print("Creating all tables defined in Base.metadata...")
        await conn.run_sync(Base.metadata.create_all)
        print("Table creation complete.")

    # 3. Seed the 10 Promotional Storage Slots (1 to 10)
    print("Verifying 10 promotional storage allocation slots...")
    async with AsyncSessionLocal() as session:
        for slot_num in range(1, 11):
            result = await session.execute(
                select(StorageAllocationSlot).where(StorageAllocationSlot.slot_number == slot_num)
            )
            slot = result.scalars().first()
            if not slot:
                new_slot = StorageAllocationSlot(
                    slot_number=slot_num,
                    user_id=None,
                    allocated_at=None,
                    is_active=True
                )
                session.add(new_slot)
                print(f"  + Created storage allocation slot #{slot_num}")
        await session.commit()
        print("Storage allocation slots initialized successfully.")

    print("Migration finished cleanly.")

if __name__ == "__main__":
    asyncio.run(run_migration())
