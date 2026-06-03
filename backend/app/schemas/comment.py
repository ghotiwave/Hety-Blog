from pydantic import BaseModel


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    post_id: int
    author_name: str
    content: str
    created_at: str

    model_config = {"from_attributes": True}
