// PLAN.md 작업 12 / PRD 공통 규칙: 데이터 수집 실패 시 최대 2회까지 자동 재시도.
// maxRetries=2 → 최초 시도 포함 최대 3번 시도한다.
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
