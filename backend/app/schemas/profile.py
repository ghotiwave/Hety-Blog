from pydantic import BaseModel, Field, field_validator


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=20_000)
    avatar_url: str | None = Field(default=None, max_length=500)
    interests: str | None = Field(default=None, max_length=20_000)
    experience: str | None = Field(default=None, max_length=50_000)
    github_url: str | None = Field(default=None, max_length=500)
    twitter_url: str | None = Field(default=None, max_length=500)
    qq: str | None = Field(default=None, max_length=50)
    douyin: str | None = Field(default=None, max_length=500)
    about_page: str | None = Field(default=None, max_length=2_000_000)
    email_public: str | None = Field(default=None, max_length=200)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("姓名不能为空")
        return value


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
    about_page: str | None = None
    email_public: str | None = None
    updated_at: str

    model_config = {"from_attributes": True}
