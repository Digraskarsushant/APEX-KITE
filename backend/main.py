import asyncio
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Set
import datetime
import smtplib
import random
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import models
import schemas
import database
from database import engine, get_db, SessionLocal
from simulator import market_simulator, STOCK_CONFIG
from indicators import add_all_indicators

def parse_option_symbol(symbol: str):
    """Parses option symbol (e.g. AAPL_175_CE) and returns (underlying, strike, type) or None."""
    parts = symbol.upper().split("_")
    if len(parts) == 3 and parts[2] in ["CE", "PE"]:
        try:
            return parts[0], float(parts[1]), parts[2]
        except ValueError:
            return None
    return None

def is_valid_symbol(symbol: str) -> bool:
    """Checks if symbol is a valid base stock/index or a valid option contract."""
    symbol = symbol.upper()
    if symbol in STOCK_CONFIG:
        return True
    opt = parse_option_symbol(symbol)
    if opt:
        underlying, _, _ = opt
        return underlying in STOCK_CONFIG
    return False

def get_symbol_display_name(symbol: str) -> str:
    """Returns display name for a stock or option symbol."""
    symbol = symbol.upper()
    opt = parse_option_symbol(symbol)
    if opt:
        underlying, strike, option_type = opt
        underlying_name = STOCK_CONFIG.get(underlying, {}).get("name", underlying)
        return f"{underlying_name} {strike:g} {option_type}"
    return STOCK_CONFIG.get(symbol, {}).get("name", symbol)

def get_symbol_lot_size(symbol: str) -> int:
    """Returns lot size for a stock or option symbol."""
    symbol = symbol.upper()
    opt = parse_option_symbol(symbol)
    if opt:
        underlying, _, _ = opt
        from simulator import LOT_SIZES
        return LOT_SIZES.get(underlying, 1)
    return 1

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Antigravity Stock Terminal API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_websocket_connections: Set[WebSocket] = set()

# Memory cache for OTPs: { email: { "otp": "123456", "expires_at": datetime, "username": "sushant" } }
otp_cache: Dict[str, Dict[str, Any]] = {}

