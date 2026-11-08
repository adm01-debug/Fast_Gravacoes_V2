-- Create storage bucket for production photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('production-photos', 'production-photos', true)
ON CONFLICT (id) DO NOTHING

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload production photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'production-photos')

-- Allow anyone to view production photos
CREATE POLICY "Anyone can view production photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'production-photos')

-- Allow authenticated users to delete their photos
CREATE POLICY "Authenticated users can delete production photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'production-photos')

-- Add columns for production photos to jobs table if not exists
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS production_photos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS produced_quantity INTEGER DEFAULT 0
