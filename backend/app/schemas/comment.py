import re

from pydantic import BaseModel, Field, field_validator


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    parent_id: int | None = None
    reply_to_user_id: int | None = None
    guest_name: str | None = Field(default=None, max_length=20)
    guest_email: str | None = Field(default=None, max_length=100)
    turnstile_token: str | None = Field(default=None, max_length=2048)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("评论内容不能为空")
        return value

    @field_validator("guest_name")
    @classmethod
    def normalize_guest_name(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip()
        if any(ord(character) < 32 for character in normalized):
            raise ValueError("游客昵称不能包含控制字符")
        return normalized

    @field_validator("guest_email")
    @classmethod
    def normalize_guest_email(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("请提供有效的邮箱地址")
        return normalized


class CommentResponse(BaseModel):
    id: int
    post_id: int
    author_name: str
    avatar_url: str | None = None
    content: str
    created_at: str

    model_config = {"from_attributes": True}
