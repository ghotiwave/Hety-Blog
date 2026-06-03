from pydantic import BaseModel


class PostCreate(BaseModel):
    title: str
    content: str
    summary: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    published: bool = False


class PostUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    summary: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    published: bool | None = None


class PostResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    published: bool
    created_at: str
    updated_at: str
    like_count: int = 0
    view_count: int = 0
    comment_count: int = 0

    model_config = {"from_attributes": True}


class PostListItem(BaseModel):
    id: int
    title: str
    summary: str | None = None
    cover_image: str | None = None
    tags: str | None = None
    published: bool
    created_at: str
    like_count: int = 0
    view_count: int = 0
    comment_count: int = 0

    model_config = {"from_attributes": True}


class PaginatedPosts(BaseModel):
    items: list[PostListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
