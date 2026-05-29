from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, default="trader_demo")
    email = Column(String, unique=True, index=True, default="trader@zerodha.demo")
    password = Column(String, default="demo123")
    cash_balance = Column(Float, default=1000000.0) # 10 Lakhs Virtual Money
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    holdings = relationship("Holding", back_populates="user", cascade="all, delete-orphan")
    positions = relationship("Position", back_populates="user", cascade="all, delete-orphan")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="watchlist")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    order_type = Column(String)  # MARKET, LIMIT, SL (Stop Loss)
    transaction_type = Column(String)  # BUY, SELL
    product_type = Column(String)  # CNC (Delivery), MIS (Intraday)
    quantity = Column(Integer)
    price = Column(Float)
    trigger_price = Column(Float, nullable=True)  # For Stop Loss
    status = Column(String, default="PENDING")  # PENDING, EXECUTED, CANCELLED, REJECTED
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="orders")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    quantity = Column(Integer)
    average_price = Column(Float)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="holdings")


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    quantity = Column(Integer)  # Positive for Buy (Long), Negative for Short
    average_price = Column(Float)
    realized_pnl = Column(Float, default=0.0)
    is_closed = Column(Boolean, default=False)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="positions")
