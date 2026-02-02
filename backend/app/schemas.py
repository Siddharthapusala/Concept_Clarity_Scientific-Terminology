from pydantic import BaseModel, EmailStr, validator
from typing import Optional
import re
class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    role: str
    language: Optional[str] = "en"
    password: str
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if len(v) > 128:
            raise ValueError('Password must not exceed 128 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    @validator('username', always=True)
    def validate_identifier(cls, v, values):
        email = values.get('email')
        if not v and not email:
            raise ValueError('Either username or email must be provided')
        if v and not re.match(r'^[a-zA-Z0-9_]{3,20}$', v):
            raise ValueError('Username must be 3-20 chars, alphanumeric/underscore')
        return v
    @validator('role')
    def validate_role(cls, v):
        allowed = {
            'student',
            'teacher',
            'scientist',
            'journalist',
            'engineer',
            'healthcare_professional',
            'general_user'
        }
        if v not in allowed:
            raise ValueError(f'Role must be one of {allowed}')
        return v
class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: str
    @validator('username', always=True)
    def validate_login_identifier(cls, v, values):
        email = values.get('email')
        if not v and not email:
            raise ValueError('Either username or email must be provided')
        if v and not re.match(r'^[a-zA-Z0-9_]{3,20}$', v):
            raise ValueError('Username must be 3-20 chars, alphanumeric/underscore')
        return v
class TermResponse(BaseModel):
    term: str
    definition: str
from datetime import datetime
class SearchHistoryBase(BaseModel):
    query: str
    result: str
class SearchHistoryOut(SearchHistoryBase):
    id: int
    feedback: Optional[int] = None
    created_at: datetime
    class Config:
        orm_mode = True

class FeedbackUpdate(BaseModel):
    feedback: int

class AppReviewCreate(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = None
    @validator('rating')
    def validate_rating(cls, v):
        if not (1 <= v <= 5):
            raise ValueError('Rating must be between 1 and 5')
        return v

class AppReviewOut(BaseModel):
    id: int
    rating: int
    comment: Optional[str]
    created_at: datetime
    class Config:
        orm_mode = True
