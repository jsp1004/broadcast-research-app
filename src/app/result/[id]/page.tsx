import { notFound } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { ProgramResultCard } from "@/components/program-result-card";
import { CastResultCard } from "@/components/cast-result-card";
import type { EnrichedProgramCard } from "@/lib/schemas/program";
import type { EnrichedCastCard } from "@/lib/schemas/cast";

// PLAN.md 작업 11 / DESIGN.md "검색 결과 재열람": 고유 링크(`/result/{id}`)를 아는 사람만 접근.
// 목록 화면은 두지 않는다(공개 URL 서비스에서 타인의 검색어가 노출되지 않도록 하기 위함).
interface ResultRow {
  id: string;
  type: "program" | "cast";
  query: string;
  result_data: unknown;
  is_partial: boolean;
  searched_at: string;
}

interface ProgramResultData {
  foundCount: number;
  notFound: boolean;
  belowMinimum: boolean;
  missingCountryMix: boolean;
  programs: EnrichedProgramCard[];
}

interface CastResultData {
  found: boolean;
  cast: EnrichedCastCard | null;
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("research_results")
    .select("id, type, query, result_data, is_partial, searched_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = data as ResultRow;
  const searchedAt = new Date(row.searched_at).toLocaleString("ko-KR");

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">
          {row.type === "program" ? "유사 프로그램 리서치 결과" : "예상 출연자 리서치 결과"}
        </h1>
        <p className="text-muted-foreground">검색어: {row.query}</p>
        <p className="text-xs text-muted-foreground">{searchedAt} 기준 저장된 결과입니다.</p>
        {row.is_partial && (
          <p className="text-sm text-muted-foreground">
            일부 부가 정보(유튜브 관련 자료)는 수집하지 못한 부분 결과입니다.
          </p>
        )}
      </div>

      {row.type === "program" ? (
        <ProgramResultView data={row.result_data as ProgramResultData} />
      ) : (
        <CastResultView data={row.result_data as CastResultData} />
      )}
    </div>
  );
}

function ProgramResultView({ data }: { data: ProgramResultData }) {
  return (
    <div className="w-full max-w-4xl">
      {data.belowMinimum && (
        <p className="mb-3 text-center text-sm text-muted-foreground">
          관련 프로그램 {data.foundCount}건 확인됨
        </p>
      )}
      {data.missingCountryMix && (
        <p className="mb-3 text-center text-sm text-muted-foreground">
          이번 검색에는 국내 또는 해외 프로그램 중 한쪽만 포함되었습니다.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.programs.map((program) => (
          <ProgramResultCard key={program.name} program={program} />
        ))}
      </div>
    </div>
  );
}

function CastResultView({ data }: { data: CastResultData }) {
  if (!data.found || !data.cast) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        해당 이름의 출연자를 찾지 못한 검색 결과입니다.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-md justify-center">
      <CastResultCard cast={data.cast} />
    </div>
  );
}
