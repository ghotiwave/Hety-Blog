from pydantic import BaseModel, EmailStr


class SendCodeRequest(BaseModel):
    email: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    code: str = ""
    turnstile_token: str = ""


class LoginRequest(BaseModel):
    username: str
    password: str


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
