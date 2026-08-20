import { SearchForm } from "@/components/search-form";

// DESIGN.md 1장 "메인 화면(`/`)": 상단 소개 + 검색 영역(유사 프로그램/출연자 탭).
// DESIGN.md 5장 비주얼 스타일 가이드: 데스크톱 중심 레이아웃, 넉넉한 여백.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <main className="flex w-full max-w-4xl flex-col items-center gap-8 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">방송 리서치 도우미</h1>
          <p className="max-w-md text-muted-foreground">
            장르·출연자를 입력하면 국내외 유사 프로그램 사례와 출연자 평판을 AI가 자동으로 정리해드립니다.
          </p>
        </div>

        <SearchForm />
      </main>
    </div>
  );
}
