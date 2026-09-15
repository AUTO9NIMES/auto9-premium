import duo from "../_data/duo";
import interior from "../_data/interior";
import exterior from "../_data/exterior";

const videos = {
  duo,
  interior,
  exterior,
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const encoded = videos[slug as keyof typeof videos];

  if (!encoded) {
    return new Response("Not found", { status: 404 });
  }

  const video = Buffer.from(encoded, "base64");
  const range = request.headers.get("range");
  const commonHeaders = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);

    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : video.length - 1;

      if (start <= end && start >= 0 && end < video.length) {
        const chunk = video.subarray(start, end + 1);

        return new Response(chunk, {
          status: 206,
          headers: {
            ...commonHeaders,
            "Content-Range": `bytes ${start}-${end}/${video.length}`,
            "Content-Length": String(chunk.length),
          },
        });
      }
    }
  }

  return new Response(video, {
    headers: {
      ...commonHeaders,
      "Content-Length": String(video.length),
    },
  });
}
