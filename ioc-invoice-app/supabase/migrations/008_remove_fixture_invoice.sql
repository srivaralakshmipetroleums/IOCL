-- Remove sample fixture invoice created by the local extractor during development/testing.
DELETE FROM invoices
WHERE invoice_number = '7009317047'
  AND supplier_name = 'Indian Oil Corporation Limited';
