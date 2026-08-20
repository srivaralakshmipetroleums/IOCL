-- PhonePe IMPS settlements (e.g. PhonePe /F09 Iocls) were misclassified as IOCL_CREDIT
-- because "Iocls" contains the IOCL substring.

UPDATE bank_transactions
SET category = 'PHONEPE'
WHERE category = 'IOCL_CREDIT'
  AND (
    description ILIKE '%PHONEPE%'
    OR description ILIKE '%PHONE PE%'
  );
