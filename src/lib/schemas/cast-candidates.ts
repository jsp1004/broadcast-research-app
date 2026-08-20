import { z } from "zod";

// PRD 5장 2) "동명이인 발견 시 임의로 특정하지 않고 구분 정보와 함께 사용자가 선택하게 함" 규칙을 위한 스키마.
export const CastCandidateSchema = z.object({
  name: z.string(),
  distinguishingInfo: z.string(),
});

export const CastCandidatesResponseSchema = z.object({
  candidates: z.array(CastCandidateSchema),
});

export type CastCandidate = z.infer<typeof CastCandidateSchema>;
export type CastCandidatesResponse = z.infer<typeof CastCandidatesResponseSchema>;
