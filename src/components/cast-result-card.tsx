import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnrichedCastCard } from "@/lib/schemas/cast";

// DESIGN.md 1장 "예상 출연자 결과 영역": 출연작·화제성·호감도%·출처, 유튜브 출처 링크,
// 미확인 정보 배지·논란 구분 표시·교차 확인 여부(PLAN.md 작업 10), 해외 자료 원문+번역(작업 13).
export function CastResultCard({ cast }: { cast: EnrichedCastCard }) {
  const hasSentiment = cast.positiveRatio !== null && cast.negativeRatio !== null;
  const hasTranslation = cast.originalText || cast.koreanTranslation;

  return (
    <Card className="w-full max-w-md text-left">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{cast.name}</CardTitle>
          {cast.isUnconfirmed && <Badge variant="outline">미확인 정보</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div>
          <p className="font-medium">출연작</p>
          {cast.previousWorks.length > 0 ? (
            <ul className="list-disc pl-5 text-muted-foreground">
              {cast.previousWorks.map((work) => (
                <li key={work}>{work}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">정보 없음</p>
          )}
        </div>

        <div>
          <p className="font-medium">화제성</p>
          <p className="text-muted-foreground">{cast.topicality ?? "정보 없음"}</p>
        </div>

        <div>
          <p className="font-medium">호감도</p>
          {hasSentiment ? (
            <div className="flex flex-col gap-1">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${cast.positiveRatio}%` }}
                />
              </div>
              <p className="text-muted-foreground">
                긍정 {cast.positiveRatio}% · 부정 {cast.negativeRatio}%
              </p>
              {cast.sentimentBasis && (
                <p className="text-xs text-muted-foreground">{cast.sentimentBasis}</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">정보 없음</p>
          )}
        </div>

        {hasTranslation && (
          // DESIGN.md 1장: 해외 자료는 원문 요약과 한국어 번역을 함께 표시.
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            {cast.originalText && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">원문</p>
                <p className="text-muted-foreground">{cast.originalText}</p>
              </div>
            )}
            {cast.koreanTranslation && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">한국어 번역</p>
                <p>{cast.koreanTranslation}</p>
              </div>
            )}
          </div>
        )}

        {cast.controversies.length > 0 && (
          // PRD 5장 2) "논란·이슈성 정보는 출처와 함께 별도로 구분 표시" — 파란 계열 필드와 구분되게 경고 색으로 표시.
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="font-medium text-destructive">논란·이슈</p>
            <ul className="mt-1 flex flex-col gap-2">
              {cast.controversies.map((item) => (
                <li key={item.description}>
                  <p className="text-muted-foreground">{item.description}</p>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary underline underline-offset-2"
                    >
                      출처 보기
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="font-medium">출처</p>
          {cast.sourceUrls.length > 0 ? (
            <>
              <ul className="flex flex-col gap-1">
                {cast.sourceUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">
                {cast.crossVerified
                  ? "서로 다른 출처 3곳 이상 교차 확인됨"
                  : "출처가 3곳 미만이라 교차 확인이 충분하지 않을 수 있습니다"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">정보 없음</p>
          )}
        </div>

        {cast.youtubeUrls && cast.youtubeUrls.length > 0 && (
          <div>
            <p className="font-medium">유튜브 출처</p>
            <ul className="flex flex-col gap-1">
              {cast.youtubeUrls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    유튜브에서 보기
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
