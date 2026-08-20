-- DESIGN.md 3장 "데이터 저장 구조" 초안대로 검색 결과 저장용 테이블 생성
create table if not exists public.research_results (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('program', 'cast')),
  query text not null,
  result_data jsonb not null,
  is_partial boolean not null default false,
  selected_person jsonb,
  searched_at timestamptz not null default now()
);

-- RLS는 켜두되 별도 정책을 추가하지 않는다(기본값: 전체 차단).
-- Next.js API Route는 서버에서 service_role 키로 접근해 RLS를 우회하므로 정상 동작하고,
-- 브라우저에서 anon 키로 직접 테이블을 조회/나열하는 것은 막혀서 DESIGN.md의 "결과 목록 비공개" 방침을 지킨다.
alter table public.research_results enable row level security;
