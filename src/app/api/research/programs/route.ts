import { NextResponse } from "next/server";
import { getOpenAiClient } from "@/lib/openai";
import { getYoutubeEngagement } from "@/lib/youtube";
import { saveResearchResult } from "@/lib/research-storage";
import { withRetry } from "@/lib/with-retry";
import {
  MAX_PROGRAMS,
  MIN_RECOMMENDED_PROGRAMS,
  ProgramResearchResponseSchema,
} from "@/lib/schemas/program";

// PLAN.md 작업 5·7·12: 유사 프로그램 리서치 백엔드 API + 규칙 적용 + 공통 예외 처리.
// PRD 5장 1) 규칙을 시스템 프롬프트로 전달하고, 응답을 Zod로 구조 검증한 뒤
// 개수 제한·5건 미만 안내·정보 없음/결과 없음 구분은 서버에서 직접 계산해 신뢰도를 확보한다(모델의 자기 보고값을 그대로 믿지 않음).
// 핵심 수집 단계(OpenAI 호출+파싱+검증)는 최대 2회까지 자동 재시도한다(PRD 공통 규칙).
const SYSTEM_PROMPT = `당신은 방송 프로그램 기획자를 돕는 리서치 도우미입니다.
사용자가 입력한 장르/키워드와 유사한 국내외 방송 프로그램을 웹 검색으로 찾아 아래 JSON 형식으로만 답하세요.

규칙:
- 결과는 최대 10개까지 담는다. 관련 프로그램을 5개 이상 찾지 못했다면 억지로 채우지 말고 실제로 찾은 만큼만 담는다.
- 국내(domestic) 프로그램과 해외(international) 프로그램을 각각 최소 1개 이상 포함한다.
- name(프로그램명) 표기 언어: 국내(domestic) 프로그램은 한글 정식 명칭으로 적는다(예: "Running Man"이 아니라 "런닝맨"). 해외(international) 프로그램은 영어 명칭으로 적는다.
- 각 프로그램마다 출처 링크(sourceUrl)를 반드시 포함한다. 출처를 찾을 수 없으면 sourceUrl을 null로 두고 isUnconfirmed를 true로 표시한다.
- format/topicality/successStatus 중 확인되지 않는 값이 있으면 지어내지 말고 null로 둔다("정보 없음"으로 처리됨).
- 공식 언론사·검증된 커뮤니티 등 신뢰 가능한 출처를 우선한다. 출처가 불분명한 루머성 정보는 isUnconfirmed를 true로 표시한다.
- 해외(international) 프로그램은 originalText(원문 요약)와 koreanTranslation(한국어 번역)을 함께 채운다.

JSON 스키마:
{
  "foundCount": number,
  "programs": [
    {
      "name": string,
      "country": "domestic" | "international",
      "format": string | null,
      "topicality": string | null,
      "successStatus": string | null,
      "sourceUrl": string | null,
      "isUnconfirmed": boolean,
      "originalText": string | null,
      "koreanTranslation": string | null
    }
  ]
}

다른 설명 없이 JSON 객체만 출력하세요.`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const query = body?.query?.trim();

  if (!query) {
    return NextResponse.json(
      { ok: false, message: "장르/키워드를 입력해주세요." },
      { status: 400 },
    );
  }

  let parsed;
  try {
    // 핵심 수집(OpenAI 웹 검색 + JSON 파싱 + Zod 검증)이 실패하면 최대 2회까지 자동 재시도.
    parsed = await withRetry(async () => {
      const client = getOpenAiClient();
      const response = await client.responses.create({
        model: "gpt-4.1",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `장르/키워드: ${query}` },
        ],
      });

      const parsedJson = JSON.parse(extractJsonText(response.output_text));
      return ProgramResearchResponseSchema.parse(parsedJson);
    });
  } catch {
    // 재시도까지 모두 실패하면 오류 안내 + (프런트에서) 재시도 버튼을 보여준다. 부분 결과가 없으니 그대로 실패 응답.
    return NextResponse.json(
      {
        ok: false,
        message: "유사 프로그램 리서치에 반복적으로 실패했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 502 },
    );
  }

  // foundCount·개수 제한은 모델의 자기 보고값을 신뢰하지 않고 서버에서 직접 계산한다.
  const programs = parsed.programs.slice(0, MAX_PROGRAMS);
  const foundCount = programs.length;
  const notFound = foundCount === 0; // 프로그램 자체를 못 찾은 경우 (결과 없음)
  const belowMinimum = foundCount > 0 && foundCount < MIN_RECOMMENDED_PROGRAMS;
  const hasDomestic = programs.some((program) => program.country === "domestic");
  const hasInternational = programs.some((program) => program.country === "international");
  const missingCountryMix = foundCount > 0 && (!hasDomestic || !hasInternational);

  // 유튜브 댓글 데이터로 화제성 지표를 보강하고, 실제 영상 링크도 출처로 볼 수 있게 함께 담는다(DESIGN.md 2장 3단계).
  // 보조 데이터라 실패해도 리서치 자체는 유지하되, 하나라도 실패하면 부분 결과로 표시한다(PLAN.md 작업 12).
  let youtubeEnrichmentFailed = false;
  const enriched = await Promise.all(
    programs.map(async (program) => {
      const engagement = await getYoutubeEngagement(program.name);
      if (!engagement) {
        youtubeEnrichmentFailed = true;
        return program;
      }

      const topicality = program.topicality
        ? `${program.topicality} (유튜브 관련 영상 ${engagement.videoCount}건, 댓글 ${engagement.totalCommentCount}개 참고)`
        : program.topicality;

      return {
        ...program,
        topicality,
        youtubeUrls: engagement.videoUrls,
      };
    }),
  );
  const isPartial = !notFound && youtubeEnrichmentFailed;

  const responseBody = {
    foundCount,
    notFound,
    belowMinimum,
    missingCountryMix,
    isPartial,
    programs: enriched,
  };

  // PLAN.md 작업 11: 검증된 결과를 Supabase에 저장. 찾은 프로그램이 없으면 다시 열람할 결과가 없으므로 저장하지 않는다.
  // 저장이 실패해도 사용자에게 결과는 그대로 보여준다.
  const resultId = notFound
    ? null
    : await saveResearchResult({
        type: "program",
        query,
        resultData: responseBody,
        isPartial,
      });

  return NextResponse.json({ ok: true, resultId, ...responseBody });
}

// 모델이 코드블록(```json ... ```)으로 감싸 응답하는 경우까지 대비해 JSON 부분만 추출한다.
function extractJsonText(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
