import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { adminService } from "@/lib/services/admin.service";

/**
 * GET /api/v1/admin/products
 * Get list of products with filters and pagination
 */
export async function GET(req: NextRequest) {
  const requestStartTime = Date.now();
  console.log("🌐 [ADMIN PRODUCTS API] GET request received");
  
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const categories = categoryParam ? categoryParam.split(',').filter(Boolean) : undefined;
    
    const filters = {
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20,
      search: searchParams.get("search") || undefined,
      categories: categories,
      sku: searchParams.get("sku") || undefined,
      minPrice: searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined,
      maxPrice: searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined,
      sort: searchParams.get("sort") || undefined,
    };

    console.log("🌐 [ADMIN PRODUCTS API] Calling adminService.getProducts with filters:", filters);
    const serviceStartTime = Date.now();
    
    const result = await adminService.getProducts(filters);
    
    const serviceTime = Date.now() - serviceStartTime;
    const totalTime = Date.now() - requestStartTime;
    console.log(`✅ [ADMIN PRODUCTS API] Request completed in ${totalTime}ms (service: ${serviceTime}ms)`);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [ADMIN PRODUCTS] GET Error:", error);
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

/**
 * POST /api/v1/admin/products
 * Create a new product
 */
export async function POST(req: NextRequest) {
  try {
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log("📤 [ADMIN PRODUCTS] POST request:", { body: JSON.stringify(body, null, 2) });

    const product = await adminService.createProduct(body);
    console.log("✅ [ADMIN PRODUCTS] Product created:", product.id);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error("❌ [ADMIN PRODUCTS] POST Error:", error);
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

