-- Storage bucket for legal packs
insert into storage.buckets (id, name, public)
values ('legal-packs', 'legal-packs', false)
on conflict (id) do nothing;

-- Documents extracted from uploaded legal packs
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  user_id uuid not null,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  extracted_text text not null default '',
  extracted_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint documents_report_id_fkey foreign key (report_id) references public.reports (id) on delete cascade,
  constraint documents_unique_file_per_report unique (report_id, file_path)
);

create index if not exists idx_documents_report_id on public.documents (report_id);
create index if not exists idx_documents_user_id on public.documents (user_id);

alter table public.documents enable row level security;

create policy "Users can view their own documents"
on public.documents
for select
using (auth.uid() = user_id);

create policy "Users can create their own documents"
on public.documents
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own documents"
on public.documents
for update
using (auth.uid() = user_id);

create policy "Users can delete their own documents"
on public.documents
for delete
using (auth.uid() = user_id);

-- Fixed sections output (persisted)
create table if not exists public.report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  user_id uuid not null,
  section_key text not null,
  content text not null default 'Unknown',
  sources jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint report_sections_report_id_fkey foreign key (report_id) references public.reports (id) on delete cascade,
  constraint report_sections_unique_per_report unique (report_id, section_key),
  constraint report_sections_section_key_check check (
    section_key in (
      'Title',
      'Ownership',
      'Charges and Money',
      'Covenants',
      'Tenure',
      'Planning and Development',
      'Completion & Penalty Risks',
      'Physical & Environmental Risks',
      'Special Conditions & Amenities'
    )
  )
);

create index if not exists idx_report_sections_report_id on public.report_sections (report_id);
create index if not exists idx_report_sections_user_id on public.report_sections (user_id);

alter table public.report_sections enable row level security;

create policy "Users can view their own report sections"
on public.report_sections
for select
using (auth.uid() = user_id);

create policy "Users can create their own report sections"
on public.report_sections
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own report sections"
on public.report_sections
for update
using (auth.uid() = user_id);

create policy "Users can delete their own report sections"
on public.report_sections
for delete
using (auth.uid() = user_id);

-- updated_at triggers
drop trigger if exists update_reports_updated_at on public.reports;
create trigger update_reports_updated_at
before update on public.reports
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_documents_updated_at on public.documents;
create trigger update_documents_updated_at
before update on public.documents
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_report_sections_updated_at on public.report_sections;
create trigger update_report_sections_updated_at
before update on public.report_sections
for each row
execute function public.update_updated_at_column();

-- Storage RLS policies for legal packs bucket
-- Folder structure: {user_id}/{report_id}/{filename}
create policy "Users can list/download their own legal packs"
on storage.objects
for select
using (
  bucket_id = 'legal-packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload their own legal packs"
on storage.objects
for insert
with check (
  bucket_id = 'legal-packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own legal packs"
on storage.objects
for update
using (
  bucket_id = 'legal-packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own legal packs"
on storage.objects
for delete
using (
  bucket_id = 'legal-packs'
  and auth.uid()::text = (storage.foldername(name))[1]
);