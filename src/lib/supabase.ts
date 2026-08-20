import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";

// jsonb 컬럼에 넣을 수 있는 값의 범위(Supabase가 요구하는 Json 타입과 동일한 모양).
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// supabase/migrations의 research_results 테이블 구조에 대응하는 최소 타입 정의.
// 이 타입을 createClient에 넘겨줘야 .from("research_results").insert(...) 등에서 타입 추론이 된다.
// Tables/Views/Functions, Relationships까지 다 있어야 postgrest-js의 GenericSchema 제약을 만족한다
// (하나라도 빠지면 조용히 모든 쿼리 타입이 never로 무너진다).
export interface Database {
  public: {
    Tables: {
      research_results: {
        Row: {
          id: string;
          type: "program" | "cast";
          query: string;
          result_data: Json;
          is_partial: boolean;
          selected_person: string | null;
          searched_at: string;
        };
        Insert: {
          id?: string;
          type: "program" | "cast";
          query: string;
          result_data: Json;
          is_partial?: boolean;
          selected_person?: string | null;
          searched_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["research_results"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

let client: ReturnType<typeof createClient<Database>> | null = null;

// service_role 키는 RLS를 우회하는 강한 권한이라 서버(API Route)에서만 사용하고,
// 클라이언트 번들에는 절대 포함하지 않는다.
export function getSupabaseClient() {
  if (!client) {
    client = createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey());
  }
  return client;
}
