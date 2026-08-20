import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

// PLAN.md 작업 3: Supabase 프로젝트 연결과 research_results 테이블 접근이 정상인지 확인하는 헬스체크.
// 키 값 자체는 절대 응답에 포함하지 않는다.
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { error, count } = await supabase
      .from("research_results")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      message: "Supabase 연결 및 research_results 테이블 확인됨",
      rowCount: count ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase 연동 확인 중 알 수 없는 오류";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
