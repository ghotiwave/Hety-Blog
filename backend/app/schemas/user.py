from pydantic import BaseModel, Field


class SendCodeRequest(BaseModel):
    email: str = Field(min_length=3, max_length=100)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1, max_length=20)
    email: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    code: str = Field(default="", max_length=6)
    turnstile_token: str = Field(default="", max_length=2048)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None = None
    avatar_url: str | None = None
    signature: str | None = None
    role: str
    created_at: str

    model_config = {"from_attributes": True}
