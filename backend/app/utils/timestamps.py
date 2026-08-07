from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import Engine, inspect, text

from app.timezone_utils import BEIJING_TZ


LEGACY_TIMESTAMP_MIGRATION = "normalize_legacy_utc_timestamps_to_beijing_v1"
# Commit 609bcea switched model defaults from UTC to Beijing time. Historical
# databases have no rows in the deployment gap, so this local-time boundary
# cleanly separates the two storage conventions.
BEIJING_STORAGE_CUTOFF = datetime(2026, 6, 10, 15, 47, 57)
TIMESTAMP_COLUMNS = (
    ("users", "created_at"),
    ("posts", "created_at"),
    ("posts", "updated_at"),
    ("profile", "updated_at"),
    ("digests", "created_at"),
    ("comments", "created_at"),
    ("reading_history", "visited_at"),
    ("likes", "created_at"),
    ("comment_likes", "created_at"),
)


def beijing_now_naive() -> datetime:
    """Return the canonical naive value used by SQLite DateTime columns."""
    return datetime.now(BEIJING_TZ).replace(tzinfo=None)


def beijing_isoformat(value: datetime | None) -> str:
    """Serialize stored Beijing wall time with an explicit UTC offset."""
    if value is None:
        return ""
    localized = value.replace(tzinfo=BEIJING_TZ) if value.tzinfo is None else value.astimezone(BEIJING_TZ)
    return localized.isoformat()


def normalize_legacy_timestamps(engine: Engine) -> int:
    """Convert pre-2026-06-10 UTC wall times to Beijing wall time exactly once."""
    migrated = 0
    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE TABLE IF NOT EXISTS app_migrations ("
                "name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
        )
        already_applied = connection.execute(
            text("SELECT 1 FROM app_migrations WHERE name = :name"),
            {"name": LEGACY_TIMESTAMP_MIGRATION},
        ).first()
        if already_applied:
            return 0

        table_names = set(inspect(connection).get_table_names())
        cutoff = BEIJING_STORAGE_CUTOFF.isoformat(sep=" ")
        for table_name, column_name in TIMESTAMP_COLUMNS:
            if table_name not in table_names:
                continue
            rows = connection.execute(
                text(
                    f'SELECT rowid AS migration_rowid, "{column_name}" AS value FROM "{table_name}" '
                    f'WHERE "{column_name}" IS NOT NULL AND "{column_name}" < :cutoff'
                ),
                {"cutoff": cutoff},
            ).mappings()
            for row in rows:
                value = row["value"]
                parsed = value if isinstance(value, datetime) else datetime.fromisoformat(str(value))
                normalized = (parsed + timedelta(hours=8)).replace(tzinfo=None)
                connection.execute(
                    text(f'UPDATE "{table_name}" SET "{column_name}" = :value WHERE rowid = :rowid'),
                    {"value": normalized.isoformat(sep=" "), "rowid": row["migration_rowid"]},
                )
                migrated += 1

        connection.execute(
            text("INSERT INTO app_migrations (name, applied_at) VALUES (:name, :applied_at)"),
            {"name": LEGACY_TIMESTAMP_MIGRATION, "applied_at": datetime.now().astimezone().isoformat()},
        )
    return migrated
