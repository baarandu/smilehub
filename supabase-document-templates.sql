-- Document Templates Table
-- Stores reusable document templates (consent forms, certificates, etc.)

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own templates"
    ON document_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
    ON document_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
    ON document_templates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
    ON document_templates FOR DELETE
    USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_document_templates_user_id ON document_templates(user_id);

-- Variables available in templates:
-- {{nome}} - Patient name
-- {{cpf}} - Patient CPF
-- {{data_nascimento}} - Patient date of birth
-- {{data}} - Document date (selected by user)
-- {{clinica}} - Clinic name
