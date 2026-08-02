from __future__ import annotations

from dataclasses import dataclass, replace
from io import BytesIO
from pathlib import Path, PurePosixPath
import posixpath
import re
from types import SimpleNamespace
from typing import Any, Callable
from urllib.parse import unquote, urlsplit
import zipfile

import yaml


MAX_MARKDOWN_BYTES = 2 * 1024 * 1024
MAX_BUNDLE_BYTES = 50 * 1024 * 1024
MAX_BUNDLE_FILES = 100
MAX_BUNDLE_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
ALLOWED_POST_TYPES = {"blog", "note"}
MARKDOWN_IMAGE_RE = re.compile(
    r"(!\[[^\]\r\n]*\]\(\s*)(<[^>\r\n]+>|[^\s)]+)([^)\r\n]*\))"
)
ATX_HEADING_RE = re.compile(r"^[ \t]{0,3}#[ \t]+(.+?)\s*$")
FENCE_RE = re.compile(r"^[ \t]{0,3}(`{3,}|~{3,})")


@dataclass(frozen=True)
class ImportedPost:
    title: str
    content: str
    summary: str | None
    cover_image: str | None
    tags: str | None
    post_type: str
    published: bool
    slug: str | None


@dataclass(frozen=True)
class MarkdownArchive:
    post: ImportedPost
    markdown_path: str
    files: dict[str, bytes]


def _optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _limited_text(value: Any, field_name: str, max_length: int) -> str | None:
    text = _optional_text(value)
    if text is not None and len(text) > max_length:
        raise ValueError(f"{field_name} 不能超过 {max_length} 个字符")
    return text


def _parse_tags(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        tags = [str(item).strip() for item in value if str(item).strip()]
        return ",".join(tags) or None
    return _optional_text(value)


def _parse_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "on"}:
        return True
    if normalized in {"false", "0", "no", "off"}:
        return False
    raise ValueError("published 必须是布尔值")


def _first_level_heading(markdown: str) -> str | None:
    active_fence: tuple[str, int] | None = None
    for line in markdown.splitlines():
        fence = FENCE_RE.match(line)
        if fence:
            marker = fence.group(1)
            fence_key = (marker[0], len(marker))
            if active_fence is None:
                active_fence = fence_key
            elif fence_key[0] == active_fence[0] and fence_key[1] >= active_fence[1]:
                active_fence = None
            continue
        if active_fence is not None:
            continue
        heading = ATX_HEADING_RE.match(line)
        if heading:
            return re.sub(r"[ \t]+#+[ \t]*$", "", heading.group(1)).strip() or None
    return None


def _filename_title(filename: str | None) -> str | None:
    if not filename:
        return None
    normalized = filename.replace("\\", "/")
    return PurePosixPath(normalized).stem.strip() or None


