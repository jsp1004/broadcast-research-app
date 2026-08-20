import { NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai";

// PLAN.md 작업 2: OpenAI API 키가 .env에서 정상적으로 로딩되고 실제로 인증되는지 확인하는 헬스체크.
// 키 값 자체는 절대 응답에 포함하지 않는다.
export async function GET() {
  try {
    const client = getOpenAiClient();
    await client.models.list();
    return NextResponse.json({ ok: true, message: "OpenAI API 키 연동 확인됨" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI API 연동 확인 중 알 수 없는 오류";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
