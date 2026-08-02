from pydantic import BaseModel, Field, field_validator


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_id: int | None = None
    reply_to_user_id: int | None = None

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评论内容不能为空")
        return value


class CommentResponse(BaseModel):
    id: int
    post_id: int
    author_name: str
    avatar_url: str | None = None
    content: str
    created_at: str

    model_config = {"from_attributes": True}
