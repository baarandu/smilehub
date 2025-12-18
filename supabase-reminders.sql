-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    due_date timestamp with time zone,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_is_active ON public.reminders(is_active);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own reminders" 
    ON public.reminders FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders" 
    ON public.reminders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
    ON public.reminders FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
    ON public.reminders FOR DELETE 
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER handle_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
