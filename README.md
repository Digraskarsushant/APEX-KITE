# APEX KITE: Stock Trading Terminal

APEX KITE is a high-performance, full-stack, real-time simulated stock trading terminal. It features interactive technical charting, a Black-Scholes options pricing engine, Stripe payment simulations, dynamic global currency conversions, and automated indicator predictions.

---

## Key Features

* **Real-Time Market Feeds**: Live price ticking synchronized directly with **Yahoo Finance** data feeds using high-frequency background polling.
* **Interactive SVG Charts**:
  * Candlestick and Line/Area plot modes.
  * Technical indicator overlays (EMA, SMA, Bollinger Bands).
  * Independent subplots for Volume, RSI, and MACD.
  * Interactive crosshair hover tooltip, graph horizontal panning, and freeze/pause market ticking controls.
* **Derivative Options Chains**:
  * Built-in **Black-Scholes Options Pricing Engine** to dynamically calculate Call (CE) and Put (PE) option premiums in under 0.1ms.
  * Strike price spacing centered dynamically on underlying spot levels.
  * Dedicated option details pages featuring specialized charting, technical predictive rating consensus, and contract high/low stats.
  * Lot-based derivatives order execution and position evaluations.
* **Consolidated Portfolio Tracker**:
  * Real-time ticking P&L valuations for holdings (Delivery CNC) and active positions (Intraday MIS with 5x leverage).
  * Sector and asset allocation donut charts.
* **Dynamic Currency Conversions**:
  * Dynamically queries Yahoo Finance exchange tickers (`USDINR=X`, `GBPINR=X`, `JPYINR=X`).
  * Resolves foreign asset prices and converts margin required estimates in real-time to Indian Rupees (INR) for balance verification.
  * Consolidates entire portfolios under a unified ledger base currency (`₹`).
* **Appearance Customization**: Seamless transitions between Dark Mode, Light Mode, and System Preference options.
* **Simulator Stripe checkout**: Sandboxed Premium Stripe Portal simulation supporting both Card and UPI flows to replenish virtual cash instantly when margins run low.

---

## Tech Stack

* **Backend**: Python, FastAPI, SQLite, SQLAlchemy, yfinance.
* **Frontend**: React Native, Expo, React Native Web, React Native SVG, Axios.

---

## Installation & Setup

Ensure you have **Python 3.10+** and **Node.js 18+** installed on your system.

### 1. Backend Setup (FastAPI Server)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source .venv/bin/activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the backend server:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The server will boot, seed a default sandbox profile, fetch real-time Yahoo Finance index histories, and listen on [http://localhost:8000](http://localhost:8000).*

### 2. Frontend Setup (Web, Android & iOS)

1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Run the application:
   * **To run in your Web Browser**:
     ```bash
     npm run web
     ```
     *This boots the web bundle and opens the terminal dashboard in your browser at [http://localhost:8081](http://localhost:8081).*
   * **To run on Mobile (Android & iOS) via Expo Go**:
     1. Install the free **Expo Go** app on your physical mobile device from the Google Play Store or Apple App Store.
     2. Ensure your phone and development computer are connected to the **same Wi-Fi network**.
     3. Ensure your computer's Wi-Fi network profile is set to **Private** (to allow incoming port `8081` and `8000` handshakes).
     4. Start the Expo Metro Bundler:
        ```bash
        npx expo start
        ```
     5. Scan the QR code displayed in your terminal window:
        * **Android**: Open the **Expo Go** app and tap "Scan QR Code".
        * **iOS**: Open the native **Camera** app, scan the QR code, and tap the link to open it in Expo Go.
     6. *Troubleshooting*: If your local Wi-Fi router blocks standard peer connections, run the bundler in tunnel mode:
        ```bash
        npx expo start --tunnel
        ```


---

## Project Structure

```
├── backend/
│   ├── main.py            # FastAPI server routes & WebSockets ticking
│   ├── simulator.py       # yfinance polling loop & Black-Scholes formulas
│   ├── database.py        # SQLAlchemy SQLite engine configuration
│   ├── models.py          # Database models (Holdings, Orders, Positions)
│   ├── schemas.py         # Pydantic schemas validation
│   └── requirements.txt   # Python package dependencies
│
└── frontend/
    ├── src/
    │   ├── components/    # Reusable widgets (InteractiveChart, OrderModal)
    │   ├── context/       # AppContext state, auth persistence & dynamic themes
    │   ├── screens/       # Main terminal screens (Watchlist, Portfolio, Settings)
    │   └── utils/         # Axios network config & currency classification
    └── App.js             # Navigation wrappers and shell bootstrapper
```
