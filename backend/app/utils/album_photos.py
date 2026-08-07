from sqlalchemy import Engine, inspect, text


def ensure_album_photo_columns(engine: Engine) -> None:
    """Add album metadata introduced after the initial table release."""
    inspector = inspect(engine)
    if "album_photos" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("album_photos")}
    if "taken_on" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE album_photos ADD COLUMN taken_on DATE"))
