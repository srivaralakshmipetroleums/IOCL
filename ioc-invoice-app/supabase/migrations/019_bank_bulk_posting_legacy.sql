-- Older bulk card settlements: "BULK / 16899 POSTING- CR_SRI VARALAKSH MI PETROL..."

UPDATE bank_transactions
SET category = 'CARD_SETTLEMENT'
WHERE category = 'OTHER'
  AND description ILIKE '%bulk%'
  AND description ILIKE '%posting%'
  AND description ILIKE '%CR_%';
