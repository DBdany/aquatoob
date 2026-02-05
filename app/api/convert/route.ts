import { NextRequest } from "next/server";
import { downloadVideo, createFileStream } from "@/lib/ytdlp";
import { stat } from "fs/promises";

function isValidYouTubeURL(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/.test(
    url.trim()
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, format, quality, title } = body;

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isValidYouTubeURL(url)) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (format !== "mp3" && format !== "mp4") {
      return new Response(
        JSON.stringify({ error: "Format must be mp3 or mp4" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validQualities = ["360", "480", "720", "1080"];
    const selectedQuality =
      format === "mp4" && validQualities.includes(quality) ? quality : "720";

    const result = await downloadVideo(url, format, selectedQuality, title);
    const fileStat = await stat(result.filePath);
    const fileStream = createFileStream(result.filePath);

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        fileStream.on("end", () => {
          controller.close();
          result.cleanup();
        });
        fileStream.on("error", (err) => {
          controller.error(err);
          result.cleanup();
        });
      },
      cancel() {
        fileStream.destroy();
        result.cleanup();
      },
    });

    return new Response(webStream, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
        "Content-Length": fileStat.size.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Conversion failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
