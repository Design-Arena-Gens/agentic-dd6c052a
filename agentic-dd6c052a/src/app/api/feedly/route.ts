import { NextResponse } from "next/server";

const FEEDLY_BASE_URL = "https://cloud.feedly.com/v3/streams/contents";

export async function POST(request: Request) {
  try {
    const { token, streamId, count, continuation } = await request.json();

    if (!token || !streamId) {
      return NextResponse.json(
        { error: "Feedly token and stream ID are required." },
        { status: 400 },
      );
    }

    const sanitizedCount =
      typeof count === "number" && Number.isFinite(count)
        ? Math.min(Math.max(1, count), 100)
        : 20;

    const url = new URL(FEEDLY_BASE_URL);
    url.searchParams.set("streamId", String(streamId));
    url.searchParams.set("count", String(sanitizedCount));
    if (continuation) {
      url.searchParams.set("continuation", String(continuation));
    }

    const feedlyResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "LinkedIn Agent Studio/1.0",
      },
      cache: "no-store",
    });

    if (!feedlyResponse.ok) {
      const errorPayload = await feedlyResponse.text();
      return NextResponse.json(
        {
          error:
            errorPayload || "Feedly returned a non-success status code.",
        },
        { status: feedlyResponse.status },
      );
    }

    const payload = await feedlyResponse.json();
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Feedly API error", error);
    return NextResponse.json(
      { error: "Unable to reach Feedly. Check credentials and try again." },
      { status: 500 },
    );
  }
}
