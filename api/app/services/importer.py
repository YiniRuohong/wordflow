import pandas as pd
import json
import tempfile
import shutil
from pathlib import Path
from typing import List, Dict, Any, Tuple
import re
from fastapi import UploadFile
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models import Word, Card, Import, ImportStatus, SRSState, Wordbook
from app.schemas import WordCreate, ImportCreate
from app.core.database import get_db


class ImportError(Exception):
    """导入相关错误"""
    pass


class FileImporter:
    """文件导入处理器"""
    
    SUPPORTED_FORMATS = {'.csv', '.tsv', '.json'}
    REQUIRED_COLUMNS = {'lemma', 'meaning_zh'}
    
    def __init__(self, db: Session):
        self.db = db
    
    async def process_upload_file(self, file: UploadFile) -> Tuple[str, List[Dict[str, Any]]]:
        """处理上传的文件，返回文件路径和解析的数据"""
        
        # 验证文件格式
        file_suffix = Path(file.filename).suffix.lower()
        if file_suffix not in self.SUPPORTED_FORMATS:
            raise ImportError(f"不支持的文件格式: {file_suffix}. 支持的格式: {', '.join(self.SUPPORTED_FORMATS)}")
        
        # 保存上传文件到临时位置
        temp_file_path = await self._save_temp_file(file)
        
        try:
            # 根据文件格式解析数据
            if file_suffix == '.json':
                data = self._parse_json_file(temp_file_path)
            else:  # CSV or TSV
                data = self._parse_csv_file(temp_file_path, file_suffix)
            
            # 验证数据格式
            self._validate_data(data)
            
            return temp_file_path, data
            
        except Exception as e:
            # 清理临时文件
            Path(temp_file_path).unlink(missing_ok=True)
            raise ImportError(f"文件解析失败: {str(e)}")
    
    async def _save_temp_file(self, file: UploadFile) -> str:
        """保存上传文件到临时位置"""
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename).suffix)
        try:
            shutil.copyfileobj(file.file, temp_file)
            return temp_file.name
        finally:
            temp_file.close()
    
    def _parse_json_file(self, file_path: str) -> List[Dict[str, Any]]:
        """解析JSON文件"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            raise ImportError("JSON文件必须包含一个单词数组")
        
        return data
    
    def _parse_csv_file(self, file_path: str, file_suffix: str) -> List[Dict[str, Any]]:
        """解析CSV/TSV文件"""
        separator = '\t' if file_suffix == '.tsv' else ','
        
        try:
            df = pd.read_csv(file_path, sep=separator, encoding='utf-8')
        except UnicodeDecodeError:
            # 尝试其他编码
            try:
                df = pd.read_csv(file_path, sep=separator, encoding='gbk')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, sep=separator, encoding='latin-1')
        
        # 处理NaN值；必需字段检查放到验证阶段，避免缺列时报错
        df = df.fillna('')
        # 若存在必需列，则去除完全空白的行
        if 'lemma' in df.columns and 'meaning_zh' in df.columns:
            mask_empty = (
                df['lemma'].astype(str).str.strip().eq('') &
                df['meaning_zh'].astype(str).str.strip().eq('')
            )
            df = df[~mask_empty]
        
        return df.to_dict('records')
    
    def _validate_data(self, data: List[Dict[str, Any]]) -> None:
        """验证数据格式"""
        if not data:
            raise ImportError("文件中没有有效数据")
        
        # 检查第一行是否包含必需的列
        first_row = data[0]
        missing_columns = self.REQUIRED_COLUMNS - set(first_row.keys())
        if missing_columns:
            raise ImportError(f"缺少必需的列: {', '.join(missing_columns)}")
        
        # 验证每一行的数据
        for i, row in enumerate(data):
            if not row.get('lemma', '').strip():
                raise ImportError(f"第 {i+1} 行: lemma 字段不能为空")
            if not row.get('meaning_zh', '').strip():
                raise ImportError(f"第 {i+1} 行: meaning_zh 字段不能为空")
    
    async def import_words(self, temp_file_path: str, data: List[Dict[str, Any]], 
                          import_record: Import) -> Tuple[int, int, List[str]]:
        """导入单词数据到数据库"""
        
        succeeded = 0
        failed = 0
        error_messages = []
        
        try:
            # 获取当前激活的词库
            active_wordbook = self.db.query(Wordbook).filter(Wordbook.is_active == True).first()
            if not active_wordbook:
                raise ImportError("没有激活的词库，请先创建或激活一个词库")
            
            # 更新导入状态
            import_record.status = ImportStatus.PROCESSING
            import_record.total = len(data)
            import_record.wordbook_id = active_wordbook.id  # 关联到当前激活的词库
            self.db.commit()
            
            for i, word_data in enumerate(data):
                try:
                    # 清理和转换数据
                    cleaned_data = self._clean_word_data(word_data)
                    
                    # 检查单词是否已在当前词库中存在（根据lemma、meaning_zh和wordbook_id）
                    existing_word = self.db.query(Word).filter(
                        Word.lemma == cleaned_data['lemma'],
                        Word.meaning_zh == cleaned_data['meaning_zh'],
                        Word.wordbook_id == active_wordbook.id
                    ).first()
                    
                    if existing_word:
                        # 单词已在当前词库中存在，跳过
                        print(f"单词在词库'{active_wordbook.name}'中已存在，跳过: {cleaned_data['lemma']}")
                        continue
                    
                    # 创建新单词并分配到当前激活的词库
                    cleaned_data['wordbook_id'] = active_wordbook.id
                    word = Word(**cleaned_data)
                    self.db.add(word)
                    self.db.flush()  # 获取word.id
                    
                    # 为每个单词创建默认卡片
                    card = Card(
                        word_id=word.id,
                        template="basic",
                        tags=cleaned_data.get('tags', '')
                    )
                    self.db.add(card)
                    self.db.flush()  # 获取card.id
                    
                    # 创建SRS状态（初始状态）
                    srs_state = SRSState(
                        card_id=card.id,
                        due=datetime.now(timezone.utc),  # 新卡片立即可学习
                        interval=1.0,
                        ease=2.5,
                        reps=0,
                        lapses=0
                    )
                    self.db.add(srs_state)
                    
                    succeeded += 1
                    
                    # 定期提交以避免长事务
                    if (i + 1) % 100 == 0:
                        self.db.commit()
                        # 更新进度
                        import_record.succeeded = succeeded
                        import_record.failed = failed
                        self.db.commit()
                
                except Exception as e:
                    failed += 1
                    error_msg = f"第 {i+1} 行导入失败: {str(e)}"
                    error_messages.append(error_msg)
                    print(error_msg)
                    # 回滚当前单词的更改
                    self.db.rollback()
            
            # 最终提交
            self.db.commit()
            
            # 更新词库的总单词数
            total_words = self.db.query(Word).filter(Word.wordbook_id == active_wordbook.id).count()
            active_wordbook.total_words = total_words
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise ImportError(f"批量导入过程中出现错误: {str(e)}")
        
        finally:
            # 清理临时文件
            Path(temp_file_path).unlink(missing_ok=True)
        
        return succeeded, failed, error_messages
    
    def _clean_word_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """清理和转换单词数据"""
        cleaned = {}
        
        # 必需字段
        cleaned['lemma'] = str(raw_data['lemma']).strip()
        # 兼容：若未提供 meaning_zh 列，但提供多语言列，择优使用
        raw_meaning_zh = raw_data.get('meaning_zh', '')
        cleaned['meaning_zh'] = str(raw_meaning_zh).strip() if raw_meaning_zh is not None else ''
        
        # 收集多语言释义列：meaning_xx
        translations: Dict[str, str] = {}
        for key, value in raw_data.items():
            m = re.fullmatch(r"meaning_([a-zA-Z-]{1,10})", str(key))
            if m:
                lang = m.group(1).lower()
                val = str(value).strip()
                if val and val.lower() not in ['nan', 'null', 'none']:
                    translations[lang] = val

        # 如果没有显式 meaning_zh，但 translations 中有，选一个填充
        if not cleaned['meaning_zh'] and translations:
            # 优先 zh / zh-cn / zh-hans / en / 其他任意
            for pref in ['zh', 'zh-cn', 'zh-hans', 'en']:
                if pref in translations:
                    cleaned['meaning_zh'] = translations[pref]
                    break
            if not cleaned['meaning_zh']:
                cleaned['meaning_zh'] = next(iter(translations.values()))

        # 设置 meaning_text 用于 FTS（选择最佳可用释义）
        cleaned['meaning_text'] = cleaned['meaning_zh'] or (next(iter(translations.values())) if translations else None)

        # 可选字段
        optional_fields = ['pos', 'gender', 'ipa', 'lesson', 'cefr', 'tags']
        for field in optional_fields:
            value = raw_data.get(field, '')
            if value and str(value).strip() and str(value).strip().lower() not in ['nan', 'null', 'none']:
                cleaned[field] = str(value).strip()
            else:
                cleaned[field] = None
        
        # 特殊处理gender字段 - 确保只有单个字符
        if cleaned['gender'] and len(cleaned['gender']) > 1:
            # 取第一个字符
            cleaned['gender'] = cleaned['gender'][0].lower()
        
        # 保存 translations JSON（如存在）
        if translations:
            try:
                cleaned['translations'] = json.dumps(translations, ensure_ascii=False)
            except Exception:
                cleaned['translations'] = None
        
        return cleaned


async def create_import_record(db: Session, filename: str, total: int = 0, wordbook_id: int = None) -> Import:
    """创建导入记录"""
    # 如果没有指定wordbook_id，获取当前激活的词库
    if wordbook_id is None:
        active_wordbook = db.query(Wordbook).filter(Wordbook.is_active == True).first()
        if active_wordbook:
            wordbook_id = active_wordbook.id
    
    import_record = Import(
        filename=filename,
        total=total,
        status=ImportStatus.PENDING,
        wordbook_id=wordbook_id
    )
    db.add(import_record)
    db.commit()
    db.refresh(import_record)
    return import_record


async def update_import_record(db: Session, import_record: Import, 
                             status: ImportStatus, succeeded: int, failed: int,
                             error_messages: List[str] = None) -> Import:
    """更新导入记录"""
    import_record.status = status
    import_record.succeeded = succeeded
    import_record.failed = failed
    import_record.finished_at = datetime.now(timezone.utc)
    
    if error_messages:
        import_record.message = "; ".join(error_messages[:10])  # 只保存前10个错误信息
    
    db.commit()
    db.refresh(import_record)
    return import_record
