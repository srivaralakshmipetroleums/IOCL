-- PhonePe settlements via IOCL dealer IMPS (Ioclsrivar) were classified as IOCL_CREDIT.

UPDATE bank_transactions
SET category = 'PHONEPE'
WHERE category = 'IOCL_CREDIT'
  AND description ILIKE '%ioclsrivar%'
  AND description ILIKE '%imps%';
