-- Split Paytm (One97 / PAYTM) from PhonePe. BULK POSTING and POS_CARD stay unchanged.

ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_category_check;

ALTER TABLE bank_transactions ADD CONSTRAINT bank_transactions_category_check CHECK (
  category IN (
    'IOCL_PAYMENT',
    'IOCL_CREDIT',
    'PHONEPE',
    'PAYTM',
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
SET category = 'PAYTM'
WHERE category IS DISTINCT FROM 'CARD_SETTLEMENT'
  AND category IS DISTINCT FROM 'POS_CARD'
  AND category IS DISTINCT FROM 'BANK_CHARGE'
  AND description NOT ILIKE '%PHONEPE%'
  AND description NOT ILIKE '%PHONE PE%'
  AND (
    description ILIKE '%PAYTM%'
    OR description ILIKE '%ONE97%'
    OR description ILIKE '%ONE 97%'
    OR (
      description ILIKE '%COMMUNICA%'
      AND (description ILIKE '%YESB%' OR description ILIKE '%YESAP%')
    )
  );
