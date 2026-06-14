# Data Retention Policy

## Scope
This policy applies to all customer order data processed by HashView.

## Retention Periods
1. **Active Database:** Order records are kept in the highly-available primary database for exactly 90 days from the date of creation.
2. **Cold Storage Archival:** After 90 days, orders are automatically transferred to a cold-storage archive to maintain primary database performance.
3. **Anonymization upon Request:** If a customer requests data deletion under GDPR/CCPA, their personal identifying information (Name, Email, Phone) will be stripped from the order, leaving only anonymized financial data required for business accounting.
