from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Watchlist Schemas ---
class WatchlistBase(BaseModel):
    symbol: str

class WatchlistCreate(WatchlistBase):
    pass

class WatchlistResponse(WatchlistBase):
    id: int
    user_id: int
    added_at: datetime

    model_config = {
        "from_attributes": True
    }

# --- Order Schemas ---
class OrderBase(BaseModel):
    symbol: str
    order_type: str  # MARKET, LIMIT, SL
    transaction_type: str  # BUY, SELL
    product_type: str  # CNC, MIS
    quantity: int
    price: float
    trigger_price: Optional[float] = None

class OrderCreate(OrderBase):
    pass

class OrderResponse(OrderBase):
    id: int
    user_id: int
    status: str
    timestamp: datetime

    model_config = {
        "from_attributes": True
    }

# --- Holding Schemas ---
class HoldingResponse(BaseModel):
    id: int
    symbol: str
    quantity: int
    average_price: float
    last_updated: datetime

    model_config = {
        "from_attributes": True
    }

# --- Position Schemas ---
class PositionResponse(BaseModel):
    id: int
    symbol: str
    quantity: int
    average_price: float
    realized_pnl: float
    is_closed: bool
    last_updated: datetime

    model_config = {
        "from_attributes": True
    }

# --- User Profile Schemas ---
class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    cash_balance: float
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class AddFundsRequest(BaseModel):
    amount: float

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    status: str
    message: str
    user_id: int
    username: str
    email: str
    cash_balance: float

