"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ProgramResultCard } from "@/components/program-result-card";
import { CastResultCard } from "@/components/cast-result-card";
import type { EnrichedProgramCard } from "@/lib/schemas/program";
import type { EnrichedCastCard } from "@/lib/schemas/cast";
import type { CastCandidate } from "@/lib/schemas/cast-candidates";

interface ProgramSearchResult {
  programs: EnrichedProgramCard[];
  foundCount: number;
  notFound: boolean;
  belowMinimum: boolean;
  missingCountryMix: boolean;
  isPartial: boolean;
  resultId: string | null;
}

interface CastSearchResult {
  found: boolean;
  cast: EnrichedCastCard | null;
  isPartial: boolean;
  resultId: string | null;
}

// DESIGN.md 1장 "메인 화면" 검색 영역: 유사 프로그램 검색 / 예상 출연자 리서치를 탭으로 구분.
export function SearchForm() {
  const [programQuery, setProgramQuery] = useState("");
  const [castQuery, setCastQuery] = useState("");

  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [programResult, setProgramResult] = useState<ProgramSearchResult | null>(null);
  const [programError, setProgramError] = useState<string | null>(null);

  const [isLoadingCast, setIsLoadingCast] = useState(false);
  const [castResult, setCastResult] = useState<CastSearchResult | null>(null);
  const [castError, setCastError] = useState<string | null>(null);
  const [castCandidates, setCastCandidates] = useState<CastCandidate[] | null>(null);

  function handleProgramSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runProgramSearch();
  }

  // 서버가 이미 최대 2회 자동 재시도까지 해본 뒤에도 실패한 상태라, 여기서는 사용자가
  // "다시 시도" 버튼으로 전체 요청을 한 번 더 새로 보내는 수동 재시도만 제공한다(PLAN.md 작업 12).
  async function runProgramSearch() {
    if (!programQuery.trim() || isLoadingPrograms) return;

    setIsLoadingPrograms(true);
    setProgramError(null);
    setProgramResult(null);

    try {
      const response = await fetch("/api/research/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: programQuery }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "리서치 결과를 가져오지 못했습니다.");
      }

      setProgramResult({
        programs: data.programs as EnrichedProgramCard[],
        foundCount: data.foundCount,
        notFound: data.notFound,
        belowMinimum: data.belowMinimum,
        missingCountryMix: data.missingCountryMix,
        isPartial: Boolean(data.isPartial),
        resultId: data.resultId ?? null,
      });
    } catch (error) {
      setProgramError(
        error instanceof Error ? error.message : "리서치 결과를 가져오지 못했습니다.",
      );
    } finally {
      setIsLoadingPrograms(false);
    }
  }

  function handleCastSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runCastSearch();
  }

  // PRD 5장 2) 동명이인 규칙: 1단계로 후보를 조회해 여러 명이면 사용자가 직접 고르게 하고,
  // 한 명뿐이거나 못 찾았으면 2단계(실제 리서치)로 바로 넘어간다.
  async function runCastSearch() {
    if (!castQuery.trim() || isLoadingCast) return;

    setIsLoadingCast(true);
    setCastError(null);
    setCastResult(null);
    setCastCandidates(null);

    try {
      const response = await fetch("/api/research/cast/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: castQuery }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "동명이인 확인에 실패했습니다.");
      }

      const candidates = data.candidates as CastCandidate[];
      if (candidates.length > 1) {
        setCastCandidates(candidates);
        setIsLoadingCast(false);
        return;
      }

      await researchCast(castQuery);
    } catch (error) {
      setCastError(
        error instanceof Error ? error.message : "리서치 결과를 가져오지 못했습니다.",
      );
      setIsLoadingCast(false);
    }
  }

  async function handleSelectCandidate(candidate: CastCandidate) {
    setCastCandidates(null);
    setIsLoadingCast(true);
    await researchCast(castQuery, candidate.distinguishingInfo);
  }

  async function researchCast(name: string, distinguishingInfo?: string) {
    try {
      const response = await fetch("/api/research/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, distinguishingInfo }),
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? "리서치 결과를 가져오지 못했습니다.");
      }

      setCastResult({
        found: data.found,
        cast: data.cast as EnrichedCastCard | null,
        isPartial: Boolean(data.isPartial),
        resultId: data.resultId ?? null,
      });
    } catch (error) {
      setCastError(
        error instanceof Error ? error.message : "리서치 결과를 가져오지 못했습니다.",
      );
    } finally {
      setIsLoadingCast(false);
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <Tabs defaultValue="program" className="items-center">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="program">유사 프로그램 검색</TabsTrigger>
          <TabsTrigger value="cast">예상 출연자 리서치</TabsTrigger>
        </TabsList>

        <TabsContent value="program" className="w-full max-w-md">
          <form onSubmit={handleProgramSubmit} className="flex flex-col gap-3">
            <Label htmlFor="program-query">장르 또는 키워드</Label>
            <div className="flex gap-2">
              <Input
                id="program-query"
                name="program-query"
                placeholder="예: 연애 리얼리티, 서바이벌 오디션"
                value={programQuery}
                onChange={(event) => setProgramQuery(event.target.value)}
              />
              <Button type="submit" disabled={isLoadingPrograms}>
                {isLoadingPrograms ? "검색 중..." : "검색"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="cast" className="w-full max-w-md">
          <form onSubmit={handleCastSubmit} className="flex flex-col gap-3">
            <Label htmlFor="cast-query">출연자명</Label>
            <div className="flex gap-2">
              <Input
                id="cast-query"
                name="cast-query"
                placeholder="예: 홍길동"
                value={castQuery}
                onChange={(event) => setCastQuery(event.target.value)}
              />
              <Button type="submit" disabled={isLoadingCast}>
                {isLoadingCast ? "검색 중..." : "검색"}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {programError && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-center text-sm text-destructive" role="alert">
            {programError}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={runProgramSearch}>
            다시 시도
          </Button>
        </div>
      )}

      {programResult?.notFound && (
        // PRD 5장 1) "검색어에 해당하는 유사 프로그램이 전혀 없으면" 규칙 — 프로그램 자체를 못 찾은 경우.
        <p className="mt-4 text-center text-sm text-muted-foreground" role="status">
          유사 프로그램을 찾지 못했습니다. 다른 장르나 키워드로 다시 검색해보세요.
        </p>
      )}

      {programResult && !programResult.notFound && (
        <div className="mt-6 w-full">
          {programResult.belowMinimum && (
            <p className="mb-3 text-center text-sm text-muted-foreground" role="status">
              관련 프로그램 {programResult.foundCount}건 확인됨
            </p>
          )}
          {programResult.missingCountryMix && (
            <p className="mb-3 text-center text-sm text-muted-foreground">
              이번 검색에는 국내 또는 해외 프로그램 중 한쪽만 포함되었습니다.
            </p>
          )}
          {programResult.isPartial && (
            // PRD 공통 규칙: 수집에 부분적으로 실패해도 이미 모인 결과는 표시하되, 부분 결과임을 안내.
            <p className="mb-3 text-center text-sm text-muted-foreground">
              일부 부가 정보(유튜브 관련 자료)는 수집하지 못했습니다. 부분 결과입니다.
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programResult.programs.map((program) => (
              <ProgramResultCard key={program.name} program={program} />
            ))}
          </div>
          {programResult.resultId && (
            // DESIGN.md "검색 결과 재열람": 고유 링크를 아는 사람만 다시 볼 수 있음.
            <p className="mt-4 text-center text-sm">
              <a
                href={`/result/${programResult.resultId}`}
                className="font-medium text-primary underline underline-offset-2"
              >
                이 결과 다시 보기 링크
              </a>
            </p>
          )}
        </div>
      )}

      {castError && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-center text-sm text-destructive" role="alert">
            {castError}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={runCastSearch}>
            다시 시도
          </Button>
        </div>
      )}

      {castCandidates && castCandidates.length > 1 && (
        // DESIGN.md 1장 "동명이인 선택 화면": 결과 카드 대신 후보 목록을 먼저 보여주고 사용자가 선택.
        <div className="mt-6 flex w-full max-w-md flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            동명이인이 여러 명 확인되었습니다. 찾으시는 분을 선택해주세요.
          </p>
          {castCandidates.map((candidate) => (
            <Button
              key={`${candidate.name}-${candidate.distinguishingInfo}`}
              type="button"
              variant="outline"
              className="h-auto justify-start whitespace-normal py-2 text-left"
              onClick={() => handleSelectCandidate(candidate)}
            >
              <span className="font-medium">{candidate.name}</span>
              <span className="ml-2 text-muted-foreground">
                {candidate.distinguishingInfo}
              </span>
            </Button>
          ))}
        </div>
      )}

      {castResult && !castResult.found && (
        <p className="mt-4 text-center text-sm text-muted-foreground" role="status">
          해당 이름의 출연자를 찾지 못했습니다. 이름을 다시 확인해보세요.
        </p>
      )}

      {castResult?.found && castResult.cast && (
        <div className="mt-6 flex w-full flex-col items-center gap-3">
          {castResult.isPartial && (
            <p className="text-center text-sm text-muted-foreground">
              일부 부가 정보(유튜브 관련 자료)는 수집하지 못했습니다. 부분 결과입니다.
            </p>
          )}
          <CastResultCard cast={castResult.cast} />
          {castResult.resultId && (
            <a
              href={`/result/${castResult.resultId}`}
              className="text-sm font-medium text-primary underline underline-offset-2"
            >
              이 결과 다시 보기 링크
            </a>
          )}
        </div>
      )}
    </div>
  );
}
