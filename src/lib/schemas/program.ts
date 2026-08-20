import { z } from "zod";

// DESIGN.md 1장 "유사 프로그램 결과 영역" 카드 필드에 대응하는 스키마.
// format/topicality/successStatus는 null이면 "정보 없음"(항목 자체는 찾았지만 해당 값만 확인 불가)을 의미한다.
export const ProgramCardSchema = z.object({
  name: z.string(),
  country: z.enum(["domestic", "international"]),
  format: z.string().nullable(),
  topicality: z.string().nullable(),
  successStatus: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  isUnconfirmed: z.boolean(),
  originalText: z.string().nullable().optional(),
  koreanTranslation: z.string().nullable().optional(),
});

export const ProgramResearchResponseSchema = z.object({
  foundCount: z.number().int().min(0),
  programs: z.array(ProgramCardSchema),
});

export type ProgramCard = z.infer<typeof ProgramCardSchema>;
export type ProgramResearchResponse = z.infer<typeof ProgramResearchResponseSchema>;

// OpenAI 응답에는 없고, 서버에서 유튜브 데이터를 보강한 뒤에만 채워지는 필드라 별도 타입으로 둔다.
export type EnrichedProgramCard = ProgramCard & { youtubeUrls?: string[] };

export const MIN_RECOMMENDED_PROGRAMS = 5;
export const MAX_PROGRAMS = 10;
