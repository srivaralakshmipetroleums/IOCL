-- Paytm settlements via Yes Bank RTGS (YESBR UTR) were classified as RTGS.

UPDATE bank_transactions
SET category = 'PAYTM'
WHERE category = 'RTGS'
  AND description ILIKE '%RTGS%'
  AND description ILIKE '%YESBR%';
