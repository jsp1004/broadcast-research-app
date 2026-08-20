import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnrichedProgramCard } from "@/lib/schemas/program";

// DESIGN.md 1장 "유사 프로그램 결과 영역": 프로그램명·국내외 배지, 포맷, 화제성, 성공 여부, 출처,
// 미확인 정보 배지, 항목별 "정보 없음" 표시(PLAN.md 작업 7), 유튜브 출처 링크, 해외 원문+번역(작업 13).
export function ProgramResultCard({ program }: { program: EnrichedProgramCard }) {
  const hasTranslation =
    program.country === "international" && (program.originalText || program.koreanTranslation);

  return (
    <Card className="text-left">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{program.name}</CardTitle>
          <div className="flex gap-2">
            <Badge variant={program.country === "domestic" ? "default" : "secondary"}>
              {program.country === "domestic" ? "국내" : "해외"}
            </Badge>
            {program.isUnconfirmed && <Badge variant="outline">미확인 정보</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <Field label="포맷" value={program.format} />
        <Field label="화제성" value={program.topicality} />
        <Field label="성공 여부" value={program.successStatus} />

        {hasTranslation && (
          // DESIGN.md 1장: 해외 프로그램은 원문 요약과 한국어 번역을 함께 표시.
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            {program.originalText && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">원문</p>
                <p className="text-muted-foreground">{program.originalText}</p>
              </div>
            )}
            {program.koreanTranslation && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">한국어 번역</p>
                <p>{program.koreanTranslation}</p>
              </div>
            )}
          </div>
        )}

        {program.sourceUrl ? (
          <a
            href={program.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            출처 보기
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">출처: 정보 없음</p>
        )}

        {program.youtubeUrls && program.youtubeUrls.length > 0 && (
          <div>
            <p className="font-medium">유튜브 출처</p>
            <ul className="flex flex-col gap-1">
              {program.youtubeUrls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline underline-offset-2"
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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{value ?? "정보 없음"}</p>
    </div>
  );
}
