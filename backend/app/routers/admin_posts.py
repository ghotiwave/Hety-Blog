import math
import os
import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.post import Post
from app.models.comment import Comment
from app.models.like import Like
from app.models.user import User
from app.schemas.post import PostCreate, PostUpdate, PostResponse, PostListItem, PaginatedPosts
from app.dependencies import get_current_admin
from app.config import settings
from app.routers.upload import store_image_bytes
from app.utils.timestamps import beijing_isoformat
from app.utils.markdown_posts import (
    MAX_BUNDLE_BYTES,
    MAX_MARKDOWN_BYTES,
    export_markdown_bundle,
    local_markdown_assets,
    materialize_archive_images,
    parse_markdown_post,
    read_markdown_archive,
)

router = APIRouter(prefix="/api/admin/posts", tags=["admin-posts"])


def _remove_uploaded_urls(urls: list[str]) -> None:
    for url in urls:
        filename = url.rsplit("/", 1)[-1]
        if not filename:
            continue
        path = os.path.join(settings.UPLOAD_DIR, filename)
        try:
            os.remove(path)
        except FileNotFoundError:
            pass


def _post_response(post: Post, db: Session) -> PostResponse:
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar()
    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar()
    return PostResponse(
        id=post.id,
        title=post.title,
        content=post.content,
        summary=post.summary,
        cover_image=post.cover_image,
        tags=post.tags,
        post_type=post.post_type or "blog",
        slug=post.slug,
        published=post.published,
        created_at=beijing_isoformat(post.created_at),
        updated_at=beijing_isoformat(post.updated_at),
        like_count=like_count or 0,
        view_count=post.view_count or 0,
        comment_count=comment_count or 0,
    )


@router.get("", response_model=PaginatedPosts)
def list_all_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    total = db.query(Post).count()
    total_pages = max(1, math.ceil(total / page_size))
    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for p in posts:
        comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == p.id).scalar()
        like_count = db.query(func.count(Like.id)).filter(Like.post_id == p.id).scalar()
        items.append(
            PostListItem(
                id=p.id,
                title=p.title,
                summary=p.summary,
                cover_image=p.cover_image,
                tags=p.tags,
                published=p.published,
                created_at=beijing_isoformat(p.created_at),
                like_count=like_count or 0,
                view_count=p.view_count or 0,
                comment_count=comment_count or 0,
            )
        )
    return PaginatedPosts(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _post_response(post, db)


@router.post("/import", response_model=PostResponse, status_code=201)
async def import_post(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    filename = (file.filename or "").lower()
    is_archive = filename.endswith(".zip")
    if not is_archive and not filename.endswith((".md", ".markdown")):
        raise HTTPException(status_code=400, detail="请选择 .md、.markdown 或 .zip 文件")
    max_bytes = MAX_BUNDLE_BYTES if is_archive else MAX_MARKDOWN_BYTES
    raw = await file.read(max_bytes + 1)
    if len(raw) > max_bytes:
        limit = "50 MB" if is_archive else "2 MB"
        raise HTTPException(status_code=413, detail=f"文件不能超过 {limit}")

    saved_urls: list[str] = []
    try:
        if is_archive:
            markdown_archive = read_markdown_archive(raw)
            imported = markdown_archive.post
        else:
            imported = parse_markdown_post(raw, file.filename)
            local_assets = local_markdown_assets(imported)
            if local_assets:
                raise ValueError(
                    "Markdown 引用了本地图片；请将 Markdown 与图片按原相对路径一起压缩为 ZIP 后导入"
                )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if imported.slug and db.query(Post).filter(Post.slug == imported.slug).first():
        raise HTTPException(status_code=409, detail=f"slug 已存在：{imported.slug}")

    if is_archive:
        def save_archive_image(image_name: str, contents: bytes) -> str:
            url = store_image_bytes(image_name, contents)
            saved_urls.append(url)
            return url

        try:
            imported = materialize_archive_images(markdown_archive, save_archive_image)
        except ValueError as exc:
            _remove_uploaded_urls(saved_urls)
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except HTTPException:
            _remove_uploaded_urls(saved_urls)
            raise

    post = Post(
        title=imported.title,
        content=imported.content,
        summary=imported.summary,
        cover_image=imported.cover_image,
        tags=imported.tags,
        post_type=imported.post_type,
        published=imported.published,
        slug=imported.slug,
    )
    try:
        db.add(post)
        db.commit()
        db.refresh(post)
    except Exception:
        db.rollback()
        _remove_uploaded_urls(saved_urls)
        raise
    return _post_response(post, db)


@router.get("/{post_id}/export")
def export_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    safe_name = re.sub(r"[^\w\-\u4e00-\u9fff]+", "-", post.title).strip("-") or f"post-{post.id}"
    filename = f"{safe_name}.md"
    bundle_name = filename.rsplit(".", 1)[0] + ".zip"
    return Response(
        content=export_markdown_bundle(post, settings.UPLOAD_DIR),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(bundle_name)}"},
    )


@router.post("", response_model=PostResponse, status_code=201)
def create_post(req: PostCreate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = Post(**req.model_dump())
    if req.post_type:
        post.post_type = req.post_type
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_response(post, db)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(post_id: int, req: PostUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(post, k, v)
    db.commit()
    db.refresh(post)
    return _post_response(post, db)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
