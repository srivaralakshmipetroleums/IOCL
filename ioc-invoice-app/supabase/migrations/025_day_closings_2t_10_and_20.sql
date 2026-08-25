-- MS 2T packets at ₹10 and ₹20

ALTER TABLE day_closings
  ADD COLUMN IF NOT EXISTS ms_oil_2t_packets_10 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_oil_2t_packets_10 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_oil_2t_packets_20 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_oil_2t_packets_20 INTEGER NOT NULL DEFAULT 0;

UPDATE day_closings
SET ms_oil_2t_packets_20 = ms_oil_2t_packets
WHERE COALESCE(ms_oil_2t_packets, 0) > 0
  AND COALESCE(ms_oil_2t_packets_20, 0) = 0;

UPDATE day_closings
SET hsd_oil_2t_packets_20 = hsd_oil_2t_packets
WHERE COALESCE(hsd_oil_2t_packets, 0) > 0
  AND COALESCE(hsd_oil_2t_packets_20, 0) = 0;
