import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-kr", "files");

async function loadFont(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(path.join(FONT_DIR, file));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET() {
  const [latin400, korean400, korean700] = await Promise.all([
    loadFont("noto-sans-kr-latin-400-normal.woff"),
    loadFont("noto-sans-kr-korean-400-normal.woff"),
    loadFont("noto-sans-kr-korean-700-normal.woff"),
  ]);
  const mascotBuffer = await readFile(path.join(process.cwd(), "public", "gachi-galgae-mascot.png"));
  const mascotSrc = `data:image/png;base64,${mascotBuffer.toString("base64")}`;

  const image = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundImage: "linear-gradient(135deg, #1d6a5c 0%, #18584d 45%, #10483f 100%)",
        }}
      >
        <div style={{ position: "absolute", top: -140, left: -120, width: 420, height: 420, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.07)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: -180, right: -100, width: 520, height: 520, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.06)", display: "flex" }} />
        <div style={{ position: "absolute", top: 90, right: 200, width: 26, height: 26, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.16)", display: "flex" }} />
        <div style={{ position: "absolute", bottom: 120, left: 240, width: 18, height: 18, borderRadius: 9999, backgroundColor: "rgba(255,255,255,0.14)", display: "flex" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 56,
            padding: 60,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- satori renders plain img elements, next/image is not supported */}
          <img
            src={mascotSrc}
            alt=""
            width={470}
            height={470}
            style={{ borderRadius: 44, border: "10px solid rgba(255,255,255,0.92)", display: "flex" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 560 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 26px",
                borderRadius: 9999,
                backgroundColor: "rgba(255,255,255,0.16)",
                color: "#e3f0ec",
                fontSize: 26,
                fontFamily: "Noto Sans KR",
                fontWeight: 400,
                letterSpacing: 1,
              }}
            >
              gggo.blog
            </div>
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 82,
                fontFamily: "Noto Sans KR",
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              같이갈개
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                color: "rgba(255,255,255,0.88)",
                fontSize: 32,
                fontFamily: "Noto Sans KR",
                fontWeight: 400,
                lineHeight: 1.45,
              }}
            >
              <div style={{ display: "flex" }}>반려견과 함께 갈 수 있는 곳,</div>
              <div style={{ display: "flex" }}>크기와 조건에 맞춰 찾아드려요.</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [
      { name: "Noto Sans KR", data: latin400, weight: 400, style: "normal" },
      { name: "Noto Sans KR", data: korean400, weight: 400, style: "normal" },
      { name: "Noto Sans KR", data: korean700, weight: 700, style: "normal" },
    ] },
  );

  return new Response(image.body, {
    status: 200,
    headers: { ...image.headers, "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}
