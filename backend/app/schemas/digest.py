from pydantic import BaseModel


class DigestResponse(BaseModel):
    id: int
    title: str
    topic: str
    content: str
    source_urls: str | None = None
    slug: str | None = None
    created_at: str
    word_count: int = 0
    reading_minutes: int = 1

    model_config = {"from_attributes": True}


class PaginatedDigests(BaseModel):
    items: list[DigestResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
