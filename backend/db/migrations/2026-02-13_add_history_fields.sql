-- Add new columns to search_history table for enhanced analytics

ALTER TABLE search_history
ADD COLUMN search_level VARCHAR(20),
ADD COLUMN search_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN search_source VARCHAR(20) DEFAULT 'text';

-- Comments for documentation
-- search_level: 'easy', 'medium', 'hard'
-- search_language: 'en', 'te', 'hi'
-- search_source: 'text', 'voice', 'image'
