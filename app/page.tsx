"use client";

import { useState, useEffect, useCallback, DragEvent, KeyboardEvent } from "react";

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration: number;
  durationFormatted: string;
  uploader: string;
}

type Format = "mp4" | "mp3";
type Quality = "360" | "480" | "720" | "1080";
type Status = "idle" | "fetching" | "converting" | "done" | "error";

function isValidYouTubeURL(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/.test(
    url.trim()
  );
}

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function GlassOrbs() {
  const [orbs, setOrbs] = useState<
    Array<{ id: number; size: number; left: number; duration: number; delay: number }>
  >([]);

  useEffect(() => {
    const newOrbs = Array.from({ length: 16 }, (_, i) => ({
      id: i,
      size: Math.random() * 50 + 15,
      left: Math.random() * 100,
      duration: Math.random() * 14 + 12,
      delay: Math.random() * 18,
    }));
    setOrbs(newOrbs);
  }, []);

  return (
    <div className="bubbles">
      {orbs.map((b) => (
        <div
          key={b.id}
          className="bubble"
          style={{
            width: `${b.size}px`,
            height: `${b.size}px`,
            left: `${b.left}%`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function LightRays() {
  return (
    <div className="light-rays">
      <div className="light-ray" />
      <div className="light-ray" />
      <div className="light-ray" />
      <div className="light-ray" />
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<Format>("mp4");
  const [quality, setQuality] = useState<Quality>("720");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setError("");
    } catch {

    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      setUrl(text);
      setError("");
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!url.trim()) return;

    if (!isValidYouTubeURL(url)) {
      setError("That doesn't look like a valid YouTube URL.");
      return;
    }

    setError("");
    setStatus("fetching");
    setVideoInfo(null);

    try {
      const infoRes = await fetch("/api/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!infoRes.ok) {
        const data = await infoRes.json();
        throw new Error(data.error || "Failed to fetch video info");
      }

      const info: VideoInfo = await infoRes.json();
      setVideoInfo(info);
      setStatus("converting");

      const convertRes = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format, quality, title: info.title }),
      });

      if (!convertRes.ok) {
        const data = await convertRes.json();
        throw new Error(data.error || "Conversion failed");
      }

      const disposition = convertRes.headers.get("Content-Disposition");
      let filename = `video.${format}`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const blob = await convertRes.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [url, format, quality]);

  const handleReset = useCallback(() => {
    setUrl("");
    setStatus("idle");
    setError("");
    setVideoInfo(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && url.trim()) {
        handleConvert();
      }
    },
    [url, handleConvert]
  );

  const isConverting = status === "fetching" || status === "converting";
  const showProgress = status !== "idle" && status !== "error";
  const videoId = url ? extractVideoId(url) : null;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-start px-4 py-10 pb-16"
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <GlassOrbs />
      <LightRays />

      <div className={`container ${isDragging ? "drag-active" : ""}`}>
        <div className="title-bar">
          <div className="dots">
            <div className="dot dot-red" />
            <div className="dot dot-yel" />
            <div className="dot dot-grn" />
          </div>
          <h1>AquaToob</h1>
          <div className="spacer" />
        </div>

        <div className="glass-panel">
          <div className="logo-section">
            <div className="logo-icon">💎</div>
            <h2>AquaToob</h2>
            <p>paste · convert · download</p>
          </div>

          <div className="input-group">
            <span className="input-icon">🔗</span>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Paste a YouTube URL here..."
              autoComplete="off"
              spellCheck={false}
              disabled={isConverting}
            />
            <button
              className="paste-btn"
              onClick={handlePaste}
              title="Paste from clipboard"
              disabled={isConverting}
            >
              📋
            </button>
          </div>
          <div className="drag-hint">or drag & drop a link onto this window</div>

          <div className="format-selector">
            <button
              className={`format-btn ${format === "mp4" ? "active" : ""}`}
              onClick={() => setFormat("mp4")}
              disabled={isConverting}
            >
              <span className="emoji">🎬</span> MP4
            </button>
            <button
              className={`format-btn ${format === "mp3" ? "active" : ""}`}
              onClick={() => setFormat("mp3")}
              disabled={isConverting}
            >
              <span className="emoji">🎵</span> MP3
            </button>
          </div>

          {format === "mp4" && (
            <div className="quality-row">
              <label>Quality:</label>
              <select
                className="quality-select"
                value={quality}
                onChange={(e) => setQuality(e.target.value as Quality)}
                disabled={isConverting}
              >
                <option value="1080">1080p HD</option>
                <option value="720">720p</option>
                <option value="480">480p</option>
                <option value="360">360p</option>
              </select>
            </div>
          )}

          <button
            className="convert-btn"
            onClick={handleConvert}
            disabled={!url.trim() || isConverting}
          >
            <span>{isConverting ? "⏳" : "⚡"}</span>
            {isConverting ? "Converting..." : "Convert"}
          </button>

          {error && <div className="error-msg">{error}</div>}

          {showProgress && (
            <div className="progress-area">
              <div className="preview-card">
                <div className="preview-thumb">
                  {videoId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt="thumbnail"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML = "🎥";
                      }}
                    />
                  ) : (
                    "🎥"
                  )}
                </div>
                <div className="preview-info">
                  <div className="title">
                    {videoInfo?.title || "Loading video info..."}
                  </div>
                  <div className="meta">
                    {videoInfo
                      ? `${videoInfo.durationFormatted} · ${format.toUpperCase()} ${format === "mp4" ? quality + "p" : "320kbps"}`
                      : ""}
                  </div>
                </div>
              </div>

              <div className="progress-bar-track">
                <div
                  className={`progress-bar-fill ${status === "done" ? "" : "indeterminate"}`}
                  style={{ width: status === "done" ? "100%" : undefined }}
                />
              </div>
              <div className="progress-text">
                {status === "fetching" && "Fetching video info..."}
                {status === "converting" && "Downloading & converting..."}
                {status === "done" && "Done — check your downloads."}
              </div>

              {status === "done" && (
                <button className="another-btn" onClick={handleReset}>
                  Convert Another
                </button>
              )}
            </div>
          )}
        </div>

        <div className="footer">AquaToob v1.0</div>
      </div>
    </div>
  );
}
