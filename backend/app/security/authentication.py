import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from passlib.context import CryptContext

from ..config import settings

logger = logging.getLogger(__name__)

# Security configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a hash for a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=30)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify JWT token and return decoded data"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# In a real implementation, you would have user management functions here
# For now, this is a basic placeholder for authentication
class AuthService:
    @staticmethod
    async def authenticate_user(username: str, password: str) -> Optional[dict]:
        """Authenticate a user (placeholder implementation)"""
        # In a real system, this would check against a database
        # This is just a demonstration - you'd need proper user storage

        if username == "admin" and password == "password":  # For demo purposes only
            return {
                "username": username,
                "role": "administrator"
            }

        return None

    @staticmethod
    async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        """Get current authenticated user"""
        token_data = verify_token(credentials.credentials)
        return token_data