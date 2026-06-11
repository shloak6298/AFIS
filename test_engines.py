"""
Module 2 — Unified Engine Test Runner
======================================
Loads the synthetic dataset and runs all five created engines:
  1. Transaction Pattern Analyzer
  2. User History Analyzer
  3. Device Anomaly Detector
  4. Location Anomaly Detector
  5. Linked Account Analyzer

Usage:
    python backend/test_engines.py
"""

import os
import sys

# Ensure imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.data.database import get_data_store
from backend.engines.transaction_pattern import TransactionPatternAnalyzer
from backend.engines.user_history import UserHistoryAnalyzer
from backend.engines.device_anomaly import DeviceAnomalyDetector
from backend.engines.location_anomaly import LocationAnomalyDetector
from backend.engines.linked_accounts import LinkedAccountAnalyzer
from backend.config import CURRENCY_SYMBOL

def run_tests():
    print("=" * 70)
    print("  MODULE 2 — UNIFIED ENGINES TEST RUNNER")
    print("=" * 70)

    # 1. Initialize and Load Data
    db = get_data_store()
    db.load_all()

    if db.transactions_df.empty:
        print("❌ Error: Transactions dataframe is empty. Please run the synthetic data generator first:")
        print("   python -m backend.data.synthetic_generator")
        return

    # 2. Instantiate Analyzers
    pattern_analyzer = TransactionPatternAnalyzer(db)
    history_analyzer = UserHistoryAnalyzer(db)
    device_analyzer = DeviceAnomalyDetector(db)
    location_analyzer = LocationAnomalyDetector(db)
    linked_analyzer = LinkedAccountAnalyzer(db)

    # 3. Select Test Transactions
    # We will grab:
    #   - A few flagged transactions (high risk)
    #   - A few normal transactions (low risk)
    
    print("\n🔍 Selecting test transactions...")
    high_risk_txs = db.get_high_risk_transactions(threshold=0.7).head(3)
    normal_txs = db.transactions_df[db.transactions_df["risk_score_module1"] < 0.2].head(2)

    test_txs = []
    for _, row in high_risk_txs.iterrows():
        test_txs.append((row["transaction_id"], "High Risk (Module 1 flagged)"))
    for _, row in normal_txs.iterrows():
        test_txs.append((row["transaction_id"], "Normal/Low Risk"))

    # 4. Run Analysis
    for tx_id, label in test_txs:
        tx = db.get_transaction(tx_id)
        if not tx:
            continue

        print("\n" + "=" * 70)
        print(f" TX ID: {tx_id} | Label: {label}")
        print(f" Sender: {tx['sender_id']} | Receiver: {tx['receiver_id']}")
        print(f" Amount: {CURRENCY_SYMBOL}{tx['amount']:,.2f} | Time: {tx['timestamp']}")
        print(f" Location: {tx['city']}, {tx['country']} | Device: {tx['device_id']}")
        print("-" * 70)

        # Run each engine
        r_pattern = pattern_analyzer.analyze(tx_id)
        r_history = history_analyzer.analyze(tx_id)
        r_device = device_analyzer.analyze(tx_id)
        r_location = location_analyzer.analyze(tx_id)
        r_linked = linked_analyzer.analyze(tx_id)

        # Print Engine Scores
        print(f" Engine Scores:")
        print(f"   • Transaction Pattern: [{r_pattern.score:.4f}]")
        print(f"   • User History:        [{r_history.score:.4f}]")
        print(f"   • Device Anomaly:      [{r_device.score:.4f}]")
        print(f"   • Location Anomaly:    [{r_location.score:.4f}]")
        print(f"   • Linked Accounts:     [{r_linked.score:.4f}]")
        print("-" * 70)

        # Print Aggregated Findings
        print(" Key Findings:")
        all_findings = []
        for eng_res in [r_pattern, r_history, r_device, r_location, r_linked]:
            for finding in eng_res.findings:
                if (
                    "No significant" not in finding 
                    and "consistency" not in finding 
                    and "verified" not in finding
                    and "relationship" not in finding
                ):
                    all_findings.append((eng_res.engine_name, finding))

        if all_findings:
            for engine, finding in all_findings:
                print(f"   ⚠️  [{engine.upper()}] {finding}")
        else:
            print("   ✅ No anomalies detected across any engine.")

        # Print sub-analyzers breakdown
        print("-" * 70)
        print(" Sub-analyzer Scores:")
        for res in [r_pattern, r_history, r_device, r_location, r_linked]:
            print(f"   [{res.engine_name.upper()}]:")
            for sub_name, data in res.raw_data.items():
                if sub_name in ["composite_breakdown", "graph_data"]:
                    continue
                score = data.get("score", 0.0)
                bar = "█" * int(score * 10) + "░" * (10 - int(score * 10))
                print(f"     • {sub_name:20s} [{bar}] {score:.4f}")

    db.close()
    print("\n" + "=" * 70)
    print("✅ Testing completed successfully!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
