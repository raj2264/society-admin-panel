-- Create a new meeting notes table with a different name
CREATE TABLE IF NOT EXISTS public.meeting_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    note_content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add Row Level Security
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

-- Society admins can create meeting notes
CREATE POLICY "Society admins can create meeting notes" ON public.meeting_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.society_admins sa
            JOIN public.meetings m ON m.society_id = sa.society_id
            WHERE m.id = meeting_notes.meeting_id
            AND sa.user_id = auth.uid()
        )
    );

-- Society admins can update meeting notes
CREATE POLICY "Society admins can update meeting notes" ON public.meeting_notes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.society_admins sa
            JOIN public.meetings m ON m.society_id = sa.society_id
            WHERE m.id = meeting_notes.meeting_id
            AND sa.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.society_admins sa
            JOIN public.meetings m ON m.society_id = sa.society_id
            WHERE m.id = meeting_notes.meeting_id
            AND sa.user_id = auth.uid()
        )
    );

-- Society admins can view meeting notes
CREATE POLICY "Society admins can view meeting notes" ON public.meeting_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.society_admins sa
            JOIN public.meetings m ON m.society_id = sa.society_id
            WHERE m.id = meeting_notes.meeting_id
            AND sa.user_id = auth.uid()
        )
    );

-- Society residents can view meeting notes
CREATE POLICY "Residents can view meeting notes" ON public.meeting_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.residents r
            JOIN public.meetings m ON m.society_id = r.society_id
            WHERE m.id = meeting_notes.meeting_id
            AND r.user_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE TRIGGER set_meeting_notes_updated_at
BEFORE UPDATE ON public.meeting_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 