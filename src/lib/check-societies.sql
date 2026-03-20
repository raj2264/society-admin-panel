-- List all societies
SELECT id, name, address FROM societies;

-- If no societies exist, create a default one
INSERT INTO societies (name, address)
SELECT 'Default Society', 'Default Address'
WHERE NOT EXISTS (SELECT 1 FROM societies);

-- Get the ID of the first society
SELECT id FROM societies LIMIT 1; 