import { getSupabaseClient, type Json } from "@/lib/supabase";

// PLAN.md 작업 11: DESIGN.md 3장 `research_results` 스키마에 검색 결과를 저장.
// 실패해도 사용자에게 보여줄 리서치 결과 자체는 이미 만들어졌으므로, 저장 실패는 막지 않고 id 없이 진행한다.
export async function saveResearchResult(params: {
  type: "program" | "cast";
  query: string;
  resultData: unknown;
  isPartial?: boolean;
  selectedPerson?: string | null;
}): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("research_results")
      .insert({
        type: params.type,
        query: params.query,
        result_data: params.resultData as Json,
        is_partial: params.isPartial ?? false,
        selected_person: params.selectedPerson ?? null,
      })
      .select("id")
      .single();

    if (error) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}
