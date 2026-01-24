-- Șterge constraint-ul vechi
ALTER TABLE hook_signals DROP CONSTRAINT IF EXISTS hook_signals_signal_type_check;

-- Adaugă constraint-ul nou cu toate valorile (inclusiv engagement_question_response)
ALTER TABLE hook_signals ADD CONSTRAINT hook_signals_signal_type_check 
CHECK (signal_type = ANY (ARRAY[
  'positive_feedback'::text, 
  'return_24h'::text, 
  'personal_question'::text, 
  'personal_share'::text, 
  'long_session'::text, 
  'follow_up_questions'::text, 
  'odd_hours'::text, 
  'emotional_expression'::text, 
  'name_usage'::text,
  'engagement_question_response'::text
]));