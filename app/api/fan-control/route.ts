import { NextRequest, NextResponse } from "next/server";

// In production: set OPENLINKHUB_URL to your Cloudflare Tunnel HTTPS URL
// e.g. https://openlinkhub.your-tunnel.cfargotunnel.com
// For local dev: http://127.0.0.1:27003
const OPENLINKHUB_URL =
  process.env.OPENLINKHUB_URL || "http://127.0.0.1:27003";

// Find iCUE LINK System Hub (ProductType 0) — the one with controllable fans
function findHubSerial(data: Record<string, unknown>): string | null {
  const deviceMap = data.device as Record<string, Record<string, unknown>> | undefined;
  if (!deviceMap || typeof deviceMap !== "object") return null;

  for (const [, device] of Object.entries(deviceMap)) {
    if (device.ProductType === 0 && device.Hidden !== true) {
      return device.Serial as string;
    }
  }
  return null;
}

// Extract fan channels from the hub's GetDevice.devices
function extractFans(data: Record<string, unknown>) {
  const deviceMap = data.device as Record<string, Record<string, unknown>> | undefined;
  if (!deviceMap) return [];

  const fans: Array<{ serial: string; channelId: number; name: string; rpm: number; profile: string }> = [];

  for (const [, device] of Object.entries(deviceMap)) {
    if (device.ProductType !== 0 || device.Hidden === true) continue;
    const serial = device.Serial as string;
    const getDevice = device.GetDevice as Record<string, unknown> | null;
    if (!getDevice) continue;

    const channels = getDevice.devices as Record<string, Record<string, unknown>> | undefined;
    if (!channels) continue;

    for (const channel of Object.values(channels)) {
      if (channel.description !== "Fan") continue;
      fans.push({
        serial,
        channelId: channel.channelId as number,
        name: (channel.name as string) ?? "Fan",
        rpm: (channel.rpm as number) ?? 0,
        profile: (channel.profile as string) ?? "Normal",
      });
    }
  }
  return fans;
}

// GET /api/fan-control — current fan info (rpm, active profile)
export async function GET() {
  try {
    const res = await fetch(`${OPENLINKHUB_URL}/api/v1/`, {
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
    const avgRpm = fans.length > 0
      ? Math.round(fans.reduce((s, f) => s + f.rpm, 0) / fans.length)
      : null;
    const currentProfile = fans[0]?.profile ?? null;

    return NextResponse.json({ fans, fanCount: fans.length, averageRpm: avgRpm, currentProfile });
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      { error: isTimeout ? "OpenLinkHub no responde (timeout)" : err instanceof Error ? err.message : "Error" },
      { status: 503 }
    );
  }
}

// POST /api/fan-control — apply a speed profile to all fan channels
// Body: { profile: "Quiet" | "Normal" | "Performance" }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profile = body.profile as string;

    if (!profile || typeof profile !== "string") {
      return NextResponse.json({ error: "profile must be a string" }, { status: 400 });
    }

    // Get device data to find the hub serial
    const devRes = await fetch(`${OPENLINKHUB_URL}/api/v1/`, {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!devRes.ok) {
      return NextResponse.json({ error: `OpenLinkHub returned ${devRes.status}` }, { status: 502 });
    }

    const data = await devRes.json();
    const serial = findHubSerial(data);

    if (!serial) {
      return NextResponse.json({ error: "No iCUE LINK Hub found" }, { status: 404 });
    }

    // POST /api/speed — channelId: -1 means apply to all channels
    const speedRes = await fetch(`${OPENLINKHUB_URL}/api/speed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: serial, channelId: -1, profile }),
      signal: AbortSignal.timeout(5000),
    });

    const result = await speedRes.json().catch(() => ({}));

    if (!speedRes.ok || result.status === 0) {
      return NextResponse.json(
        { error: result.message ?? `OpenLinkHub returned ${speedRes.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      { error: isTimeout ? "OpenLinkHub no responde (timeout)" : err instanceof Error ? err.message : "Error" },
      { status: 503 }
    );
  }
}
