-- Which guest added a title (an anonymous browser id). NULL for the sample
-- data and for titles created through the API without a guest id.
ALTER TABLE movies ADD COLUMN created_by TEXT;
