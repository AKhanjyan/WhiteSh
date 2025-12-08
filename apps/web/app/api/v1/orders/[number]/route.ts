import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { ordersService } from "@/lib/services/orders.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  let user: { id: string } | null = null;
  try {
    user = await authenticateToken(req);
    if (!user) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/unauthorized",
          title: "Unauthorized",
          status: 401,
          detail: "Authentication token required",
          instance: req.url,
        },
        { status: 401 }
      );
    }

    const { number } = await params;
    const result = await ordersService.findByNumber(number, user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const { number } = await params;
    console.error("❌ [ORDERS] Get order by number error:", {
      orderNumber: number,
      userId: user?.id,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      type: error?.type,
      title: error?.title,
      status: error?.status,
      detail: error?.detail,
      fullError: error,
    });
    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}

