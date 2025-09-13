import os
from pathlib import Path
from tempfile import NamedTemporaryFile

import pytest

from app.services.importer import FileImporter
from app.core.database import SessionLocal


def test_parse_csv_and_validate_minimal():
    db = SessionLocal()
    importer = FileImporter(db)
    csv_content = """lemma,pos,gender,ipa,meaning_zh,lesson,cefr,tags
bonjour,interj,,bɔ̃ʒuʁ,你好,L1,A1,寒暄
chemise,n,f,ʃəmiz,衬衫,L1,A1,衣物;名词
"""
    with NamedTemporaryFile(delete=False, suffix=".csv") as f:
        f.write(csv_content.encode("utf-8"))
        path = f.name
    try:
        rows = importer._parse_csv_file(path, ".csv")
        assert len(rows) == 2
        importer._validate_data(rows)
    finally:
        Path(path).unlink(missing_ok=True)
        db.close()


def test_parse_csv_missing_required_columns():
    db = SessionLocal()
    importer = FileImporter(db)
    csv_content = """word,meaning
bonjour,你好
"""
    with NamedTemporaryFile(delete=False, suffix=".csv") as f:
        f.write(csv_content.encode("utf-8"))
        path = f.name
    try:
        rows = importer._parse_csv_file(path, ".csv")
        with pytest.raises(Exception):
            importer._validate_data(rows)
    finally:
        Path(path).unlink(missing_ok=True)
        db.close()


def test_parse_csv_with_empty_rows_ignored():
    db = SessionLocal()
    importer = FileImporter(db)
    csv_content = """lemma,meaning_zh
bonjour,你好
,
"""
    with NamedTemporaryFile(delete=False, suffix=".csv") as f:
        f.write(csv_content.encode("utf-8"))
        path = f.name
    try:
        rows = importer._parse_csv_file(path, ".csv")
        # empty row dropped
        assert len(rows) == 1
        importer._validate_data(rows)
    finally:
        Path(path).unlink(missing_ok=True)
        db.close()

