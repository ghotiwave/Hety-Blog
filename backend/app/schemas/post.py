from typing import Literal

from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=2_000_000)
    summary: str | None = Field(default=None, max_length=500)
    cover_image: str | None = Field(default=None, max_length=500)
    tags: str | None = Field(default=None, max_length=500)
    post_type: Literal["blog", "note"] = "blog"
    published: bool = False


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=2_000_000)
    summary: str | None = Field(default=None, max_length=500)
    cover_image: str | None = Field(default=None, max_length=500)
    tags: str | None = Field(default=None, max_length=500)
    post_type: Literal["blog", "note"] | None = None
    published: bool | None = None


class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    post_type: str = "blog"
    slug: str | None = None
    published: bool
    created_at: str
    updated_at: str
    like_count: int = 0
    view_count: int = 0
    comment_count: int = 0
    user_liked: bool = False

    model_config = {"from_attributes": True}


class PostListItem(BaseModel):
    id: int
    title: str
    summary: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    post_type: str = "blog"
    slug: str | None = None
    published: bool
    created_at: str
    like_count: int = 0
    view_count: int = 0
    comment_count: int = 0
    user_liked: bool = False
    word_count: int = 0
    reading_minutes: int = 1

    model_config = {"from_attributes": True}


class PaginatedPosts(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
