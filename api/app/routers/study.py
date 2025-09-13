from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.database import get_db
from app.schemas import ReviewCreate, ReviewResponse
from app.services.scheduler import StudyScheduler

router = APIRouter(prefix="/api/v1", tags=["study"])


@router.get("/study/next")
async def get_study_queue(
    limit: int = Query(30, ge=1, le=100, description="学习卡片数量限制"),
    new_limit: int = Query(10, ge=0, le=50, description="新卡片数量限制"), 
    include_rolling: bool = Query(True, description="是否包含滚动复习"),
    auto_adjust_new: bool = Query(True, description="根据积压自适应新卡数量"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    获取今日学习队列
    
    返回格式:
    {
        "cards": [...],
        "stats": {...},
        "session_id": "..."
    }
    
    卡片类型:
    - due: SRS到期卡片
    - rolling: 滚动复习卡片 (D-1/2/4/7)
    - new: 新卡片
    """
    scheduler = StudyScheduler(db)
    
    # 获取学习队列
    cards = scheduler.get_daily_study_queue(
        limit=limit,
        new_card_limit=new_limit,
        include_rolling=include_rolling,
        auto_adjust_new=auto_adjust_new
    )
    
    # 获取统计信息
    stats = scheduler.get_study_statistics()
    
    # 生成会话ID（简单实现）
    import uuid
    session_id = str(uuid.uuid4())
    
    return {
        "cards": cards,
        "stats": stats,
        "session_id": session_id,
        "queue_info": {
            "total_returned": len(cards),
        "limit": limit,
            "new_limit": new_limit,
            "include_rolling": include_rolling,
            "auto_adjust_new": auto_adjust_new
        }
    }


@router.post("/review", response_model=Dict[str, Any])
async def submit_review(
    review_data: ReviewCreate,
    db: Session = Depends(get_db)
):
    """
    提交复习结果
    
    评分标准:
    - 0: Again (重来) - 完全不记得，需要重新学习
    - 1: Hard (困难) - 记得但很困难，需要更频繁复习  
    - 2: Good (良好) - 正常难度，按标准间隔复习
    - 3: Easy (简单) - 很容易想起，可以延长复习间隔
    """
    if review_data.grade < 0 or review_data.grade > 3:
        raise HTTPException(
            status_code=400, 
            detail="评分必须在0-3之间: 0=重来, 1=困难, 2=良好, 3=简单"
        )
    
    try:
        scheduler = StudyScheduler(db)
        result = scheduler.process_review_result(
            card_id=review_data.card_id,
            grade=review_data.grade,
            elapsed_ms=review_data.elapsed_ms
        )
        
        return {
            "success": True,
            "message": "复习结果已记录",
            "result": result
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理复习结果失败: {str(e)}")


@router.get("/study/stats")
async def get_study_statistics(db: Session = Depends(get_db)):
    """获取学习统计信息"""
    scheduler = StudyScheduler(db)
    stats = scheduler.get_study_statistics()
    
    return {
        "today": stats,
        "recommendations": {
            "suggested_daily_new": min(10, stats["new_cards"]),
            "suggested_daily_reviews": min(30, stats["due_today"] + stats["rolling_reviews"]),
            "estimated_time_minutes": (stats["due_today"] + stats["rolling_reviews"]) * 0.5  # 估算每卡片30秒
        }
    }


@router.get("/study/progress")
async def get_study_progress(
    days: int = Query(7, ge=1, le=30, description="统计天数"),
    db: Session = Depends(get_db)
):
    """获取学习进度（最近N天）"""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func, and_
    from app.models import Review
    
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # 按日期统计复习数量
    daily_reviews = (
        db.query(
            func.date(Review.ts).label('date'),
            func.count(Review.id).label('count'),
            func.avg(Review.grade).label('avg_grade')
        )
        .filter(Review.ts >= start_date)
        .group_by(func.date(Review.ts))
        .order_by(func.date(Review.ts))
        .all()
    )
    
    # 格式化结果
    progress_data = []
    for row in daily_reviews:
        # 处理日期字段 - row.date 可能是字符串或date对象
        date_str = row.date
        if hasattr(date_str, 'isoformat'):
            date_str = date_str.isoformat()
        
        progress_data.append({
            "date": date_str,
            "reviews": row.count,
            "avg_grade": round(float(row.avg_grade), 2) if row.avg_grade else 0
        })
    
    # 计算总体统计
    total_reviews = sum(day["reviews"] for day in progress_data)
    avg_daily_reviews = total_reviews / days if days > 0 else 0
    
    return {
        "period": {
            "start_date": start_date.date().isoformat(),
            "end_date": now.date().isoformat(),
            "days": days
        },
        "daily_data": progress_data,
        "summary": {
            "total_reviews": total_reviews,
            "avg_daily_reviews": round(avg_daily_reviews, 1),
            "active_days": len(progress_data)
        }
    }


@router.get("/study/due-forecast")
async def get_due_forecast(
    days: int = Query(7, ge=1, le=30, description="预测天数"),
    db: Session = Depends(get_db)
):
    """获取未来到期卡片预测"""
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import func, and_
    from app.models import SRSState
    
    now = datetime.now(timezone.utc)
    forecast_data = []
    
    for i in range(days):
        date = now + timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        # 查询该日到期的卡片数
        due_count = (
            db.query(SRSState)
            .filter(
                and_(
                    SRSState.due >= start_of_day,
                    SRSState.due < end_of_day
                )
            )
            .count()
        )
        
        forecast_data.append({
            "date": date.date().isoformat(),
            "due_cards": due_count
        })
    
    return {
        "forecast_period": f"{days} days",
        "forecast": forecast_data,
        "total_due": sum(day["due_cards"] for day in forecast_data)
    }
