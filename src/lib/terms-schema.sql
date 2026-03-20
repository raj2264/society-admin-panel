-- Create terms_acceptance table
CREATE TABLE IF NOT EXISTS terms_acceptance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('resident', 'guard', 'society_admin')),
    terms_version TEXT NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    device_info TEXT,
    UNIQUE(user_id, user_type)
);

-- Enable RLS
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own terms acceptance" ON terms_acceptance;
DROP POLICY IF EXISTS "Society admins can view all terms acceptance" ON terms_acceptance;
DROP POLICY IF EXISTS "Users can insert their own terms acceptance" ON terms_acceptance;
DROP POLICY IF EXISTS "Society admins can manage all terms acceptance" ON terms_acceptance;

-- Users can view their own terms acceptance
CREATE POLICY "Users can view their own terms acceptance" ON terms_acceptance
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own terms acceptance
CREATE POLICY "Users can insert their own terms acceptance" ON terms_acceptance
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Society admins can view all terms acceptance in their society
CREATE POLICY "Society admins can view all terms acceptance" ON terms_acceptance
    FOR SELECT
    USING (
        user_id IN (
            SELECT r.user_id FROM residents r
            WHERE r.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
        OR
        user_id IN (
            SELECT g.user_id FROM guards g
            WHERE g.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
        OR
        user_id IN (
            SELECT sa.user_id FROM society_admins sa
            WHERE sa.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
    );

-- Society admins can manage all terms acceptance in their society
CREATE POLICY "Society admins can manage all terms acceptance" ON terms_acceptance
    FOR ALL
    USING (
        user_id IN (
            SELECT r.user_id FROM residents r
            WHERE r.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
        OR
        user_id IN (
            SELECT g.user_id FROM guards g
            WHERE g.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
        OR
        user_id IN (
            SELECT sa.user_id FROM society_admins sa
            WHERE sa.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        user_id IN (
            SELECT r.user_id FROM residents r
            WHERE r.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
        OR
        user_id IN (
            SELECT g.user_id FROM guards g
            WHERE g.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
        OR
        user_id IN (
            SELECT sa.user_id FROM society_admins sa
            WHERE sa.society_id IN (
                SELECT society_id FROM society_admins
                WHERE user_id = auth.uid()
            )
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT ON terms_acceptance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON terms_acceptance TO service_role;

-- Create terms_versions table to store different versions of terms and conditions
CREATE TABLE IF NOT EXISTS public.terms_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE public.terms_versions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read terms versions
CREATE POLICY "Allow authenticated users to read terms versions"
    ON public.terms_versions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only allow society admins to insert/update terms versions
CREATE POLICY "Allow society admins to manage terms versions"
    ON public.terms_versions
    USING (
        auth.uid() IN (
            SELECT user_id 
            FROM society_admins
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_terms_versions_updated_at
    BEFORE UPDATE ON public.terms_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert initial terms version
INSERT INTO public.terms_versions (version, content)
VALUES (
    '1.0',
    E'Terms and Conditions for MySociety App

1. Acceptance of Terms
By accessing and using the MySociety App, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.

2. User Responsibilities
2.1. You must provide accurate and complete information when registering.
2.2. You are responsible for maintaining the confidentiality of your account.
2.3. You must notify us immediately of any unauthorized use of your account.

3. Privacy and Data Protection
3.1. We collect and process your personal data in accordance with our Privacy Policy.
3.2. We implement appropriate security measures to protect your data.
3.3. You have the right to access, correct, or delete your personal data.

4. Acceptable Use
4.1. You agree to use the app only for lawful purposes.
4.2. You must not use the app to:
   - Harass or abuse other users
   - Post false or misleading information
   - Violate any applicable laws or regulations

5. Society Rules
5.1. You agree to follow your society''s specific rules and regulations.
5.2. Society admins have the authority to enforce these rules.
5.3. Violations may result in restricted access or account suspension.

6. Visitor Management
6.1. All visitors must be properly registered through the app.
6.2. You are responsible for your visitors'' conduct.
6.3. Guards may verify visitor information as needed.

7. Security
7.1. Report any security concerns immediately.
7.2. Do not share your login credentials.
7.3. Log out when using shared devices.

8. Modifications
8.1. We may update these terms at any time.
8.2. You will be notified of significant changes.
8.3. Continued use implies acceptance of new terms.

9. Limitation of Liability
9.1. We are not liable for any indirect damages.
9.2. Our liability is limited to the extent permitted by law.
9.3. We do not guarantee uninterrupted service.

10. Contact
For any questions about these terms, please contact your society administration.

Last Updated: ' || CURRENT_DATE
) ON CONFLICT (version) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT ON public.terms_versions TO authenticated;
GRANT ALL ON public.terms_versions TO service_role; 