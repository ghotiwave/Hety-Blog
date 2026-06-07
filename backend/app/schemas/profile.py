from pydantic import BaseModel


class ProfileUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    interests: str | None = None
    experience: str | None = None
    github_url: str | None = None
    twitter_url: str | None = None
    qq: str | None = None
    douyin: str | None = None


class ProfileResponse(BaseModel):
    id: int
    name: str
    bio: str | None = None
    avatar_url: str | None = None
    interests: str | None = None
    experience: str | None = None
    github_url: str | None = None
    twitter_url: str | None = None
    qq: str | None = None
    douyin: str | None = None
    updated_at: str

    model_config = {"from_attributes": True}