def parse_markdown_post(raw: bytes, filename: str | None = None) -> ImportedPost:
    if len(raw) > MAX_MARKDOWN_BYTES:
        raise ValueError("Markdown 文件不能超过 2 MB")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Markdown 文件必须使用 UTF-8 编码") from exc

    metadata: dict[str, Any] = {}
    content = text
    if text.startswith("---"):
        lines = text.splitlines(keepends=True)
        closing_index = next(
            (index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---"),
            None,
        )
        if closing_index is None:
            raise ValueError("YAML front matter 缺少结束分隔符 ---")
        try:
            parsed_metadata = yaml.safe_load("".join(lines[1:closing_index])) or {}
        except yaml.YAMLError as exc:
            raise ValueError("YAML front matter 格式错误") from exc
        if not isinstance(parsed_metadata, dict):
            raise ValueError("YAML front matter 必须是键值对象")
        metadata = parsed_metadata
        content = "".join(lines[closing_index + 1 :]).lstrip("\r\n")

    if not content.strip():
        raise ValueError("文章正文不能为空")

    title = _limited_text(
        _optional_text(metadata.get("title")) or _first_level_heading(content) or _filename_title(filename),
        "title",
        200,
    )
    if not title:
        raise ValueError("无法确定文章标题；请添加 title、第一个一级标题，或使用有意义的文件名")

    post_type = (_optional_text(metadata.get("post_type")) or "blog").lower()
    if post_type not in ALLOWED_POST_TYPES:
        raise ValueError("post_type 只能是 blog 或 note")

    return ImportedPost(
        title=title,
        content=content.rstrip() + "\n",
        summary=_limited_text(metadata.get("summary"), "summary", 500),
        cover_image=_limited_text(metadata.get("cover_image"), "cover_image", 500),
        tags=_limited_text(_parse_tags(metadata.get("tags")), "tags", 500),
        post_type=post_type,
        published=_parse_bool(metadata.get("published")),
        slug=_limited_text(metadata.get("slug"), "slug", 200),
    )


def rewrite_markdown_image_urls(markdown: str, rewriter: Callable[[str], str]) -> str:
    def replace_url(match: re.Match[str]) -> str:
        raw_url = match.group(2)
        url = raw_url[1:-1] if raw_url.startswith("<") and raw_url.endswith(">") else raw_url
        rewritten = rewriter(url)
        return f"{match.group(1)}{rewritten}{match.group(3)}"

    return MARKDOWN_IMAGE_RE.sub(replace_url, markdown)


def markdown_image_urls(markdown: str) -> list[str]:
    urls: list[str] = []
    rewrite_markdown_image_urls(markdown, lambda url: urls.append(url) or url)
    return urls


def is_local_asset_url(url: str | None) -> bool:
    if not url:
        return False
    normalized = url.strip()
    if not normalized or normalized.startswith(("/", "#", "//")):
        return False
    if re.match(r"^[A-Za-z]:[\\/]", normalized):
        return True
    return not bool(urlsplit(normalized).scheme)


def local_markdown_assets(post: ImportedPost) -> list[str]:
    assets = [url for url in markdown_image_urls(post.content) if is_local_asset_url(url)]
    if is_local_asset_url(post.cover_image):
        assets.append(post.cover_image or "")
    return assets


def _safe_archive_name(name: str) -> str:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    if not normalized or normalized.startswith("/") or ".." in path.parts or path.is_absolute():
        raise ValueError("压缩包包含不安全的文件路径")
    return str(path)


def read_markdown_archive(raw: bytes) -> MarkdownArchive:
    if len(raw) > MAX_BUNDLE_BYTES:
        raise ValueError("Markdown 资源包不能超过 50 MB")
    try:
        archive = zipfile.ZipFile(BytesIO(raw))
    except zipfile.BadZipFile as exc:
        raise ValueError("ZIP 文件已损坏或格式不正确") from exc

    with archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if len(infos) > MAX_BUNDLE_FILES:
            raise ValueError("ZIP 文件数量不能超过 100 个")
        if any(info.flag_bits & 0x1 for info in infos):
            raise ValueError("不支持加密 ZIP 文件")
        if sum(info.file_size for info in infos) > MAX_BUNDLE_UNCOMPRESSED_BYTES:
            raise ValueError("ZIP 解压后的总大小不能超过 50 MB")

        files: dict[str, bytes] = {}
        for info in infos:
            safe_name = _safe_archive_name(info.filename)
            if safe_name in files:
                raise ValueError("ZIP 中存在重复文件路径")
            files[safe_name] = archive.read(info)

    markdown_files = [name for name in files if name.lower().endswith((".md", ".markdown"))]
    if len(markdown_files) != 1:
        raise ValueError("ZIP 中必须且只能包含一个 Markdown 文件")
    markdown_path = markdown_files[0]
    return MarkdownArchive(
        post=parse_markdown_post(files[markdown_path], markdown_path),
        markdown_path=markdown_path,
        files=files,
    )


def materialize_archive_images(
    archive: MarkdownArchive,
    image_saver: Callable[[str, bytes], str],
) -> ImportedPost:
    markdown_dir = posixpath.dirname(archive.markdown_path)
    saved: dict[str, str] = {}

    def materialize(url: str) -> str:
        if not is_local_asset_url(url):
            return url
        path = unquote(urlsplit(url).path).replace("\\", "/")
        archive_path = posixpath.normpath(posixpath.join(markdown_dir, path))
        archive_path = _safe_archive_name(archive_path)
        if archive_path not in archive.files:
            raise ValueError(f"ZIP 中找不到图片：{url}")
        if archive_path not in saved:
            saved[archive_path] = image_saver(PurePosixPath(archive_path).name, archive.files[archive_path])
        return saved[archive_path]

    return replace(
        archive.post,
        content=rewrite_markdown_image_urls(archive.post.content, materialize),
        cover_image=materialize(archive.post.cover_image) if archive.post.cover_image else None,
    )


def export_markdown_post(post: Any) -> str:
    metadata: dict[str, Any] = {
        "title": post.title,
        "summary": post.summary,
        "tags": [tag.strip() for tag in (post.tags or "").split(",") if tag.strip()],
        "cover_image": post.cover_image,
        "post_type": post.post_type or "blog",
        "published": bool(post.published),
        "slug": post.slug,
    }
    metadata = {key: value for key, value in metadata.items() if value not in (None, "", [])}
    front_matter = yaml.safe_dump(
        metadata,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
    ).strip()
    return f"---\n{front_matter}\n---\n\n{post.content.rstrip()}\n"


def export_markdown_bundle(post: Any, upload_dir: str) -> bytes:
    assets: dict[str, bytes] = {}

    def bundle_upload(url: str) -> str:
        path = urlsplit(url).path
        if not path.startswith("/uploads/"):
            return url
        filename = PurePosixPath(path).name
        source = Path(upload_dir, filename)
        if not filename or not source.is_file():
            return url
        archive_path = f"assets/{filename}"
        assets.setdefault(archive_path, source.read_bytes())
        return archive_path

    bundled_post = SimpleNamespace(
        title=post.title,
        summary=post.summary,
        tags=post.tags,
        cover_image=bundle_upload(post.cover_image) if post.cover_image else None,
        post_type=post.post_type,
        published=post.published,
        slug=post.slug,
        content=rewrite_markdown_image_urls(post.content, bundle_upload),
    )
    output = BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("article.md", export_markdown_post(bundled_post).encode("utf-8"))
        for archive_path, contents in assets.items():
            archive.writestr(archive_path, contents)
    return output.getvalue()
