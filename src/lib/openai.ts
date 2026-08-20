import OpenAI from "openai";
import { getOpenAiApiKey } from "@/lib/env";

let client: OpenAI | null = null;

// 서버 컴포넌트/API Route에서만 사용. 클라이언트 번들에 키가 노출되지 않도록 여기서만 인스턴스를 만든다.
export function getOpenAiClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAiApiKey() });
  }
  return client;
}
