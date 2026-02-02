import { NextResponse } from "next/server";

// ElevenLabs API configuration
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/voices";

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(ELEVENLABS_API_URL, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API Error:", errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data: ElevenLabsVoicesResponse = await response.json();

    // Transform the response to include only the necessary fields
    const voices = data.voices.map((voice) => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      preview_url: voice.preview_url,
    }));

    return NextResponse.json({ voices });
  } catch (error) {
    console.error("Error fetching ElevenLabs voices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voices" },
      { status: 500 }
    );
  }
}
