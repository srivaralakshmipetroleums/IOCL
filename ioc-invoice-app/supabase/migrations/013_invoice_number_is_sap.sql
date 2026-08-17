-- Use IOCL SAP entry / billing document as invoices.invoice_number
-- (PAD statements and Excel BILL NO already use this 10-digit number)

UPDATE invoices
SET invoice_number = sap_entry_number
WHERE sap_entry_number ~ '^[0-9]{10}$'
  AND invoice_number IS DISTINCT FROM sap_entry_number;
