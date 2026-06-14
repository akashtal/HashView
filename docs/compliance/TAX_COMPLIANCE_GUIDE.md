# Tax Compliance Guide

HashView's Billing Engine supports two distinct calculation modes to ensure compliance across different global jurisdictions:

## Exclusive Tax (e.g., US Sales Tax)
Taxes are calculated ON TOP of the menu item price.
*Example: A $10 item with 10% tax will result in a $11 grand total.*

## Inclusive Tax (e.g., UK VAT, AU GST)
Taxes are INCLUDED in the sticker price of the menu item.
*Example: A $10 item with 20% VAT will result in a $10 grand total. The engine mathematically back-calculates that $1.67 of that $10 was tax.*

Business Owners are responsible for correctly configuring these flags in their Billing Dashboard.
