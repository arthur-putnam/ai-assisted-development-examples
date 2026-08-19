"""Database connection management."""

import sqlite3

from flask import g, current_app


def get_db():
    """Get database connection for the current request."""
    if "db" not in g:
        db_path = current_app.config["DATABASE_PATH"]
        if db_path.startswith("file:"):
            g.db = sqlite3.connect(
                db_path,
                detect_types=sqlite3.PARSE_DECLTYPES,
                uri=True,
            )
        else:
            g.db = sqlite3.connect(
                db_path,
                detect_types=sqlite3.PARSE_DECLTYPES,
            )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None):
    """Close database connection at end of request."""
    db = g.pop("db", None)
    if db is not None:
        db.close()