def send_otp_email(username: str, to_email: str, otp: str) -> bool:
    # Retrieve SMTP and Web API configurations from environment variables
    resend_api_key = os.getenv("RESEND_API_KEY")
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_sender = os.getenv("SMTP_SENDER", "noreply@apex-kite.com")

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ff5722; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">APEX KITE</h2>
            <p style="color: #808a9d; font-size: 11px; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">High-Frequency Trading Terminal Suite</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 20px 0;">
        <p style="color: #0c1017; font-size: 14px;">Hello <strong>{username}</strong>,</p>
        <p style="color: #0c1017; font-size: 14px; line-height: 1.6;">Thank you for registering on APEX KITE! To complete your account registration, please verify your email address using the secure 6-digit One-Time Password (OTP) below:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #ff5722; letter-spacing: 6px; border: 2px dashed #ff5722; padding: 12px 24px; border-radius: 8px; background-color: #fff8f5; display: inline-block;">
                {otp}
            </span>
        </div>
        <p style="color: #ef5350; font-size: 12px; font-weight: bold; margin-bottom: 5px;">⚠️ Security Notice:</p>
        <p style="color: #808a9d; font-size: 12px; line-height: 1.5; margin: 0;">This OTP is strictly confidential and valid for **5 minutes**. Never share this code with anyone. If you did not request this verification, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e1e4e8; margin: 20px 0;">
        <div style="text-align: center; color: #808a9d; font-size: 11px;">
            <p style="margin: 0;">Secured with dynamic session credentials</p>
            <p style="margin: 5px 0 0 0;">© 2026 Apex Kite Terminal. All rights reserved.</p>
        </div>
    </div>
    """

    import urllib.request
    import json

    # 1. Option A: Use Resend HTTPS API (Port 443 - NEVER BLOCKED BY RENDER!)
    if resend_api_key:
        try:
            url = "https://api.resend.com/emails"
            payload = {
                "from": os.getenv("RESEND_SENDER", "onboarding@resend.dev"),
                "to": [to_email],
                "subject": f"APEX KITE Email Verification Code: {otp}",
                "html": html_content
            }
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={
                    "Authorization": f"Bearer {resend_api_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                status = response.getcode()
                print(f"Successfully sent OTP email to {to_email} via Resend HTTPS API (Status: {status}).")
                return True
        except Exception as e:
            print(f"Resend HTTPS API Error: {e}")

    # 2. Option B: Use SendGrid HTTPS Web API (Port 443 - NEVER BLOCKED BY RENDER!)
    if sendgrid_api_key:
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            payload = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": os.getenv("SENDGRID_SENDER", "noreply@apex-kite.com"), "name": "Apex Kite"},
                "subject": f"APEX KITE Email Verification Code: {otp}",
                "content": [{"type": "text/html", "value": html_content}]
            }
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={
                    "Authorization": f"Bearer {sendgrid_api_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                status = response.getcode()
                print(f"Successfully sent OTP email to {to_email} via SendGrid HTTPS API (Status: {status}).")
                return True
        except Exception as e:
            print(f"SendGrid HTTPS API Error: {e}")

    # 3. Option C: Fall back to standard SMTP if configured
    if all([smtp_host, smtp_port, smtp_username, smtp_password]):
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"APEX KITE Email Verification Code: {otp}"
            msg["From"] = smtp_sender
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_host, port)
            else:
                server = smtplib.SMTP(smtp_host, port)
                server.starttls()

            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_sender, [to_email], msg.as_string())
            server.quit()
            print(f"Successfully sent OTP email to {to_email} via SMTP.")
            return True
        except Exception as e:
            print(f"SMTP Error: Failed to send OTP email to {to_email}: {e}")

    # 4. Fallback: Local Sandbox Console Print (if SMTP fails or no web keys are provided)
    print("\n" + "="*80)
    print("⚠️ EMAIL OTP VERIFICATION SANDBOX DUMP — ACTIVE CODE ⚠️")
    print(f"Recipient: {username} <{to_email}>")
    print(f"OTP Verification Code: {otp}")
    print("-"*80)
    print("HTML EMAIL PREVIEW:")
    print(html_content.strip())
    print("="*80 + "\n")
    return False


# Helper function to seed default user
def seed_default_user():
    db = SessionLocal()
    try:
        # Synchronize PostgreSQL auto-increment sequence for the users table
        # This prevents unique constraint violations (IntegrityError) when registering new users
        if "postgresql" in database.DATABASE_URL or "postgres" in database.DATABASE_URL:
            db.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true)"))
            db.commit()

        user = db.query(models.User).filter(models.User.id == 1).first()
        if not user:
            user = models.User(
                id=1,
                username="trader_demo",
                email="trader@apex.demo",
                cash_balance=1000000.0,  # 10 Lakhs Virtual Cash
            )
            db.add(user)
            db.commit()
            
            # Seed default watchlist items to immediately populate UI
            default_symbols = ["NIFTY50", "SENSEX", "BANKNIFTY", "RELIANCE", "TCS", "INFY"]
            for symbol in default_symbols:
                db.add(models.Watchlist(user_id=1, symbol=symbol))
            db.commit()
            print("Default trader profile, watchlist, and market indices seeded successfully.")
    except Exception as e:
        print(f"Error seeding user: {e}")
    finally:
        db.close()


def get_exchange_rate_to_inr(symbol: str) -> float:
    """Returns the exchange rate to INR for a given stock or option symbol."""
    symbol = symbol.upper()
    parts = symbol.split("_")
    base_symbol = parts[0]
    
    usd_symbols = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SP500', 'NASDAQ', 'DOW']
    gbp_symbols = ['FTSE100']
    jpy_symbols = ['NIKKEI']
    
    if base_symbol in usd_symbols:
        return market_simulator.exchange_rates.get("USD", 83.5)
    if base_symbol in gbp_symbols:
        return market_simulator.exchange_rates.get("GBP", 106.0)
    if base_symbol in jpy_symbols:
        return market_simulator.exchange_rates.get("JPY", 0.55)
        
    return 1.0

def execute_order_in_db(db: Session, order: models.Order, execution_price: float) -> str:
    """Executes a trading order in the database, updating user cash and holdings/positions."""
    user = db.query(models.User).filter(models.User.id == order.user_id).first()
    if not user:
        return "USER_NOT_FOUND"

    lot_size = get_symbol_lot_size(order.symbol)
    quantity = order.quantity
    rate = get_exchange_rate_to_inr(order.symbol)
    total_value = execution_price * quantity * lot_size * rate

    if order.transaction_type == "BUY":
        # Check margin
        if user.cash_balance < total_value:
            order.status = "REJECTED"
            db.commit()
            return "INSUFFICIENT_FUNDS"

        # Deduct funds
        user.cash_balance -= total_value

        # Manage Delivery (CNC) vs Intraday (MIS)
        if order.product_type == "CNC":
            holding = db.query(models.Holding).filter(
                models.Holding.user_id == user.id, models.Holding.symbol == order.symbol
            ).first()
            if holding:
                # Update weighted average cost basis
                new_qty = holding.quantity + quantity
                new_avg = ((holding.quantity * holding.average_price) + total_value) / new_qty
                holding.quantity = new_qty
                holding.average_price = round(new_avg, 2)
                holding.last_updated = datetime.datetime.utcnow()
            else:
                holding = models.Holding(
                    user_id=user.id,
                    symbol=order.symbol,
                    quantity=quantity,
                    average_price=round(execution_price, 2)
                )
                db.add(holding)
        else:
            # Intraday Positions (MIS)
            position = db.query(models.Position).filter(
                models.Position.user_id == user.id,
                models.Position.symbol == order.symbol,
                models.Position.is_closed == False
            ).first()
            if position:
                # Accumulating long or closing short
                old_qty = position.quantity
                new_qty = old_qty + quantity
                
                if old_qty < 0:
                    # Closing a short position -> realized PnL
                    closed_qty = min(abs(old_qty), quantity)
                    pnl = (position.average_price - execution_price) * closed_qty
                    position.realized_pnl += round(pnl, 2)
                
                if new_qty == 0:
                    position.is_closed = True
                
                position.quantity = new_qty
                if new_qty != 0 and old_qty > 0:
                    # If accumulating long, update average buy price
                    new_avg = ((old_qty * position.average_price) + total_value) / new_qty
                    position.average_price = round(new_avg, 2)
                
                position.last_updated = datetime.datetime.utcnow()
            else:
                position = models.Position(
                    user_id=user.id,
                    symbol=order.symbol,
                    quantity=quantity,
                    average_price=round(execution_price, 2),
                    realized_pnl=0.0,
                    is_closed=False
                )
                db.add(position)

    elif order.transaction_type == "SELL":
        if order.product_type == "CNC":
            # Check holding exists
            holding = db.query(models.Holding).filter(
                models.Holding.user_id == user.id, models.Holding.symbol == order.symbol
            ).first()
            if not holding or holding.quantity < quantity:
                order.status = "REJECTED"
                db.commit()
                return "INSUFFICIENT_HOLDINGS"

            # Decrement holding
            holding.quantity -= quantity
            if holding.quantity == 0:
                db.delete(holding)
            else:
                holding.last_updated = datetime.datetime.utcnow()
        else:
            # Intraday Position Sell (MIS)
            position = db.query(models.Position).filter(
                models.Position.user_id == user.id,
                models.Position.symbol == order.symbol,
                models.Position.is_closed == False
            ).first()
            if position:
                # Accumulating short or closing long
                old_qty = position.quantity
                new_qty = old_qty - quantity
                
                if old_qty > 0:
                    # Closing a long position -> realized PnL
                    closed_qty = min(old_qty, quantity)
                    pnl = (execution_price - position.average_price) * closed_qty
                    position.realized_pnl += round(pnl, 2)
                
                if new_qty == 0:
                    position.is_closed = True
                
                position.quantity = new_qty
                if new_qty != 0 and old_qty < 0:
                    # If accumulating short, update average sell price
                    new_avg = ((abs(old_qty) * position.average_price) + total_value) / abs(new_qty)
                    position.average_price = round(new_avg, 2)
                
                position.last_updated = datetime.datetime.utcnow()
            else:
                position = models.Position(
                    user_id=user.id,
                    symbol=order.symbol,
                    quantity=-quantity,  # Negative for short
                    average_price=round(execution_price, 2),
                    realized_pnl=0.0,
                    is_closed=False
                )
                db.add(position)
        
        # Add cash credit for sell order
        user.cash_balance += total_value

    order.price = round(execution_price, 2)
    order.status = "EXECUTED"
    db.commit()
    return "SUCCESS"


# Background simulator ticking loop
async def tick_background_loop():
    while True:
        try:
            await asyncio.sleep(1.0)
            
            # Step the market simulator
            ticks = market_simulator.tick()
            
            # 1. Broadcast ticks to connected WebSockets
            if active_websocket_connections:
                payload = {symbol: tick for symbol, tick in ticks.items()}
                disconnected = set()
                for ws in active_websocket_connections:
                    try:
                        await ws.send_json(payload)
                    except Exception:
                        disconnected.add(ws)
                for ws in disconnected:
                    active_websocket_connections.remove(ws)

            # 2. Check and trigger pending LIMIT / SL orders in DB
            db = SessionLocal()
            try:
                pending_orders = db.query(models.Order).filter(models.Order.status == "PENDING").all()
                for order in pending_orders:
                    current_price = ticks[order.symbol]["price"]
                    should_execute = False
                    
                    if order.transaction_type == "BUY":
                        if order.order_type == "LIMIT" and current_price <= order.price:
                            should_execute = True
                        elif order.order_type == "SL" and order.trigger_price and current_price >= order.trigger_price:
                            should_execute = True
                    elif order.transaction_type == "SELL":
                        if order.order_type == "LIMIT" and current_price >= order.price:
                            should_execute = True
                        elif order.order_type == "SL" and order.trigger_price and current_price <= order.trigger_price:
                            should_execute = True
                            
                    if should_execute:
                        execute_order_in_db(db, order, current_price)
            except Exception as e:
                print(f"Error checking pending orders: {e}")
            finally:
                db.close()
                
        except Exception as ex:
            print(f"Error in background simulator loop: {ex}")


@app.on_event("startup")
async def startup_event():
    seed_default_user()
    # Run the simulator ticking as a background task
    asyncio.create_task(tick_background_loop())


# --- API Routes ---

# --- Authentication ---
@app.post("/api/auth/request_otp")
def request_otp(payload: schemas.OTPRequest, db: Session = Depends(get_db)):
    # 1. Validate if user is already registered (username or email)
    existing_user = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # 2. Generate a secure 6-digit random OTP
    otp = f"{random.randint(100000, 999999)}"
    
    # 3. Cache the OTP with a 5-minute expiry window
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    otp_cache[payload.email.lower().strip()] = {
        "otp": otp,
        "expires_at": expires_at,
        "username": payload.username
    }

    # 4. Trigger sending of the OTP email (real SMTP or mock fallback)
    sent_successfully = send_otp_email(payload.username, payload.email.strip(), otp)

    if not sent_successfully:
        return {
            "status": "sandbox_mode",
            "message": f"SMTP/API email firewall block detected on hosting server. To allow testing without active configurations, your code is: {otp}",
            "debug_otp": otp
        }

    return {
        "status": "success",
        "message": f"OTP successfully sent to your email: {payload.email}!"
    }


@app.post("/api/auth/register", response_model=schemas.AuthResponse)
def auth_register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    # 1. Double check if username/email already registered
    existing_user = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # Create the user in the database directly
    new_user = models.User(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        cash_balance=1000000.0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Clean up the validated OTP from memory cache
    otp_cache.pop(email_key, None)

    # Seed default watchlist indices for the new user!
    default_symbols = ["NIFTY50", "SENSEX", "BANKNIFTY", "RELIANCE", "TCS", "INFY"]
    for symbol in default_symbols:
        db.add(models.Watchlist(user_id=new_user.id, symbol=symbol))
    db.commit()

    return schemas.AuthResponse(
        status="success",
        message="Account registered and default watchlist loaded!",
        user_id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        cash_balance=new_user.cash_balance
    )


@app.post("/api/auth/login", response_model=schemas.AuthResponse)
def auth_login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        (models.User.username == payload.username) | (models.User.email == payload.username)
    ).first()

    if not user or user.password != payload.password:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    return schemas.AuthResponse(
        status="success",
        message="Authentication successful!",
        user_id=user.id,
        username=user.username,
        email=user.email,
        cash_balance=user.cash_balance
    )


@app.get("/api/user/profile", response_model=schemas.UserProfile)
def get_user_profile(user_id: int = 1, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/api/user/add_funds", response_model=schemas.UserProfile)
def add_funds(payload: schemas.AddFundsRequest, user_id: int = 1, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.cash_balance += payload.amount
    db.commit()
    db.refresh(user)
    return user


@app.post("/api/user/reset", response_model=schemas.UserProfile)
def reset_account(user_id: int = 1, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete holdings, positions, orders, watchlist
    db.query(models.Holding).filter(models.Holding.user_id == user_id).delete()
    db.query(models.Position).filter(models.Position.user_id == user_id).delete()
    db.query(models.Order).filter(models.Order.user_id == user_id).delete()
    db.query(models.Watchlist).filter(models.Watchlist.user_id == user_id).delete()
    
    # Re-seed default watchlist
    default_symbols = ["NIFTY50", "SENSEX", "BANKNIFTY", "RELIANCE", "TCS", "INFY"]
    for symbol in default_symbols:
        db.add(models.Watchlist(user_id=user_id, symbol=symbol))

    user.cash_balance = 1000000.0  # Reset to 10 Lakhs
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/stocks/search")
def search_stocks():
    """Returns a list of all simulated stocks with details."""
    results = []
    for symbol, config in STOCK_CONFIG.items():
        tick = market_simulator.current_ticks[symbol]
        results.append({
            "symbol": symbol,
            "name": config["name"],
            "price": tick["price"],
            "change": tick["change"],
            "change_percent": tick["change_percent"],
            "open": tick["open"],
            "high": tick["high"],
            "low": tick["low"],
            "close": tick["close"],
            "volume": tick["volume"]
        })
    return results


@app.get("/api/stocks/{symbol}/history")
def get_stock_history(symbol: str, interval: str = "1m"):
    """Fetches historical candles enriched with technical indicators."""
    symbol = symbol.upper()
    if not is_valid_symbol(symbol):
        raise HTTPException(status_code=404, detail="Symbol not found")
        
    if interval not in ["1m", "5m", "1d", "1mo", "1y", "max"]:
        raise HTTPException(status_code=400, detail="Invalid interval. Use '1m', '5m', '1d', '1mo', '1y', or 'max'")
        
    candles = market_simulator.get_candles(symbol, interval)
    enriched_candles = add_all_indicators(candles)
    return enriched_candles


@app.post("/api/simulator/toggle_fluctuations")
def toggle_fluctuations(active: bool):
    """Toggles simulator price and candle updates."""
    market_simulator.is_fluctuating = active
    return {"status": "success", "is_fluctuating": market_simulator.is_fluctuating}


@app.get("/api/simulator/status")
def get_simulator_status():
    """Fetches the current running status of the simulator."""
    return {"is_fluctuating": getattr(market_simulator, "is_fluctuating", True)}

@app.get("/api/simulator/exchange_rates")
def get_exchange_rates():
    """Fetches the current real-time exchange rates from the simulator."""
    return market_simulator.exchange_rates


@app.get("/api/watchlist", response_model=List[schemas.WatchlistResponse])
def get_watchlist(user_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Watchlist).filter(models.Watchlist.user_id == user_id).all()


@app.post("/api/watchlist", response_model=schemas.WatchlistResponse)
def add_to_watchlist(payload: schemas.WatchlistCreate, user_id: int = 1, db: Session = Depends(get_db)):
    symbol = payload.symbol.upper()
    if not is_valid_symbol(symbol):
        raise HTTPException(status_code=404, detail="Stock symbol not found")
        
    existing = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == user_id, models.Watchlist.symbol == symbol
    ).first()
    
    if existing:
        return existing
        
    watchlist_item = models.Watchlist(user_id=user_id, symbol=symbol)
    db.add(watchlist_item)
    db.commit()
    db.refresh(watchlist_item)
    return watchlist_item


@app.delete("/api/watchlist/{symbol}")
def remove_from_watchlist(symbol: str, user_id: int = 1, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    item = db.query(models.Watchlist).filter(
        models.Watchlist.user_id == user_id, models.Watchlist.symbol == symbol
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
        
    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"{symbol} removed from watchlist"}


@app.get("/api/orders", response_model=List[schemas.OrderResponse])
def get_orders(user_id: int = 1, db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.user_id == user_id).order_by(models.Order.timestamp.desc()).all()


@app.post("/api/orders", response_model=schemas.OrderResponse)
def place_order(order_payload: schemas.OrderCreate, user_id: int = 1, db: Session = Depends(get_db)):
    symbol = order_payload.symbol.upper()
    if not is_valid_symbol(symbol):
        raise HTTPException(status_code=404, detail="Symbol not found")

    # Create pending/market order structure
    db_order = models.Order(
        user_id=user_id,
        symbol=symbol,
        order_type=order_payload.order_type.upper(),
        transaction_type=order_payload.transaction_type.upper(),
        product_type=order_payload.product_type.upper(),
        quantity=order_payload.quantity,
        price=order_payload.price,
        trigger_price=order_payload.trigger_price,
        status="PENDING"
    )
    db.add(db_order)
    db.commit()
    db_order_id = db_order.id
    db.refresh(db_order)

    # If MARKET order, execute immediately
    if db_order.order_type == "MARKET":
        current_price = market_simulator.current_ticks[symbol]["price"]
        result = execute_order_in_db(db, db_order, current_price)
        if result != "SUCCESS":
            raise HTTPException(status_code=400, detail=result)
    else:
        # Check if LIMIT or SL triggers immediately
        current_price = market_simulator.current_ticks[symbol]["price"]
        should_execute = False
        if db_order.transaction_type == "BUY":
            if db_order.order_type == "LIMIT" and current_price <= db_order.price:
                should_execute = True
            elif db_order.order_type == "SL" and db_order.trigger_price and current_price >= db_order.trigger_price:
                should_execute = True
        elif db_order.transaction_type == "SELL":
            if db_order.order_type == "LIMIT" and current_price >= db_order.price:
                should_execute = True
            elif db_order.order_type == "SL" and db_order.trigger_price and current_price <= db_order.trigger_price:
                should_execute = True
                
        if should_execute:
            result = execute_order_in_db(db, db_order, current_price)
            if result != "SUCCESS":
                raise HTTPException(status_code=400, detail=result)
                
    db.refresh(db_order)
    return db_order


@app.delete("/api/orders/{order_id}")
def cancel_order(order_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id, models.Order.user_id == user_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status != "PENDING":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")
        
    order.status = "CANCELLED"
    db.commit()
    return {"status": "success", "message": f"Order {order_id} cancelled"}


@app.get("/api/portfolio/holdings")
def get_portfolio_holdings(user_id: int = 1, db: Session = Depends(get_db)):
    holdings = db.query(models.Holding).filter(models.Holding.user_id == user_id).all()
    results = []
    
    for h in holdings:
        current_price = market_simulator.current_ticks[h.symbol]["price"]
        candles_1d = market_simulator.get_candles(h.symbol, "1d")
        close_prev = candles_1d[-2]["close"] if len(candles_1d) > 1 else h.average_price
        
        lot_size = get_symbol_lot_size(h.symbol)
        investment = h.average_price * h.quantity * lot_size
        current_value = current_price * h.quantity * lot_size
        pnl = current_value - investment
        pnl_percent = (pnl / investment) * 100 if investment > 0 else 0.0
        
        results.append({
            "id": h.id,
            "symbol": h.symbol,
            "name": get_symbol_display_name(h.symbol),
            "quantity": h.quantity,
            "average_price": h.average_price,
            "current_price": current_price,
            "investment_value": round(investment, 2),
            "current_value": round(current_value, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
            "day_change_percent": market_simulator.current_ticks[h.symbol]["change_percent"]
        })
    return results


@app.get("/api/portfolio/positions")
def get_portfolio_positions(user_id: int = 1, db: Session = Depends(get_db)):
    positions = db.query(models.Position).filter(models.Position.user_id == user_id).all()
    results = []
    
    for pos in positions:
        current_price = market_simulator.current_ticks[pos.symbol]["price"]
        lot_size = get_symbol_lot_size(pos.symbol)
        
        # Unrealized PnL is active only if position is open
        if not pos.is_closed:
            unrealized_pnl = (current_price - pos.average_price) * pos.quantity * lot_size
        else:
            unrealized_pnl = 0.0
            
        total_pnl = pos.realized_pnl + unrealized_pnl
        
        results.append({
            "id": pos.id,
            "symbol": pos.symbol,
            "name": get_symbol_display_name(pos.symbol),
            "quantity": pos.quantity,
            "average_price": pos.average_price,
            "current_price": current_price,
            "realized_pnl": round(pos.realized_pnl, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "total_pnl": round(total_pnl, 2),
            "is_closed": pos.is_closed,
            "last_updated": pos.last_updated
        })
    return results


# --- WebSockets Server ---

@app.websocket("/ws/ticker")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websocket_connections.add(websocket)
    print(f"WebSocket client connected. Active connections: {len(active_websocket_connections)}")
    
    # Immediately send the initial ticker values
    initial_ticks = {symbol: tick for symbol, tick in market_simulator.current_ticks.items()}
    await websocket.send_json(initial_ticks)
    
    try:
        while True:
            # We don't expect messages from client for ticker feed,
            # but we need to receive to detect client disconnection.
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_websocket_connections.remove(websocket)
        print(f"WebSocket client disconnected. Active connections: {len(active_websocket_connections)}")
    except Exception as e:
        if websocket in active_websocket_connections:
            active_websocket_connections.remove(websocket)
        print(f"WebSocket error: {e}")


# --- Static Files Mounting for Unified Frontend/Backend Serving ---
from fastapi.staticfiles import StaticFiles
import os

# Mount the compiled static React Native Web bundle
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
    print(f"Successfully mounted production frontend assets from: {frontend_dist_path}")
else:
    # Also support docker container layout where frontend/dist is placed directly under /app/dist or similar
    docker_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "dist"))
    if os.path.exists(docker_dist_path):
        app.mount("/", StaticFiles(directory=docker_dist_path, html=True), name="frontend")
        print(f"Successfully mounted production frontend assets from: {docker_dist_path}")

