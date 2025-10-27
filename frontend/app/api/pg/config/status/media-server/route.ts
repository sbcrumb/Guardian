import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl();

    const response = await fetch(`${backendUrl}/media-server/test-connection`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Transform the response to match the expected frontend format
    const transformedResponse = {
      configured: data.success,
      hasValidCredentials: data.success,
      connectionStatus: data.success ? "Connected" : data.message,
      serverType: data.serverType,
      suggestion: data.suggestion,
      errorCode: data.code,
    };

    return NextResponse.json(transformedResponse, {
      status: response.ok ? 200 : response.status,
    });
  } catch (error: any) {
    console.error("Error testing media server connection:", error);

    return NextResponse.json(
      {
        configured: false,
        hasValidCredentials: false,
        connectionStatus:
          "Backend connection error: Cannot connect to Guardian backend service",
      },
      { status: 500 },
    );
  }
}