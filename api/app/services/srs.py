"""
SRS (Spaced Repetition System) 间隔重复算法实现
支持 SM-2 算法，预留 FSRS 扩展
"""
import math
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from dataclasses import dataclass

from app.models import SRSAlgorithm


@dataclass
class ReviewResult:
    """复习结果"""
    new_due: datetime
    new_interval: float
    new_ease: float
    new_reps: int
    new_lapses: int


class SM2Algorithm:
    """SM-2 算法实现"""
    
    # SM-2 算法常量
    INITIAL_INTERVAL = 1.0  # 初始间隔（天）
    INITIAL_EASE = 2.5      # 初始难度系数
    MIN_EASE = 1.3          # 最小难度系数
    EASE_BONUS = 0.1        # 简单卡片难度系数奖励
    EASE_PENALTY = 0.2      # 困难卡片难度系数惩罚
    HARD_PENALTY = 0.15     # 困难答案惩罚系数
    
    # 评分说明
    # 0 = Again (重来)
    # 1 = Hard (困难) 
    # 2 = Good (良好)
    # 3 = Easy (简单)
    
    @classmethod
    def calculate_next_review(
        cls,
        grade: int,
        current_interval: float,
        current_ease: float,
        current_reps: int,
        current_lapses: int
    ) -> ReviewResult:
        """
        根据SM-2算法计算下次复习时间
        
        Args:
            grade: 评分 (0-3)
            current_interval: 当前间隔(天)
            current_ease: 当前难度系数
            current_reps: 复习次数
            current_lapses: 遗忘次数
        
        Returns:
            ReviewResult: 新的复习参数
        """
        now = datetime.now(timezone.utc)
        
        # 处理不同评分
        if grade == 0:  # Again - 重来
            return cls._handle_again(now, current_ease, current_reps, current_lapses)
        elif grade == 1:  # Hard - 困难
            return cls._handle_hard(now, current_interval, current_ease, current_reps, current_lapses)
        elif grade == 2:  # Good - 良好
            return cls._handle_good(now, current_interval, current_ease, current_reps, current_lapses)
        elif grade == 3:  # Easy - 简单
            return cls._handle_easy(now, current_interval, current_ease, current_reps, current_lapses)
        else:
            raise ValueError(f"Invalid grade: {grade}. Must be 0-3.")
    
    @classmethod
    def _handle_again(
        cls, now: datetime, ease: float, reps: int, lapses: int
    ) -> ReviewResult:
        """处理'重来'评分"""
        # 重置间隔为10分钟，增加遗忘次数，降低难度系数
        new_interval = 10.0 / (24 * 60)  # 10分钟转换为天
        new_ease = max(cls.MIN_EASE, ease - cls.EASE_PENALTY)
        new_due = now + timedelta(days=new_interval)
        
        return ReviewResult(
            new_due=new_due,
            new_interval=new_interval,
            new_ease=new_ease,
            new_reps=0,  # 重置复习次数
            new_lapses=lapses + 1
        )
    
    @classmethod
    def _handle_hard(
        cls, now: datetime, interval: float, ease: float, reps: int, lapses: int
    ) -> ReviewResult:
        """处理'困难'评分"""
        # 降低难度系数，缩短间隔
        new_ease = max(cls.MIN_EASE, ease - cls.EASE_PENALTY)
        
        if reps == 0:
            # 第一次复习：1天后
            new_interval = 1.0
        elif reps == 1:
            # 第二次复习：6天后 
            new_interval = 6.0
        else:
            # 后续复习：使用缩短的间隔
            new_interval = interval * new_ease * (1 - cls.HARD_PENALTY)
        
        new_due = now + timedelta(days=new_interval)
        
        return ReviewResult(
            new_due=new_due,
            new_interval=new_interval,
            new_ease=new_ease,
            new_reps=reps + 1,
            new_lapses=lapses
        )
    
    @classmethod
    def _handle_good(
        cls, now: datetime, interval: float, ease: float, reps: int, lapses: int
    ) -> ReviewResult:
        """处理'良好'评分"""
        if reps == 0:
            # 第一次复习：1天后
            new_interval = 1.0
        elif reps == 1:
            # 第二次复习：6天后
            new_interval = 6.0
        else:
            # 后续复习：正常间隔
            new_interval = interval * ease
        
        new_due = now + timedelta(days=new_interval)
        
        return ReviewResult(
            new_due=new_due,
            new_interval=new_interval,
            new_ease=ease,  # 难度系数不变
            new_reps=reps + 1,
            new_lapses=lapses
        )
    
    @classmethod
    def _handle_easy(
        cls, now: datetime, interval: float, ease: float, reps: int, lapses: int
    ) -> ReviewResult:
        """处理'简单'评分"""
        # 增加难度系数，延长间隔
        new_ease = ease + cls.EASE_BONUS
        
        if reps == 0:
            # 第一次复习：4天后
            new_interval = 4.0
        elif reps == 1:
            # 第二次复习：6天后再乘以系数
            new_interval = 6.0 * new_ease
        else:
            # 后续复习：使用延长的间隔
            new_interval = interval * new_ease * 1.3  # 额外奖励
        
        new_due = now + timedelta(days=new_interval)
        
        return ReviewResult(
            new_due=new_due,
            new_interval=new_interval,
            new_ease=new_ease,
            new_reps=reps + 1,
            new_lapses=lapses
        )


