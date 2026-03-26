import { NextRequest, NextResponse } from "next/server";

const OPENLINKHUB_URL =
  process.env.OPENLINKHUB_URL || "http://192.168.193.229:27003";

// GET /api/fan-control — fetch current device/speed info from OpenLinkHub
export async function GET() {
  try {
    const res = await fetch(`${OPENLINKHUB_URL}/api/v1/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      // Short timeout so the UI doesn't hang if the machine is unreachable
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenLinkHub returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to reach OpenLinkHub";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

// POST /api/fan-control — apply a fixed speed (%) to all fan channels
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

    // First fetch the device list so we know which deviceId/channelId to target
    const devRes = await fetch(`${OPENLINKHUB_URL}/api/v1/devices`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!devRes.ok) {
      return NextResponse.json(
        { error: `OpenLinkHub devices endpoint returned ${devRes.status}` },
        { status: 502 }
      );
    }

    const devices = await devRes.json();

    // OpenLinkHub returns an array of device objects; each has a list of channels.
    // We apply the manual speed to every channel on every device.
    const deviceList: Array<{ deviceId?: string; Serial?: string; Channels?: Array<{ channelId?: number; ChannelId?: number }> }> =
      Array.isArray(devices) ? devices : (devices.devices ?? devices.Devices ?? []);

    const errors: string[] = [];

    for (const device of deviceList) {
      const deviceId = device.deviceId ?? device.Serial ?? "";
      const channels: Array<{ channelId?: number; ChannelId?: number }> =
        device.Channels ?? [];

      for (const channel of channels) {
        const channelId = channel.channelId ?? channel.ChannelId ?? 0;

        const speedRes = await fetch(`${OPENLINKHUB_URL}/api/v1/speed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            channelId,
            value: speed,
            mode: 0, // 0 = Manual (fixed speed)
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (!speedRes.ok) {
          errors.push(
            `Device ${deviceId} ch${channelId}: ${speedRes.status}`
          );
        }
      }
    }

    // If no devices/channels were found, fall back to a single broadcast call
    if (deviceList.length === 0 || deviceList.every((d) => !d.Channels?.length)) {
      const speedRes = await fetch(`${OPENLINKHUB_URL}/api/v1/speed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: speed, mode: 0 }),
        signal: AbortSignal.timeout(5000),
      });
      if (!speedRes.ok) {
        errors.push(`Broadcast call: ${speedRes.status}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, speed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to reach OpenLinkHub";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
