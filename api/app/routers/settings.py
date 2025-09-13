from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.models.models import Setting
from app.schemas.schemas import AppSettings


router = APIRouter(prefix="/api/v1", tags=["settings"])


SETTINGS_KEY = "app"


@router.get("/settings", response_model=AppSettings)
async def get_settings(db: Session = Depends(get_db)):
    s = db.query(Setting).filter(Setting.key == SETTINGS_KEY).first()
    if not s:
        # return defaults
        return AppSettings()
    try:
        data = json.loads(s.value)
        return AppSettings(**data)
    except Exception:
        # fallback to defaults on parse error
        return AppSettings()


@router.put("/settings", response_model=AppSettings)
async def update_settings(payload: AppSettings, db: Session = Depends(get_db)):
    s = db.query(Setting).filter(Setting.key == SETTINGS_KEY).first()
    if not s:
        s = Setting(key=SETTINGS_KEY, value=json.dumps(payload.model_dump(), ensure_ascii=False))
        db.add(s)
    else:
        s.value = json.dumps(payload.model_dump(), ensure_ascii=False)
    db.commit()
    return payload

