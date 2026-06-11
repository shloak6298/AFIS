"""
Configuration & Constants
=====================================
Central configuration for all engines, thresholds, paths, and settings.
"""
import os
# ──────────────────────────────────────────────
# PATHS
# ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data", "sample_data")
DB_PATH = os.path.join(BASE_DIR, "data", "investigations.db")
# CSV file paths
TRANSACTIONS_CSV = os.path.join(DATA_DIR, "transactions.csv")
USERS_CSV = os.path.join(DATA_DIR, "users.csv")
DEVICES_CSV = os.path.join(DATA_DIR, "devices.csv")
LOCATIONS_CSV = os.path.join(DATA_DIR, "locations.csv")
ACCOUNTS_CSV = os.path.join(DATA_DIR, "accounts.csv")
# ──────────────────────────────────────────────
# SYNTHETIC DATA GENERATION
# ──────────────────────────────────────────────
NUM_USERS = 1000
NUM_TRANSACTIONS = 50000
NUM_DEVICES_PER_USER = (1, 3)        # min, max devices per user
FRAUD_INJECTION_RATE = 0.05          # 5% of users will have fraud patterns
FLAGGED_ACCOUNT_RATE = 0.02          # 2% of accounts pre-flagged
# ──────────────────────────────────────────────
# TRANSACTION PATTERN ENGINE THRESHOLDS
# ──────────────────────────────────────────────
VELOCITY_WINDOW_SECONDS = 120         # 2-minute sliding window
VELOCITY_THRESHOLD = 5                # 5+ txns in window = suspicious
AMOUNT_ZSCORE_THRESHOLD = 2.5         # Z-score above this = anomaly
FREQUENCY_MULTIPLIER_THRESHOLD = 3.0  # 3x daily avg = suspicious
ROUND_AMOUNT_THRESHOLD = 1000         # Amounts divisible by this flagged
UNUSUAL_HOUR_START = 1                # 1 AM
UNUSUAL_HOUR_END = 5                  # 5 AM
# Transaction Pattern Weights (must sum to 1.0)
PATTERN_WEIGHTS = {
    "velocity": 0.30,
    "amount": 0.25,
    "frequency": 0.20,
    "round_amount": 0.15,
    "time_of_day": 0.10,
}
# ──────────────────────────────────────────────
# USER HISTORY ENGINE THRESHOLDS
# ──────────────────────────────────────────────
NEW_ACCOUNT_DAYS = 30                 # Accounts < 30 days old = "new"
HIGH_VALUE_PERCENTILE = 95            # Top 5% amounts = "high value"
BASELINE_WINDOW_DAYS = 90             # 90-day behavioral baseline
RECENT_WINDOW_DAYS = 7                # 7-day recent behavior window
FIRST_TIME_RECIPIENT_AMOUNT = 50000   # Flag first-time recipients above this
# User History Weights
HISTORY_WEIGHTS = {
    "account_age": 0.25,
    "behavioral_shift": 0.35,
    "recipient_analysis": 0.40,
}
# ──────────────────────────────────────────────
# DEVICE ANOMALY ENGINE THRESHOLDS
# ──────────────────────────────────────────────
DEVICE_VELOCITY_WINDOW_HOURS = 24     # Multiple devices in 24hrs = suspicious
DEVICE_VELOCITY_THRESHOLD = 3         # 3+ different devices in window
DEVICE_SHARING_THRESHOLD = 2          # Device used by 2+ unrelated users
# Device Anomaly Weights
DEVICE_WEIGHTS = {
    "new_device": 0.40,
    "device_velocity": 0.30,
    "device_sharing": 0.30,
}
# ──────────────────────────────────────────────
# LOCATION ANOMALY ENGINE THRESHOLDS
# ──────────────────────────────────────────────
IMPOSSIBLE_TRAVEL_SPEED_KMH = 900     # Max plausible speed (km/h)
HIGH_RISK_COUNTRIES = [
    "North Korea", "Iran", "Syria", "Myanmar",
    "Afghanistan", "Yemen", "Libya", "Somalia",
]
LOCATION_MISMATCH_KM = 500            # Device usual location vs txn location
# Location Anomaly Weights
LOCATION_WEIGHTS = {
    "impossible_travel": 0.40,
    "geo_fence": 0.30,
    "location_mismatch": 0.30,
}
# ──────────────────────────────────────────────
# LINKED ACCOUNT ENGINE THRESHOLDS
# ──────────────────────────────────────────────
FLAGGED_PROXIMITY_MAX_HOPS = 3        # Check up to 3 hops away
FLAGGED_PROXIMITY_DECAY = 0.5         # Risk decays by 50% per hop
CIRCULAR_FLOW_MIN_AMOUNT = 10000      # Min amount for circular flow detection
CIRCULAR_FLOW_MAX_CYCLE_LENGTH = 5    # Max cycle length to search
# Linked Account Weights
LINKED_WEIGHTS = {
    "flagged_proximity": 0.35,
    "cluster_risk": 0.30,
    "circular_flow": 0.35,
}
# ──────────────────────────────────────────────
# OVERALL RISK SCORING
# ──────────────────────────────────────────────
ENGINE_WEIGHTS = {
    "transaction_pattern": 0.25,
    "user_history": 0.20,
    "device_anomaly": 0.20,
    "location_anomaly": 0.20,
    "linked_accounts": 0.15,
}
# Escalation thresholds
ESCALATION_THRESHOLDS = {
    "LOW": (0.0, 0.3),
    "MEDIUM": (0.3, 0.6),
    "HIGH": (0.6, 0.8),
    "CRITICAL": (0.8, 1.0),
}
# ──────────────────────────────────────────────
# LLM / OLLAMA SETTINGS
# ──────────────────────────────────────────────
OLLAMA_MODEL = "llama3.1:8b"
OLLAMA_BASE_URL = "http://localhost:11434"
LLM_TIMEOUT_SECONDS = 60
LLM_TEMPERATURE = 0.3                 # Low temp for consistent analysis
USE_LLM = True                        # Set False to use template fallback
# ──────────────────────────────────────────────
# API SETTINGS
# ──────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = ["*"]
# ──────────────────────────────────────────────
# CURRENCY
# ──────────────────────────────────────────────
CURRENCY_SYMBOL = "₹"
CURRENCY_CODE = "INR"
