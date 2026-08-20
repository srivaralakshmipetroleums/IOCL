-- Add POS_CARD for pump POS credit/debit card credits (NEFT*ICIC…CREDIT CARD OPER).
-- BULK POSTING rows stay CARD_SETTLEMENT.

ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_category_check;

ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_category_check CHECK (
  category IN (
    'IOCL_PAYMENT',
    'IOCL_CREDIT',
    'PHONEPE',
    'CARD_SETTLEMENT',
    'POS_CARD',
    'CASH_DEPOSIT',
    'UPI_CREDIT',
    'UPI_DEBIT',
    'SALARY',
    'BANK_CHARGE',
    'NACH_ACH',
    'CHEQUE',
    'NEFT',
    'RTGS',
    'IMPS',
    'TRANSFER',
    'INTEREST',
    'OTHER'
  )
);

UPDATE bank_transactions
SET category = 'POS_CARD'
WHERE category IS DISTINCT FROM 'CARD_SETTLEMENT'
  AND category IS DISTINCT FROM 'BANK_CHARGE'
  AND (
    description ILIKE '%CREDIT CARD%'
    OR description ILIKE '%DEBIT CARD OPER%'
    OR description ILIKE '%CARD OPER%'
  )
  AND description NOT ILIKE '%BULK POSTING%'
  AND description NOT ILIKE '%POS RENT%'
  AND description NOT ILIKE '%GPRS RENT%';
