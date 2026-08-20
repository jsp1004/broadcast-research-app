import { NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai";
import { withRetry } from "@/lib/with-retry";
import { CastCandidatesResponseSchema } from "@/lib/schemas/cast-candidates";

// PLAN.md 작업 10·12: 동명이인 후보 조회 API (2단계 흐름의 1단계) + 공통 예외 처리.
// PRD 5장 2) "동명이인이 여러 명 검색되면 임의로 한 명을 특정하지 않고, 소속사·활동 분야 등
// 구분 정보와 함께 사용자가 선택하게 함" 규칙을 위한 전용 엔드포인트.
// 최대 2회까지 자동 재시도한다(PRD 공통 규칙).
const SYSTEM_PROMPT = `당신은 방송 프로그램 기획자를 돕는 리서치 도우미입니다.
사용자가 입력한 이름으로 활동하는 방송·연예계 인물이 서로 다른 사람으로 여러 명 존재하는지 웹 검색으로 확인하세요.

규칙:
- 명백히 한 명만 활동 중이거나 검색 결과가 없으면 candidates를 빈 배열로 응답한다.
- 서로 다른 사람이 2명 이상 확인되면, 각 인물의 이름과 소속사·활동 분야 등 구분 정보(distinguishingInfo)를 최대 5명까지 candidates 배열에 담는다.
- 확실하지 않은 추측으로 동명이인을 만들어내지 않는다.

JSON 스키마:
{ "candidates": [{ "name": string, "distinguishingInfo": string }] }

다른 설명 없이 JSON 객체만 출력하세요.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "출연자명을 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const parsed = await withRetry(async () => {
      const client = getOpenAiClient();
      const response = await client.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `이름: ${name}` },
        ],
      });

      const parsedJson = JSON.parse(extractJsonText(response.output_text));
      return CastCandidatesResponseSchema.parse(parsedJson);
    });

    return NextResponse.json({ ok: true, candidates: parsed.candidates });
  } catch {
    // 동명이인 확인 자체가 실패해도, 사용자 입장에서는 "일단 검색은 계속 되어야" 하므로
    // 후보 없음(candidates: [])으로 응답해 2단계 흐름을 건너뛰고 바로 본 리서치로 넘어가게 한다.
    return NextResponse.json({
      ok: true,
      candidates: [],
      candidateCheckFailed: true,
    });
  }
}

function extractJsonText(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
