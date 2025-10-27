import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/media-server/info`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.ok ? 200 : response.status,
    });
  } catch (error: any) {
    console.error("Error fetching media server info:", error);

    return NextResponse.json(
      {
        serverType: "plex",
        serverId: null,
        config: {
          serverIp: "",
          serverPort: "",
          useSSL: false,
          customUrl: "",
        },
      },
      { status: 500 },
    );
  }
}