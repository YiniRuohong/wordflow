from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, desc
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.models import Wordbook, Word, Import
from app.schemas.schemas import WordbookCreate, WordbookResponse, WordbookUpdate

router = APIRouter(prefix="/api/v1/wordbooks", tags=["wordbooks"])


@router.get("/", response_model=List[WordbookResponse])
async def get_wordbooks(
    db: Session = Depends(get_db)
):
    """获取所有词库列表"""
    wordbooks = db.query(Wordbook).order_by(desc(Wordbook.created_at)).all()
    return wordbooks


@router.get("/active", response_model=WordbookResponse)
async def get_active_wordbook(
    db: Session = Depends(get_db)
):
    """获取当前激活的词库"""
    wordbook = db.query(Wordbook).filter(Wordbook.is_active == True).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="没有找到激活的词库"
        )
    return wordbook


@router.post("/", response_model=WordbookResponse)
async def create_wordbook(
    wordbook_data: WordbookCreate,
    db: Session = Depends(get_db)
):
    """创建新词库"""
    # 检查名称是否已存在
    existing = db.query(Wordbook).filter(Wordbook.name == wordbook_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="词库名称已存在"
        )
    
    wordbook = Wordbook(**wordbook_data.dict())
    db.add(wordbook)
    db.commit()
    db.refresh(wordbook)
    
    return wordbook


@router.get("/{wordbook_id}", response_model=WordbookResponse)
async def get_wordbook(
    wordbook_id: int,
    db: Session = Depends(get_db)
):
    """获取指定词库详情"""
    wordbook = db.query(Wordbook).filter(Wordbook.id == wordbook_id).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="词库不存在"
        )
    return wordbook


@router.put("/{wordbook_id}", response_model=WordbookResponse)
async def update_wordbook(
    wordbook_id: int,
    wordbook_data: WordbookUpdate,
    db: Session = Depends(get_db)
):
    """更新词库信息"""
    wordbook = db.query(Wordbook).filter(Wordbook.id == wordbook_id).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="词库不存在"
        )
    
    # 更新字段
    for field, value in wordbook_data.dict(exclude_unset=True).items():
        setattr(wordbook, field, value)
    
    wordbook.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(wordbook)
    
    return wordbook


@router.post("/{wordbook_id}/activate")
async def activate_wordbook(
    wordbook_id: int,
    db: Session = Depends(get_db)
):
    """激活指定词库（设为当前学习词库）"""
    wordbook = db.query(Wordbook).filter(Wordbook.id == wordbook_id).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="词库不存在"
        )
    
    # 先取消所有词库的激活状态
    db.query(Wordbook).update({Wordbook.is_active: False})
    
    # 激活指定词库
    wordbook.is_active = True
    wordbook.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(wordbook)
    
    return {"message": f"词库 '{wordbook.name}' 已激活", "wordbook": wordbook}


@router.delete("/{wordbook_id}")
async def delete_wordbook(
    wordbook_id: int,
    db: Session = Depends(get_db)
):
    """删除词库（包括所有关联的单词和学习记录）"""
    wordbook = db.query(Wordbook).filter(Wordbook.id == wordbook_id).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="词库不存在"
        )
    
    # 检查是否为激活词库
    if wordbook.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法删除当前激活的词库，请先切换到其他词库"
        )
    
    # 统计信息
    word_count = db.query(Word).filter(Word.wordbook_id == wordbook_id).count()
    
    # 删除词库（级联删除会自动删除关联的单词等）
    db.delete(wordbook)
    db.commit()
    
    return {
        "message": f"词库 '{wordbook.name}' 已删除", 
        "deleted_words": word_count
    }


@router.get("/{wordbook_id}/stats")
async def get_wordbook_stats(
    wordbook_id: int,
    db: Session = Depends(get_db)
):
    """获取词库统计信息"""
    wordbook = db.query(Wordbook).filter(Wordbook.id == wordbook_id).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="词库不存在"
        )
    
    # 统计单词数量
    total_words = db.query(Word).filter(Word.wordbook_id == wordbook_id).count()
    
    # 按CEFR等级统计
    cefr_stats = db.execute(text("""
        SELECT cefr, COUNT(*) as count 
        FROM words 
        WHERE wordbook_id = :wordbook_id AND cefr IS NOT NULL
        GROUP BY cefr
        ORDER BY cefr
    """), {"wordbook_id": wordbook_id}).fetchall()
    
    # 按词性统计
    pos_stats = db.execute(text("""
        SELECT pos, COUNT(*) as count 
        FROM words 
        WHERE wordbook_id = :wordbook_id AND pos IS NOT NULL
        GROUP BY pos
        ORDER BY count DESC
    """), {"wordbook_id": wordbook_id}).fetchall()
    
    # 按课程统计
    lesson_stats = db.execute(text("""
        SELECT lesson, COUNT(*) as count 
        FROM words 
        WHERE wordbook_id = :wordbook_id AND lesson IS NOT NULL
        GROUP BY lesson
        ORDER BY lesson
    """), {"wordbook_id": wordbook_id}).fetchall()
    
    return {
        "wordbook": wordbook,
        "total_words": total_words,
        "by_cefr": {row.cefr: row.count for row in cefr_stats},
        "by_pos": {row.pos: row.count for row in pos_stats},
        "by_lesson": {row.lesson: row.count for row in lesson_stats}
    }


@router.post("/{wordbook_id}/export")
async def export_wordbook(
    wordbook_id: int,
    format: str = "csv",
    db: Session = Depends(get_db)
):
    """导出词库数据"""
    wordbook = db.query(Wordbook).filter(Wordbook.id == wordbook_id).first()
    if not wordbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="词库不存在"
        )
    
    if format not in ["csv", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="支持的格式: csv, json"
        )
    
    # 获取词库的所有单词
    words = db.query(Word).filter(Word.wordbook_id == wordbook_id).all()
    
    if format == "csv":
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # 写入表头
        writer.writerow(['lemma', 'pos', 'gender', 'ipa', 'meaning_zh', 'lesson', 'cefr', 'tags'])
        
        # 写入数据
        for word in words:
            writer.writerow([
                word.lemma, word.pos, word.gender, word.ipa,
                word.meaning_zh, word.lesson, word.cefr, word.tags
            ])
        
        return {
            "format": "csv",
            "filename": f"{wordbook.name}.csv",
            "content": output.getvalue(),
            "count": len(words)
        }
    
    elif format == "json":
        import json
        
        data = {
            "wordbook": {
                "name": wordbook.name,
                "description": wordbook.description,
                "language": wordbook.language,
                "author": wordbook.author,
                "version": wordbook.version,
                "exported_at": datetime.utcnow().isoformat()
            },
            "words": [
                {
                    "lemma": word.lemma,
                    "pos": word.pos,
                    "gender": word.gender,
                    "ipa": word.ipa,
                    "meaning_zh": word.meaning_zh,
                    "lesson": word.lesson,
                    "cefr": word.cefr,
                    "tags": word.tags
                }
                for word in words
            ]
        }
        
        return {
            "format": "json",
            "filename": f"{wordbook.name}.json",
            "content": json.dumps(data, ensure_ascii=False, indent=2),
            "count": len(words)
        }