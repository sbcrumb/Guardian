import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/config";

export async function POST() {
  try {
    const response = await fetch(
      `${getBackendUrl()}/media-server/test-connection`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();

    // Always return the backend response as-is to preserve error structure
    return NextResponse.json(data, {
      status: response.ok ? 200 : response.status,
    });
  } catch (error: any) {
    console.error("Failed to test media server connection:", error);

    // Return a structured error response for backend connection issues
    return NextResponse.json(
      {
        success: false,
        code: "BACKEND_CONNECTION_ERROR",
        message: "Cannot connect to Guardian backend",
        suggestion: "Please ensure the backend service is running and accessible",
      },
      { status: 500 },
    );
  }
}