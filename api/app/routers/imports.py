from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models import Import, ImportStatus
from app.schemas import ImportResponse, ImportProgress, BulkImportResponse
from app.services.importer import FileImporter, ImportError, create_import_record, update_import_record

router = APIRouter(prefix="/api/v1", tags=["imports"])


async def background_import_task(
    temp_file_path: str,
    data: List[dict], 
    import_id: int,
    db_session: Session = None
):
    """后台导入任务"""
    if db_session is None:
        # 创建新的数据库会话用于后台任务
        from app.core.database import SessionLocal
        db_session = SessionLocal()
    
    try:
        # 获取导入记录
        import_record = db_session.query(Import).filter(Import.id == import_id).first()
        if not import_record:
            return
        
        # 执行导入
        importer = FileImporter(db_session)
        succeeded, failed, error_messages = await importer.import_words(
            temp_file_path, data, import_record
        )
        
        # 更新导入状态
        final_status = ImportStatus.COMPLETED if failed == 0 else ImportStatus.COMPLETED
        await update_import_record(
            db_session, import_record, final_status, 
            succeeded, failed, error_messages
        )
        
        print(f"导入完成: 成功 {succeeded}, 失败 {failed}")
        
    except Exception as e:
        print(f"后台导入任务失败: {e}")
        # 更新为失败状态
        if 'import_record' in locals():
            import_record.status = ImportStatus.FAILED
            import_record.message = str(e)
            db_session.commit()
    
    finally:
        db_session.close()


@router.post("/words/bulk", response_model=BulkImportResponse)
async def upload_words_bulk(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    批量导入单词文件 (CSV/TSV/JSON)
    
    支持格式:
    - CSV: 逗号分隔
    - TSV: Tab分隔 
    - JSON: 单词数组
    
    必需字段: lemma, meaning_zh
    可选字段: pos, gender, ipa, lesson, cefr, tags
    """
    try:
        # 创建导入记录
        import_record = await create_import_record(db, file.filename)
        
        # 处理上传文件
        importer = FileImporter(db)
        temp_file_path, data = await importer.process_upload_file(file)
        
        # 更新总数
        import_record.total = len(data)
        db.commit()
        
        # 启动后台导入任务
        background_tasks.add_task(
            background_import_task,
            temp_file_path=temp_file_path,
            data=data,
            import_id=import_record.id
        )
        
        return BulkImportResponse(
            import_id=import_record.id,
            status="processing",
            message=f"文件上传成功，开始导入 {len(data)} 个单词"
        )
        
    except ImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


@router.get("/imports/{import_id}", response_model=ImportProgress)
async def get_import_progress(import_id: int, db: Session = Depends(get_db)):
    """获取导入进度"""
    import_record = db.query(Import).filter(Import.id == import_id).first()
    
    if not import_record:
        raise HTTPException(status_code=404, detail="导入记录不存在")
    
    # 计算进度百分比
    if import_record.total > 0:
        progress_percent = ((import_record.succeeded + import_record.failed) / import_record.total) * 100
    else:
        progress_percent = 0
    
    return ImportProgress(
        import_id=import_record.id,
        status=import_record.status,
        total=import_record.total,
        succeeded=import_record.succeeded,
        failed=import_record.failed,
        progress_percent=round(progress_percent, 2),
        message=import_record.message
    )


@router.get("/imports", response_model=List[ImportResponse])
async def list_imports(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """获取导入历史记录"""
    imports = (
        db.query(Import)
        .order_by(Import.started_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return [ImportResponse.model_validate(imp) for imp in imports]


@router.delete("/imports/{import_id}")
async def delete_import_record(import_id: int, db: Session = Depends(get_db)):
    """删除导入记录"""
    import_record = db.query(Import).filter(Import.id == import_id).first()
    
    if not import_record:
        raise HTTPException(status_code=404, detail="导入记录不存在")
    
    db.delete(import_record)
    db.commit()
    
    return {"message": f"导入记录 {import_id} 已删除"}