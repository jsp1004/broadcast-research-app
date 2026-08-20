// 서버 전용 환경변수 로딩/검증 헬퍼. 값은 절대 로그로 출력하지 않는다(CLAUDE.md 규칙).
function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`.env에 ${name} 값이 없습니다. .env 파일을 확인해주세요.`);
  }
  return value;
}

export function getOpenAiApiKey(): string {
  return readRequiredEnv("OPENAI_API_KEY");
}

export function getSupabaseUrl(): string {
  return readRequiredEnv("SUPABASE_URL");
}

export function getSupabaseServiceRoleKey(): string {
  return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getYoutubeApiKey(): string {
  return readRequiredEnv("YOUTUBE_API_KEY");
}
