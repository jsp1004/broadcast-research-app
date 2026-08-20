import { NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai";
import { getYoutubeEngagement } from "@/lib/youtube";
import { saveResearchResult } from "@/lib/research-storage";
import { withRetry } from "@/lib/with-retry";
import { CastResearchResponseSchema } from "@/lib/schemas/cast";

// PLAN.md 작업 8·10·12: 예상 출연자 리서치 백엔드 API + 규칙 적용 + 공통 예외 처리.
// PRD 5장 2) 규칙을 시스템 프롬프트로 전달한다. 36개월 범위·신뢰 출처 우선은 프롬프트로 지시하고,
// 서로 다른 출처 3곳 교차 확인 여부는 모델의 자기 보고를 믿지 않고 서버에서 sourceUrls 개수로 직접 판정한다.
// 동명이인 2단계 흐름은 distinguishingInfo로 이어받는다(1단계는 /api/research/cast/candidates).
// 핵심 수집 단계(OpenAI 호출+파싱+검증)는 최대 2회까지 자동 재시도한다(PRD 공통 규칙).
const SYSTEM_PROMPT = `당신은 방송 프로그램 기획자를 돕는 리서치 도우미입니다.
사용자가 입력한 출연자 이름의 이전 출연작, 화제성, 호감도를 웹 검색(뉴스·커뮤니티·SNS)으로 조사해 아래 JSON 형식으로만 답하세요.

규칙:
- 최근 36개월 이내 자료를 우선 참고한다. 36개월보다 오래된 자료만 있다면 topicality에 "최근 36개월 이내 자료 없음, ○○년 자료 기준"처럼 명시한다.
- name(출연자명)은 한글 이름으로 적는다(예: 외국 활동명이나 로마자 표기 대신 널리 쓰이는 한글 이름 사용).
- 긍정/부정 언급 비율을 positiveRatio, negativeRatio에 0~100 사이 숫자(%)로 제시한다. 판단 근거(수집한 댓글·게시물 수 등)는 sentimentBasis에 적는다.
- 서로 다른 출처를 최소 3곳 이상 실제로 참고한 뒤 정리하고, sourceUrls에 실제 참고한 출처 링크(요약용 인용 코드가 아닌 진짜 URL)를 모두 담는다. 3곳을 채우지 못하면 찾은 만큼만 담는다.
- 공식 언론사·검증된 커뮤니티 등 신뢰 가능한 출처를 우선한다. 출처가 불분명한 루머성 정보는 isUnconfirmed를 true로 표시한다.
- 논란·이슈성 정보는 controversies 배열에 출처와 함께 별도로 담는다. 논란이 없으면 빈 배열로 둔다.
- 확인되지 않는 값은 지어내지 말고 null로 둔다("정보 없음"으로 처리됨).
- 해외 활동 관련 자료는 originalText(원문 요약)와 koreanTranslation(한국어 번역)을 함께 채운다.
- 검색 결과 해당 이름의 인물을 전혀 찾지 못하면 found를 false로, cast를 null로 응답한다.
- 별도로 구분 정보(distinguishingInfo)가 전달되면, 그 구분 정보에 해당하는 인물만 리서치한다(동명이인 중 사용자가 선택한 인물).

JSON 스키마:
{
  "found": boolean,
  "cast": {
    "name": string,
    "previousWorks": string[],
    "topicality": string | null,
    "positiveRatio": number | null,
    "negativeRatio": number | null,
    "sentimentBasis": string | null,
    "controversies": [{ "description": string, "sourceUrl": string | null }],
    "sourceUrls": string[],
    "isUnconfirmed": boolean,
    "originalText": string | null,
    "koreanTranslation": string | null
  } | null
}

다른 설명 없이 JSON 객체만 출력하세요.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: string; distinguishingInfo?: string }
    | null;
  const name = body?.name?.trim();
  const distinguishingInfo = body?.distinguishingInfo?.trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "출연자명을 입력해주세요." },
      { status: 400 },
    );
  }

  let parsed;
  try {
    // 핵심 수집(OpenAI 웹 검색 + JSON 파싱 + Zod 검증)이 실패하면 최대 2회까지 자동 재시도.
    parsed = await withRetry(async () => {
      const client = getOpenAiClient();
      const userContent = distinguishingInfo
        ? `출연자명: ${name}\n구분 정보(동명이인 중 이 사람만 조사): ${distinguishingInfo}`
        : `출연자명: ${name}`;
      const response = await client.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      });

      const parsedJson = JSON.parse(extractJsonText(response.output_text));
      return CastResearchResponseSchema.parse(parsedJson);
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "예상 출연자 리서치에 반복적으로 실패했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 502 },
    );
  }

  if (!parsed.found || !parsed.cast) {
    // 찾은 정보가 없으면 다시 열람할 결과가 없으므로 저장하지 않는다.
    return NextResponse.json({ ok: true, found: false, cast: null });
  }

  // 서로 다른 출처 3곳 교차 확인 여부는 모델의 자기 보고를 믿지 않고, 실제로 담아온 고유 출처 URL 개수로 서버가 직접 판정한다.
  const uniqueSourceCount = new Set(parsed.cast.sourceUrls).size;
  const crossVerified = uniqueSourceCount >= 3;

  // 유튜브 댓글 데이터로 호감도 산출 근거를 보강하고, 실제 영상 링크도 출처로 볼 수 있게 함께 담는다(DESIGN.md 2장 3단계).
  // 보조 데이터라 실패해도 리서치 자체는 유지하되, 실패하면 부분 결과로 표시한다(PLAN.md 작업 12).
  const engagement = await getYoutubeEngagement(parsed.cast.name);
  const isPartial = !engagement;
  const sentimentBasis =
    engagement && parsed.cast.sentimentBasis
      ? `${parsed.cast.sentimentBasis} (유튜브 관련 영상 ${engagement.videoCount}건, 댓글 ${engagement.totalCommentCount}개 참고)`
      : parsed.cast.sentimentBasis;
  const cast = {
    ...parsed.cast,
    sentimentBasis,
    crossVerified,
    youtubeUrls: engagement?.videoUrls,
  };

  // PLAN.md 작업 11: 검증된 결과를 Supabase에 저장. 저장이 실패해도 사용자에게 결과는 그대로 보여준다.
  const resultId = await saveResearchResult({
    type: "cast",
    query: name,
    resultData: { found: true, cast, isPartial },
    isPartial,
    selectedPerson: distinguishingInfo ?? null,
  });

  return NextResponse.json({ ok: true, resultId, found: true, isPartial, cast });
}

// 모델이 코드블록(```json ... ```)으로 감싸 응답하는 경우까지 대비해 JSON 부분만 추출한다.
function extractJsonText(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
