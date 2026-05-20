import { SourcererOutput, makeSourcerer } from "@/providers/base";
import { MovieScrapeContext, ShowScrapeContext } from "@/utils/context";
import { NotFoundError } from "@/utils/errors";

const XPRIME_BASE = "https://backend.xprime.tv/finger";

async function comboScraper(
  ctx: ShowScrapeContext | MovieScrapeContext,
): Promise<SourcererOutput> {
  ctx.progress(10);

  const query: Record<string, string> = {
    name: ctx.media.title,
    year: String(ctx.media.releaseYear),
    id: ctx.media.tmdbId,
    imdb: ctx.media.imdbId ?? "",
  };

  if (ctx.media.type === "show") {
    query.season = String(ctx.media.season.number);
    query.episode = String(ctx.media.episode.number);
  }

  ctx.progress(30);

  const data = await ctx.proxiedFetcher<any>(XPRIME_BASE, {
    query,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
      "Origin": "https://pstream.net",
      "Referer": "https://pstream.net/",
    },
  });

  ctx.progress(60);

  if (!data || data.status !== "ok" || !data.streams) {
    throw new NotFoundError("No streams found");
  }

  ctx.progress(80);

  const streams: SourcererOutput["stream"] = [];

  if (data.streams.AUTO?.url) {
    streams.push({
      id: "auto",
      type: "hls",
      playlist: data.streams.AUTO.url,
      captions: [],
      flags: [],
      headers: {
        "Origin": "https://pstream.net",
        "Referer": "https://pstream.net/",
      },
    });
  }

  if (data.streams.ORG?.url) {
    streams.push({
      id: "org",
      type: "file",
      qualities: {
        unknown: {
          type: "mp4",
          url: data.streams.ORG.url,
        },
      },
      captions: [],
      flags: [],
      headers: {
        "Origin": "https://pstream.net",
        "Referer": "https://pstream.net/",
      },
    });
  }

  if (streams.length === 0) throw new NotFoundError("No valid streams found");

  ctx.progress(90);

  return {
    embeds: [],
    stream: streams,
  };
}

export const xprimeScraper = makeSourcerer({
  id: "xprime",
  name: "Finger API",
  rank: 290,
  disabled: false,
  flags: [],
  scrapeMovie: comboScraper,
  scrapeShow: comboScraper,
});