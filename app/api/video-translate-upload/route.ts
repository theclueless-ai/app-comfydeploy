import { NextRequest, NextResponse } from "next/server";
import {
  abortVideoTranslateUpload,
  completeVideoTranslateUpload,
  initiateVideoTranslateUpload,
  isVideoTranslateUploadKey,
  presignVideoTranslateUploadPart,
} from "@/lib/s3";
import { sanitizeErrorMessage } from "@/lib/error-messages";

export const runtime = "nodejs";

// Per-part upload duration: 1h is enough for 100MB on a slow link.
export const maxDuration = 60;

const MAX_PART_NUMBER = 10_000;

type InitiateBody = {
  action: "initiate";
  filename: string;
  contentType: string;
};

type SignPartBody = {
  action: "sign-part";
  key: string;
  uploadId: string;
  partNumber: number;
};

type CompleteBody = {
  action: "complete";
  key: string;
  uploadId: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
};

type AbortBody = {
  action: "abort";
  key: string;
  uploadId: string;
};

type Body = InitiateBody | SignPartBody | CompleteBody | AbortBody;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function ensureOurKey(key: unknown): key is string {
  return typeof key === "string" && isVideoTranslateUploadKey(key);
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad("Invalid JSON body");
  }

  try {
    switch (body.action) {
      case "initiate": {
        if (!body.filename || typeof body.filename !== "string") {
          return bad("filename is required");
        }
        if (!body.contentType || typeof body.contentType !== "string") {
          return bad("contentType is required");
        }
        if (
          !body.contentType.startsWith("video/") &&
          !body.contentType.startsWith("audio/")
        ) {
          return bad("contentType must be video/* or audio/*");
        }

        const { key, uploadId } = await initiateVideoTranslateUpload(
          body.filename,
          body.contentType
        );
        return NextResponse.json({ key, uploadId });
      }

      case "sign-part": {
        if (!ensureOurKey(body.key)) return bad("Invalid key");
        if (!body.uploadId) return bad("uploadId is required");
        if (
          typeof body.partNumber !== "number" ||
          body.partNumber < 1 ||
          body.partNumber > MAX_PART_NUMBER ||
          !Number.isInteger(body.partNumber)
        ) {
          return bad(`partNumber must be an integer in [1, ${MAX_PART_NUMBER}]`);
        }

        const url = await presignVideoTranslateUploadPart(
          body.key,
          body.uploadId,
          body.partNumber
        );
        return NextResponse.json({ url });
      }

      case "complete": {
        if (!ensureOurKey(body.key)) return bad("Invalid key");
        if (!body.uploadId) return bad("uploadId is required");
        if (!Array.isArray(body.parts) || body.parts.length === 0) {
          return bad("parts must be a non-empty array");
        }
        for (const p of body.parts) {
          if (
            !p ||
            typeof p.ETag !== "string" ||
            typeof p.PartNumber !== "number"
          ) {
            return bad("Each part must have ETag and PartNumber");
          }
        }

        await completeVideoTranslateUpload(body.key, body.uploadId, body.parts);
        return NextResponse.json({ key: body.key });
      }

      case "abort": {
        if (!ensureOurKey(body.key)) return bad("Invalid key");
        if (!body.uploadId) return bad("uploadId is required");
        await abortVideoTranslateUpload(body.key, body.uploadId);
        return NextResponse.json({ ok: true });
      }

      default:
        return bad("Unknown action");
    }
  } catch (error) {
    console.error("[video-translate-upload] Error:", error);
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(
          error instanceof Error ? error.message : null
        ),
      },
      { status: 500 }
    );
  }
}
