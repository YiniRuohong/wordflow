from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, and_
from typing import Optional, List

from app.core.database import get_db
from app.models import Word, Card, Wordbook
from app.schemas import WordResponse, WordSearchResponse

router = APIRouter(prefix="/api/v1", tags=["words"])


def get_active_wordbook(db: Session) -> Optional[Wordbook]:
    """获取当前激活的词库"""
    return db.query(Wordbook).filter(Wordbook.is_active == True).first()


@router.get("/words/search", response_model=WordSearchResponse)
async def search_words(
    q: Optional[str] = Query(None, description="搜索关键词（支持前缀匹配）"),
    lesson: Optional[str] = Query(None, description="课程过滤 (L1, L2, ...)"),
    cefr: Optional[str] = Query(None, description="CEFR等级过滤 (A1, A2, B1, ...)"),
    pos: Optional[str] = Query(None, description="词性过滤 (n, v, adj, ...)"),
    page: int = Query(1, ge=1, description="页码"),
    per_page: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db)
):
    """
    搜索单词（仅限当前激活的词库）
    
    支持功能：
    - 全文检索（FTS5）
    - 前缀匹配
    - 课程、CEFR等级、词性过滤
    - 分页
    """
    # 获取当前激活的词库
    active_wordbook = get_active_wordbook(db)
    if not active_wordbook:
        raise HTTPException(status_code=400, detail="没有激活的词库")
    
    query = db.query(Word).filter(Word.wordbook_id == active_wordbook.id)
    
    # 如果有搜索关键词，使用FTS5全文检索
    if q and q.strip():
        search_term = q.strip()
        
        # 使用FTS5进行全文搜索（仅限当前激活词库），使用bm25排序并为列设置权重（lemma > meaning > others）
        # words_fts列顺序：id UNINDEXED, lemma, meaning_zh, pos, lesson, tags
        fts_query = text(
            """
            SELECT words.*, bm25(words_fts, 10.0, 6.0, 2.0, 1.0, 1.0) AS rank
            FROM words
            JOIN words_fts ON words.id = words_fts.id
            WHERE words_fts MATCH :search_term AND words.wordbook_id = :wordbook_id
            ORDER BY rank ASC
            """
        )
        
        # 准备FTS5搜索词（支持前缀匹配）
        if not search_term.endswith('*'):
            search_term += '*'
        
        # 执行FTS5查询
        try:
            fts_results = db.execute(fts_query, {
                "search_term": search_term, 
                "wordbook_id": active_wordbook.id
            }).fetchall()
            # row maps to (all words.* columns + rank). id is at index 0
            word_ids = [row[0] for row in fts_results]
            
            if word_ids:
                query = query.filter(Word.id.in_(word_ids))
            else:
                # FTS5没有结果，尝试常规模糊匹配作为回退（已经过滤了wordbook_id）
                query = query.filter(
                    or_(
                        Word.lemma.ilike(f'%{q.strip()}%'),
                        Word.meaning_text.ilike(f'%{q.strip()}%'),
                        Word.meaning_zh.ilike(f'%{q.strip()}%')
                    )
                )
        except Exception as e:
            print(f"FTS5查询失败，使用常规查询: {e}")
            # 回退到常规查询（已经过滤了wordbook_id）
            query = query.filter(
                or_(
                    Word.lemma.ilike(f'%{q.strip()}%'),
                    Word.meaning_text.ilike(f'%{q.strip()}%'),
                    Word.meaning_zh.ilike(f'%{q.strip()}%')
                )
            )
    
    # 应用过滤条件
    if lesson:
        query = query.filter(Word.lesson == lesson)
    
    if cefr:
        query = query.filter(Word.cefr == cefr)
    
    if pos:
        query = query.filter(Word.pos == pos)
    
    # 获取总数
    total = query.count()
    
    # 应用分页
    offset = (page - 1) * per_page
    words = query.offset(offset).limit(per_page).all()
    
    return WordSearchResponse(
        words=[WordResponse.model_validate(word) for word in words],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/words/suggest", response_model=List[str])
async def suggest_words(
    q: str = Query(..., min_length=1, description="前缀建议：lemma/含义"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """根据前缀提供联想建议（仅限当前激活的词库）"""
    active_wordbook = get_active_wordbook(db)
    if not active_wordbook:
        raise HTTPException(status_code=400, detail="没有激活的词库")

    term = q.strip()
    suggestions: List[str] = []
    if not term:
        return suggestions

    # 优先使用FTS5前缀匹配lemma/meaning_zh
    try:
        fts_query = text(
            """
            SELECT DISTINCT words.lemma
            FROM words
            JOIN words_fts ON words.id = words_fts.id
            WHERE words_fts MATCH :search
              AND words.wordbook_id = :wordbook_id
            LIMIT :limit
            """
        )
        search = term if term.endswith("*") else term + "*"
        rows = db.execute(fts_query, {
            "search": search,
            "wordbook_id": active_wordbook.id,
            "limit": limit,
        }).fetchall()
        suggestions = [r[0] for r in rows if r[0]]
    except Exception:
        # 回退到LIKE
        like = f"{term}%"
        rows = (
            db.query(Word.lemma)
            .filter(
                and_(
                    Word.wordbook_id == active_wordbook.id,
                    or_(Word.lemma.ilike(like), Word.meaning_text.ilike(f"%{term}%"), Word.meaning_zh.ilike(f"%{term}%")),
                )
            )
            .limit(limit)
            .all()
        )
        suggestions = [r[0] for r in rows if r[0]]

    return suggestions


@router.get("/words/{word_id}", response_model=WordResponse)
async def get_word(word_id: int, db: Session = Depends(get_db)):
    """获取单词详情（仅限当前激活词库中的单词）"""
    # 获取当前激活的词库
    active_wordbook = get_active_wordbook(db)
    if not active_wordbook:
        raise HTTPException(status_code=400, detail="没有激活的词库")
    
    word = db.query(Word).filter(
        Word.id == word_id,
        Word.wordbook_id == active_wordbook.id
    ).first()
    
    if not word:
        raise HTTPException(status_code=404, detail="单词不存在或不在当前激活的词库中")
    
    return WordResponse.model_validate(word)


@router.get("/words", response_model=WordSearchResponse)
async def list_words(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    lesson: Optional[str] = Query(None),
    cefr: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """获取单词列表（仅限当前激活的词库）"""
    # 获取当前激活的词库
    active_wordbook = get_active_wordbook(db)
    if not active_wordbook:
        raise HTTPException(status_code=400, detail="没有激活的词库")
    
    query = db.query(Word).filter(Word.wordbook_id == active_wordbook.id)
    
    if lesson:
        query = query.filter(Word.lesson == lesson)
    
    if cefr:
        query = query.filter(Word.cefr == cefr)
    
    total = query.count()
    
    offset = (page - 1) * per_page
    words = query.order_by(Word.created_at.desc()).offset(offset).limit(per_page).all()
    
    return WordSearchResponse(
        words=[WordResponse.model_validate(word) for word in words],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/stats")
async def get_word_stats(db: Session = Depends(get_db)):
    """获取单词统计信息（仅限当前激活的词库）"""
    # 获取当前激活的词库
    active_wordbook = get_active_wordbook(db)
    if not active_wordbook:
        raise HTTPException(status_code=400, detail="没有激活的词库")
    
    # 总单词数
    total_words = db.query(Word).filter(Word.wordbook_id == active_wordbook.id).count()
    
    # 按课程统计
    lesson_stats = db.execute(text("""
        SELECT lesson, COUNT(*) as count 
        FROM words 
        WHERE lesson IS NOT NULL AND wordbook_id = :wordbook_id
        GROUP BY lesson 
        ORDER BY lesson
    """), {"wordbook_id": active_wordbook.id}).fetchall()
    
    # 按CEFR等级统计
    cefr_stats = db.execute(text("""
        SELECT cefr, COUNT(*) as count 
        FROM words 
        WHERE cefr IS NOT NULL AND wordbook_id = :wordbook_id
        GROUP BY cefr 
        ORDER BY cefr
    """), {"wordbook_id": active_wordbook.id}).fetchall()
    
    # 按词性统计
    pos_stats = db.execute(text("""
        SELECT pos, COUNT(*) as count 
        FROM words 
        WHERE pos IS NOT NULL AND wordbook_id = :wordbook_id
        GROUP BY pos 
        ORDER BY count DESC
    """), {"wordbook_id": active_wordbook.id}).fetchall()
    
    return {
        "wordbook_name": active_wordbook.name,
        "total_words": total_words,
        "by_lesson": {row[0]: row[1] for row in lesson_stats},
        "by_cefr": {row[0]: row[1] for row in cefr_stats}, 
        "by_pos": {row[0]: row[1] for row in pos_stats}
    }
