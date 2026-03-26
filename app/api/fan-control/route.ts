import { NextRequest, NextResponse } from "next/server";

// In production: set OPENLINKHUB_URL to your Cloudflare Tunnel HTTPS URL
// e.g. https://openlinkhub.your-tunnel.cfargotunnel.com
// For local dev: http://127.0.0.1:27003
const OPENLINKHUB_URL =
  process.env.OPENLINKHUB_URL || "http://127.0.0.1:27003";

interface OlhFanChannel {
  serial: string;
  channelId: number;
  name: string;
  rpm: number;
  speed: number | null; // percentage if available
  profile: string;
}

// Parse the GET /api/v1/ response and extract fan channels from iCUE LINK Hubs
function extractFans(data: Record<string, unknown>): OlhFanChannel[] {
  const deviceMap = data.device as Record<string, Record<string, unknown>> | undefined;
  if (!deviceMap || typeof deviceMap !== "object") return [];

  const fans: OlhFanChannel[] = [];

  for (const [, device] of Object.entries(deviceMap)) {
    // ProductType 0 = iCUE LINK System Hub (the one with fans)
    // ProductType 4 = Lighting Node Core (RGB only — skip)
    // ProductType 999 = cluster (virtual — skip)
    if (device.ProductType !== 0) continue;
    if (device.Hidden === true) continue;

    const serial = device.Serial as string;
    const getDevice = device.GetDevice as Record<string, unknown> | null;
    if (!getDevice) continue;

    const channels = getDevice.devices as Record<string, Record<string, unknown>> | undefined;
    if (!channels || typeof channels !== "object") continue;

    for (const channel of Object.values(channels)) {
      // description "Fan" identifies actual fan channels (not temp sensors, AIO pumps, etc.)
      if (channel.description !== "Fan") continue;

      fans.push({
        serial,
        channelId: channel.channelId as number,
        name: (channel.name as string) ?? "Fan",
        rpm: (channel.rpm as number) ?? 0,
        speed: typeof channel.speed === "number" ? channel.speed : null,
        profile: (channel.profile as string) ?? "Unknown",
      });
    }
  }

  return fans;
}

// GET /api/fan-control — returns current fan info (rpm, profile, etc.)
export async function GET() {
  try {
    const res = await fetch(`${OPENLINKHUB_URL}/api/v1/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenLinkHub returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const fans = extractFans(data);

    const avgRpm =
      fans.length > 0
        ? Math.round(fans.reduce((s, f) => s + f.rpm, 0) / fans.length)
        : null;

    return NextResponse.json({ fans, fanCount: fans.length, averageRpm: avgRpm });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    const message = isTimeout
      ? "OpenLinkHub no responde (timeout). ¿Está el túnel activo?"
      : err instanceof Error
      ? err.message
      : "Unable to reach OpenLinkHub";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

// POST /api/fan-control — set fan speed for all fan channels
// Body: { speed: number }  (20–100)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const speed = Number(body.speed);

    if (isNaN(speed) || speed < 0 || speed > 100) {
      return NextResponse.json(
        { error: "speed must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Fetch device list to discover fan channels
    const devRes = await fetch(`${OPENLINKHUB_URL}/api/v1/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!devRes.ok) {
      return NextResponse.json(
        { error: `OpenLinkHub returned ${devRes.status}` },
        { status: 502 }
      );
    }

    const data = await devRes.json();
    const fans = extractFans(data);

    if (fans.length === 0) {
      return NextResponse.json(
        { error: "No fan channels detected. Check OpenLinkHub device config." },
        { status: 404 }
      );
    }

    const errors: string[] = [];

    await Promise.all(
      fans.map(async ({ serial, channelId, name }) => {
        try {
          const speedRes = await fetch(`${OPENLINKHUB_URL}/api/v1/speed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serial,
              channelId,
              value: speed,
              mode: 0, // 0 = Manual (fixed speed)
            }),
            signal: AbortSignal.timeout(5000),
          });

          if (!speedRes.ok) {
            errors.push(`${name} (ch${channelId}): HTTP ${speedRes.status}`);
          }
        } catch (e) {
          errors.push(`${name} (ch${channelId}): ${(e as Error).message}`);
        }
      })
    );

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, speed, errors },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, speed, applied: fans.length });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    const message = isTimeout
      ? "OpenLinkHub no responde (timeout). ¿Está el túnel activo?"
      : err instanceof Error
      ? err.message
      : "Unable to reach OpenLinkHub";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
