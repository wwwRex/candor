-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos', 'videos', false, 104857600,
   array['video/mp4', 'video/quicktime', 'video/x-m4v']),
  ('audio', 'audio', false, 52428800,
   array['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/mpeg']);

-- Storage RLS: users can only access their own path prefix ({user_id}/...)
create policy "videos: user owns path" on storage.objects
  for all using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "audio: user owns path" on storage.objects
  for all using (
    bucket_id = 'audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
