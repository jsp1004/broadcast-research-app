import { z } from "zod";

// DESIGN.md 1장 "예상 출연자 결과 영역" 종합 요약 카드 필드에 대응하는 스키마.
// 동명이인 2단계 흐름·36개월/교차확인 강제 검증은 PLAN.md 작업 10에서 이어서 다룬다.
export const ControversySchema = z.object({
  description: z.string(),
  sourceUrl: z.string().nullable(),
});

export const CastCardSchema = z.object({
  name: z.string(),
  previousWorks: z.array(z.string()),
  topicality: z.string().nullable(),
  positiveRatio: z.number().min(0).max(100).nullable(),
  negativeRatio: z.number().min(0).max(100).nullable(),
  sentimentBasis: z.string().nullable(),
  controversies: z.array(ControversySchema),
  sourceUrls: z.array(z.string()),
  isUnconfirmed: z.boolean(),
  originalText: z.string().nullable().optional(),
  koreanTranslation: z.string().nullable().optional(),
});

export const CastResearchResponseSchema = z.object({
  found: z.boolean(),
  cast: CastCardSchema.nullable(),
});

export type Controversy = z.infer<typeof ControversySchema>;
export type CastCard = z.infer<typeof CastCardSchema>;
export type CastResearchResponse = z.infer<typeof CastResearchResponseSchema>;

// OpenAI 응답에는 없고, 서버가 직접 계산해서 붙이는 필드라 별도 타입으로 둔다.
// crossVerified: 서로 다른 출처 3곳 이상을 실제로 확보했는지 서버가 판정한 결과(PLAN.md 작업 10).
export type EnrichedCastCard = CastCard & {
  youtubeUrls?: string[];
  crossVerified?: boolean;
};
