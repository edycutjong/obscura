#!/usr/bin/env python3
import json
import base64

def generate_anomalous_seeds():
    print("=" * 60)
    print("           OBSCURA ANOMALOUS SEED GENERATOR")
    print("=" * 60)
    
    anomalies = [
        {
            "scenario": "Double-Factoring Attempt (INV-1002)",
            "hash": "f2a5d21a221b2b8c5457ef469e38d729a6be339d37532a82645e7e1e695d729b",
            "metadata": {
                "invoiceId": "INV-1002",
                "amount": 25000,
                "dueDate": 1789000000,
                "sellerName": "TechParts Development"
            },
            "issue": "Attempting to re-settle or factoring twice against the same nullifier"
        },
        {
            "scenario": "Credit Line Exploit Attempt (INV-9872)",
            "hash": "c585c57b830e0bc3c8e411b402868472a6be339d37532a82645e7e1e695d729a",
            "metadata": {
                "invoiceId": "INV-9872",
                "amount": 120000, # exceeds $100k credit line
                "dueDate": 1789000000,
                "sellerName": "Metal Forge Corp"
            },
            "issue": "Amount exceeds credit limit of 100,000"
        },
        {
            "scenario": "Post-Due Date Settlement Attempt (INV-Expired)",
            "hash": "due-date-expired-hash-val",
            "metadata": {
                "invoiceId": "INV-Expired",
                "amount": 30000,
                "dueDate": 1450000000, # expired due date
                "sellerName": "Global Parts Ltd"
            },
            "issue": "Current block time exceeds due date"
        }
    ]

    for record in anomalies:
        meta_json = json.dumps(record["metadata"])
        encoded_meta = base64.b64encode(meta_json.encode('utf-8')).decode('utf-8')
        
        print(f"Scenario:  {record['scenario']}")
        print(f"Commitment: {record['hash']}")
        print(f"Envelope:   {encoded_meta}")
        print(f"Violation:  {record['issue']}")
        print("-" * 60)

    print("STATUS: ANOMALOUS SEEDS SPECIFIED")
    print("=" * 60)

if __name__ == "__main__":
    generate_anomalous_seeds()
