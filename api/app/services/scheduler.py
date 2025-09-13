"""
学习调度器 - 实现滚动学习法 + SRS 的混合调度
"""
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, text

from app.models import Card, SRSState, Word, Review, Wordbook
from app.services.srs import RollingReviewScheduler, srs_service


class StudyScheduler:
    """
    学习调度器
    
    核心逻辑：
    1. 到期卡片（SRS due）
    2. 滚动复习卡片（D-1/2/4/7）
    3. 新卡片（从未学习过）
    4. 按优先级和权重混合返回
    """
    
    def __init__(self, db: Session):
        self.db = db
        self._active_wordbook = None  # 缓存当前激活的词库
    
    def _get_active_wordbook(self) -> Optional[Wordbook]:
        """获取当前激活的词库"""
        if self._active_wordbook is None:
            self._active_wordbook = self.db.query(Wordbook).filter(Wordbook.is_active == True).first()
        return self._active_wordbook
    
    def get_daily_study_queue(
        self, 
        limit: int = 30,
        new_card_limit: int = 10,
        include_rolling: bool = True,
        auto_adjust_new: bool = True
    ) -> List[Dict[str, Any]]:
        """
        获取今日学习队列（仅限当前激活的词库）
        
        Args:
            limit: 总卡片数量限制
            new_card_limit: 新卡片数量限制
            include_rolling: 是否包含滚动复习
        
        Returns:
            学习卡片列表，包含优先级信息
        """
        # 检查是否有激活的词库
        active_wordbook = self._get_active_wordbook()
        if not active_wordbook:
            return []  # 没有激活词库，返回空队列
        
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # 1. 获取到期卡片（SRS due）
        due_cards = self._get_due_cards(now, limit, active_wordbook.id)
        
        # 2. 获取滚动复习卡片
        rolling_cards = []
        if include_rolling:
            rolling_cards = self._get_rolling_review_cards(now, limit - len(due_cards), active_wordbook.id)
        
        # 3. 自适应新卡片上限：当到期/滚动卡片很多时，自动减少新卡片数量，避免积压
        remaining_limit = limit - len(due_cards) - len(rolling_cards)
        adaptive_new_limit = min(new_card_limit, max(0, remaining_limit))
        if auto_adjust_new:
            backlog = max(0, len(due_cards) + len(rolling_cards) - int(0.7 * limit))
            if backlog > 0:
                adaptive_new_limit = max(0, adaptive_new_limit - min(adaptive_new_limit, backlog // 2))
        new_cards = self._get_new_cards(adaptive_new_limit, active_wordbook.id)
        
        # 4. 合并和排序
        all_cards = []
        
        # 添加到期卡片（最高优先级）
        for card in due_cards:
            card_info = self._build_card_info(card, "due", 1)
            all_cards.append(card_info)
        
        # 添加滚动复习卡片（中等优先级）
        for card in rolling_cards:
            card_info = self._build_card_info(card, "rolling", 2)
            all_cards.append(card_info)
        
        # 添加新卡片（低优先级）
        for card in new_cards:
            card_info = self._build_card_info(card, "new", 3)
            all_cards.append(card_info)
        
        # 5. 智能排序：结合优先级、超期程度、记忆保持率、是否疑难（leech）
        sorted_cards = self._rank_and_mix(all_cards, now)
        
        return sorted_cards[:limit]
    
    def _get_due_cards(self, now: datetime, limit: int, wordbook_id: int) -> List[Card]:
        """获取到期卡片（仅限指定词库）"""
        due_cards = (
            self.db.query(Card)
            .join(SRSState)
            .join(Word)
            .filter(
                and_(
                    SRSState.due <= now,
                    Word.wordbook_id == wordbook_id
                )
            )
            .order_by(SRSState.due.asc())  # 越早到期的优先级越高
            .limit(limit * 2)  # 多获取一些以备排序
            .all()
        )
        return due_cards
    
    def _get_rolling_review_cards(self, now: datetime, limit: int, wordbook_id: int) -> List[Card]:
        """获取滚动复习卡片（仅限指定词库）"""
        if limit <= 0:
            return []
        
        rolling_cards = []
        
        # 查找符合D-1/2/4/7滚动复习条件的卡片
        for days_back in RollingReviewScheduler.ROLLING_DAYS:
            target_date = now - timedelta(days=days_back)
            start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            # 查找在目标日期创建的卡片（仅限指定词库）
            cards = (
                self.db.query(Card)
                .join(Word)
                .filter(
                    and_(
                        Card.created_at >= start_of_day,
                        Card.created_at < end_of_day,
                        Word.wordbook_id == wordbook_id
                    )
                )
                .limit(limit // 4)  # 每个时间段分配平均数量
                .all()
            )
            
            rolling_cards.extend(cards)
            
            if len(rolling_cards) >= limit:
                break
        
        return rolling_cards[:limit]
    
    def _get_new_cards(self, limit: int, wordbook_id: int) -> List[Card]:
        """获取新卡片（从未复习过的，仅限指定词库）"""
        if limit <= 0:
            return []
        
        new_cards = (
            self.db.query(Card)
            .join(SRSState)
            .join(Word)
            .filter(
                and_(
                    SRSState.reps == 0,  # 从未复习过
                    Word.wordbook_id == wordbook_id
                )
            )
            .order_by(Card.created_at.asc())  # 按创建时间排序，先学早期的
            .limit(limit)
            .all()
        )
        return new_cards
    
    def _build_card_info(self, card: Card, card_type: str, priority: int) -> Dict[str, Any]:
        """构建卡片信息"""
        # 获取关联的单词和SRS状态
        word = card.word
        srs_state = card.srs_state
        
        # 计算一些有用的元数据
        retention_rate = srs_service.calculate_retention_rate(
            srs_state.ease, srs_state.interval
        ) if srs_state else 0.0
        
        return {
            "card_id": card.id,
            "word_id": word.id,
            "lemma": word.lemma,
            "meaning_zh": word.meaning_zh,
            "pos": word.pos,
            "gender": word.gender,
            "ipa": word.ipa,
            "lesson": word.lesson,
            "cefr": word.cefr,
            "tags": word.tags,
            "language": (word.wordbook.language if word.wordbook else None),
            "card_type": card_type,  # "due", "rolling", "new"
            "priority": priority,
            "template": card.template,
            "hint": card.hint,
            "srs": {
                "due": srs_state.due.isoformat() if srs_state else None,
                "interval": srs_state.interval if srs_state else 0,
                "ease": srs_state.ease if srs_state else 2.5,
                "reps": srs_state.reps if srs_state else 0,
                "lapses": srs_state.lapses if srs_state else 0,
                "retention_rate": retention_rate
            }
        }
    
    def _rank_and_mix(self, cards: List[Dict[str, Any]], now: datetime) -> List[Dict[str, Any]]:
        """按综合分排序并在同分附近轻度打散"""
        import random
        ranked: List[tuple[float, Dict[str, Any]]] = []
        for c in cards:
            base = {"due": 3.0, "rolling": 2.0, "new": 1.0}.get(c["card_type"], 1.0)
            # 超期程度（天）
            overdue_days = 0.0
            if c["srs"].get("due"):
                try:
                    due_dt = datetime.fromisoformat(c["srs"]["due"])  # tz-aware
                    overdue_days = max(0.0, (now - due_dt).total_seconds() / 86400.0)
                except Exception:
                    overdue_days = 0.0
            # 记忆保持率越低越优先
            retention_penalty = 1.0 - float(c["srs"].get("retention_rate") or 0.0)
            # 疑难卡片（leech）轻度降权
            is_leech = c.get("tags") and ("leech" in (c.get("tags") or ""))
            leech_penalty = -0.5 if is_leech else 0.0
            # 综合分
            score = base + 0.8 * overdue_days + 0.6 * retention_penalty + leech_penalty
            # 轻度噪声避免死板
            score += random.uniform(-0.05, 0.05)
            ranked.append((score, c))

        ranked.sort(key=lambda x: x[0], reverse=True)
        return [c for _, c in ranked]
    
    def process_review_result(
        self, 
        card_id: int, 
        grade: int, 
        elapsed_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        处理复习结果，更新SRS状态
        
        Args:
            card_id: 卡片ID
            grade: 评分 (0-3)
            elapsed_ms: 答题用时（毫秒）
        
        Returns:
            更新后的SRS信息
        """
        card = self.db.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise ValueError(f"Card {card_id} not found")
        
        srs_state = card.srs_state
        if not srs_state:
            raise ValueError(f"SRS state not found for card {card_id}")
        
        # 使用SRS算法计算新的参数
        result = srs_service.process_review(
            algorithm=srs_state.algo,
            grade=grade,
            current_interval=srs_state.interval,
            current_ease=srs_state.ease,
            current_reps=srs_state.reps,
            current_lapses=srs_state.lapses
        )
        
        # 更新SRS状态
        srs_state.due = result.new_due
        srs_state.interval = result.new_interval
        srs_state.ease = result.new_ease
        srs_state.reps = result.new_reps
        srs_state.lapses = result.new_lapses
        srs_state.last_reviewed = datetime.now(timezone.utc)
        
        # 疑难（leech）识别与处理：累计遗忘次数高的卡片做标记与温和延迟
        leech_threshold = 8
        tags = (card.tags or "").split(",") if card.tags else []
        tags = [t.strip() for t in tags if t and t.strip()]
        became_leech = False
        if srs_state.lapses >= leech_threshold:
            if "leech" not in tags:
                tags.append("leech")
                became_leech = True
            # 若评分为again/hard，对leech卡片稍作延期，避免连错打击
            if grade <= 1:
                srs_state.due = datetime.now(timezone.utc) + timedelta(days=3)
                srs_state.ease = max(1.3, srs_state.ease - 0.05)
        card.tags = ",".join(tags) if tags else None
        
        # 创建复习记录
        review = Review(
            card_id=card_id,
            grade=grade,
            elapsed_ms=elapsed_ms
        )
        self.db.add(review)
        
        # 提交更改
        self.db.commit()
        
        return {
            "card_id": card_id,
            "grade": grade,
            "next_due": result.new_due.isoformat(),
            "new_interval": result.new_interval,
            "new_ease": result.new_ease,
            "total_reps": result.new_reps,
            "total_lapses": result.new_lapses,
            "elapsed_ms": elapsed_ms
        }
    
    def get_study_statistics(self) -> Dict[str, Any]:
        """获取学习统计信息（仅限当前激活的词库）"""
        # 检查是否有激活的词库
        active_wordbook = self._get_active_wordbook()
        if not active_wordbook:
            return {
                "total_cards": 0,
                "due_today": 0,
                "new_cards": 0,
                "rolling_reviews": 0,
                "reviewed_today": 0,
                "study_queue_size": 0,
                "wordbook_name": None
            }
        
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # 总卡片数（仅限当前激活词库）
        total_cards = (
            self.db.query(Card)
            .join(Word)
            .filter(Word.wordbook_id == active_wordbook.id)
            .count()
        )
        
        # 今日到期卡片数（仅限当前激活词库）
        due_today = (
            self.db.query(Card)
            .join(SRSState)
            .join(Word)
            .filter(
                and_(
                    SRSState.due <= now,
                    Word.wordbook_id == active_wordbook.id
                )
            )
            .count()
        )
        
        # 新卡片数（仅限当前激活词库）
        new_cards = (
            self.db.query(Card)
            .join(SRSState)
            .join(Word)
            .filter(
                and_(
                    SRSState.reps == 0,
                    Word.wordbook_id == active_wordbook.id
                )
            )
            .count()
        )
        
        # 今日已复习（仅限当前激活词库）
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        reviewed_today = (
            self.db.query(Review)
            .join(Card)
            .join(Word)
            .filter(
                and_(
                    Review.ts >= today_start,
                    Word.wordbook_id == active_wordbook.id
                )
            )
            .count()
        )
        
        # 滚动复习卡片数（仅限当前激活词库）
        rolling_count = len(self._get_rolling_review_cards(now, 1000, active_wordbook.id))
        
        return {
            "total_cards": total_cards,
            "due_today": due_today,
            "new_cards": new_cards,
            "rolling_reviews": rolling_count,
            "reviewed_today": reviewed_today,
            "study_queue_size": due_today + rolling_count + min(10, new_cards),
            "wordbook_name": active_wordbook.name
        }
