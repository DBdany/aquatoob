import { spawn } from "child_process";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { createReadStream, unlink } from "fs";
import { stat } from "fs/promises";

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  durationFormatted: string;
  uploader: string;
}

export interface DownloadResult {
  filePath: string;
  filename: string;
  mimeType: string;
  cleanup: () => void;
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const args = ["--dump-json", "--no-download", "--no-warnings", "--no-playlist", url];

    const proc = spawn("yt-dlp", args, {
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` },
    });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || "Failed to fetch video info"));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        resolve({
          title: info.title || "Unknown Title",
          thumbnail: info.thumbnail || "",
          duration: info.duration || 0,
          durationFormatted: formatDuration(info.duration || 0),
          uploader: info.uploader || info.channel || "Unknown",
        });
      } catch {
        reject(new Error("Failed to parse video info"));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

export async function downloadVideo(
  url: string,
  format: "mp3" | "mp4",
  quality: string,
  title?: string
): Promise<DownloadResult> {
  const tempDir = tmpdir();
  const fileId = randomUUID();
  const ext = format;
  const outputTemplate = join(tempDir, `aquatube-${fileId}.%(ext)s`);

  const args: string[] = [];

  if (format === "mp3") {
    args.push(
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "-o",
      outputTemplate,
      "--no-warnings",
      "--no-playlist",
      url
    );
  } else {
    const formatSpec = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`;
    args.push(
      "-f",
      formatSpec,
      "--merge-output-format",
      "mp4",
      "-o",
      outputTemplate,
      "--no-warnings",
      "--no-playlist",
      url
    );
  }

  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", args, {
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` },
    });
    let stderr = "";

    // gotta drain stdout or the process hangs when buffer fills
    proc.stdout.on("data", () => {});

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(stderr || "Download failed"));
        return;
      }

      const expectedPath = join(tempDir, `aquatube-${fileId}.${ext}`);

      try {
        await stat(expectedPath);

        const safeTitle = title ? sanitizeFilename(title) : "video";
        const filename = `${safeTitle}.${ext}`;
        const mimeType = format === "mp3" ? "audio/mpeg" : "video/mp4";

        resolve({
          filePath: expectedPath,
          filename,
          mimeType,
          cleanup: () => {
            unlink(expectedPath, () => {});
          },
        });
      } catch {
        reject(new Error("Output file not found after download"));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
}

export function createFileStream(filePath: string) {
  return createReadStream(filePath);
}
