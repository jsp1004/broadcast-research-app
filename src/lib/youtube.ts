import { getYoutubeApiKey } from "@/lib/env";

export interface YoutubeEngagement {
  videoCount: number;
  totalViewCount: number;
  totalCommentCount: number;
  videoUrls: string[];
}

// 화제성 지표를 보강하기 위한 참고 신호. 실패해도 리서치 전체를 막지 않도록 null을 반환한다(DESIGN.md 2장 3단계).
// videoUrls는 사용자가 실제로 유튜브 출처를 눌러 확인할 수 있도록 함께 담는다.
export async function getYoutubeEngagement(
  query: string,
): Promise<YoutubeEngagement | null> {
  try {
    const apiKey = getYoutubeApiKey();

    const searchParams = new URLSearchParams({
      key: apiKey,
      q: query,
      part: "id",
      type: "video",
      order: "relevance",
      maxResults: "5",
      relevanceLanguage: "ko",
    });
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    );
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };
    const videoIds = (searchData.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      return { videoCount: 0, totalViewCount: 0, totalCommentCount: 0, videoUrls: [] };
    }

    const statsParams = new URLSearchParams({
      key: apiKey,
      id: videoIds.join(","),
      part: "statistics",
    });
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${statsParams.toString()}`,
    );
    if (!statsRes.ok) return null;

    const statsData = (await statsRes.json()) as {
      items?: Array<{
        statistics?: { viewCount?: string; commentCount?: string };
      }>;
    };

    const totals = (statsData.items ?? []).reduce(
      (acc, item) => {
        acc.totalViewCount += Number(item.statistics?.viewCount ?? 0);
        acc.totalCommentCount += Number(item.statistics?.commentCount ?? 0);
        return acc;
      },
      { totalViewCount: 0, totalCommentCount: 0 },
    );

    return {
      videoCount: videoIds.length,
      ...totals,
      videoUrls: videoIds.map((id) => `https://www.youtube.com/watch?v=${id}`),
    };
  } catch {
    return null;
  }
}
