-- Check what member names exist for testing
SELECT first_name, surname, contact_primary, email
FROM members 
WHERE church_id = 1
ORDER BY first_name, surname
LIMIT 10;
