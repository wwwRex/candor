create policy "thumbnails: user owns path" on storage.objects
  for all using (
    bucket_id = 'thumbnails'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
