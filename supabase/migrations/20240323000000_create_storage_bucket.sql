-- Create a new storage bucket for maintenance bills
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-bills', 'maintenance-bills', true);

-- Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-bills' AND
  storage.extension(name) = 'pdf'
);

-- Allow public access to PDFs
CREATE POLICY "Allow public access to PDFs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'maintenance-bills');

-- Allow authenticated users to update PDFs
CREATE POLICY "Allow authenticated users to update PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'maintenance-bills')
WITH CHECK (bucket_id = 'maintenance-bills');

-- Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maintenance-bills'); 