class RollingReviewScheduler:
    """
    滚动学习法调度器
    实现 D-1, D-2, D-4, D-7 滚动复习机制
    """
    
    ROLLING_DAYS = [1, 2, 4, 7]  # 滚动复习间隔
    
    @classmethod
    def get_rolling_review_dates(cls, creation_date: datetime) -> list[datetime]:
        """
        获取滚动复习日期
        
        Args:
            creation_date: 卡片创建日期
        
        Returns:
            滚动复习日期列表
        """
        review_dates = []
        for days in cls.ROLLING_DAYS:
            review_date = creation_date + timedelta(days=days)
            review_dates.append(review_date)
        return review_dates
    
    @classmethod
    def should_include_in_rolling(cls, card_created: datetime, now: datetime) -> bool:
        """
        判断卡片是否应该包含在今日滚动复习中
        
        Args:
            card_created: 卡片创建时间
            now: 当前时间
        
        Returns:
            是否应该复习
        """
        days_since_creation = (now - card_created).days
        
        # 检查是否正好在滚动复习日期
        return days_since_creation in cls.ROLLING_DAYS
    
    @classmethod
    def get_next_rolling_date(cls, card_created: datetime, now: datetime) -> Optional[datetime]:
        """
        获取下一个滚动复习日期
        
        Args:
            card_created: 卡片创建时间
            now: 当前时间
        
        Returns:
            下一个滚动复习日期，如果没有则返回None
        """
        days_since_creation = (now - card_created).days
        
        for days in cls.ROLLING_DAYS:
            if days > days_since_creation:
                return card_created + timedelta(days=days)
        
        return None  # 已完成所有滚动复习


class SRSService:
    """SRS服务，统一管理不同算法"""
    
    def __init__(self):
        self.algorithms = {
            SRSAlgorithm.SM2: SM2Algorithm(),
        }
    
    def process_review(
        self,
        algorithm: SRSAlgorithm,
        grade: int,
        current_interval: float,
        current_ease: float,
        current_reps: int,
        current_lapses: int
    ) -> ReviewResult:
        """
        处理复习，返回新的SRS参数
        
        Args:
            algorithm: 使用的SRS算法
            grade: 评分 (0-3)
            current_interval: 当前间隔
            current_ease: 当前难度系数
            current_reps: 复习次数
            current_lapses: 遗忘次数
        
        Returns:
            ReviewResult: 新的复习参数
        """
        if algorithm == SRSAlgorithm.SM2:
            return SM2Algorithm.calculate_next_review(
                grade, current_interval, current_ease, current_reps, current_lapses
            )
        else:
            raise ValueError(f"Unsupported SRS algorithm: {algorithm}")
    
    def calculate_retention_rate(self, ease: float, interval: float) -> float:
        """
        计算预期记忆保持率
        
        Args:
            ease: 难度系数
            interval: 间隔天数
        
        Returns:
            预期记忆保持率 (0-1)
        """
        # 简化的记忆保持率计算
        # 基于Ebbinghaus遗忘曲线的近似
        decay_rate = 1.0 / ease
        retention = math.exp(-decay_rate * interval)
        return max(0.0, min(1.0, retention))


# 全局SRS服务实例
srs_service = SRSService()