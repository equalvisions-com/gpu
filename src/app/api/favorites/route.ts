import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { userFavorites } from "@/db/schema";
import { headers } from "next/headers";
import { eq, and, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { writeLimiter } from "@/lib/redis/ratelimit";
import { z } from "zod";
import type { FavoritesRequest, FavoritesResponse, FavoriteKey } from "@/types/favorites";
import { revalidateTag } from "next/cache";
import { getFavoritesCacheTag, getFavoritesRateLimitKey } from "@/lib/favorites/constants";

/**
 * Database row type for user_favorites table
 */
type UserFavoriteRow = {
  id: string;
  userId: string;
  gpuUuid: string;
  createdAt: Date | null;
};

/**
 * Builds rate limit headers for API responses
 * Provides client visibility into rate limit status
 */
function buildRateHeaders(limit?: number, remaining?: number, reset?: number) {
  const headers: Record<string, string> = {};
  if (typeof limit === "number") headers["X-RateLimit-Limit"] = String(limit);
  if (typeof remaining === "number") headers["X-RateLimit-Remaining"] = String(remaining);
  if (typeof reset === "number") headers["X-RateLimit-Reset"] = String(reset);
  return headers;
}

/**
 * GET /api/favorites
 * Fetches the current user's favorited GPU UUIDs
 * 
 * @returns 200 with array of GPU UUIDs
 * @returns 401 if not authenticated
 * @returns 500 on server error
 */
export async function GET() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /**
     * Type suppression needed due to Drizzle ORM build artifact conflicts
     * Issue: Multiple Drizzle versions in node_modules create incompatible type declarations
     * Solution: Use type assertion after query execution - runtime behavior is correct
     * TODO: Remove when Drizzle resolves upstream type conflicts
     */
    const rows = await db
      .select()
      // @ts-ignore - Drizzle ORM type conflict between build artifacts (see comment above)
      .from(userFavorites)
      // @ts-ignore - Drizzle ORM type conflict between build artifacts
      .where(eq(userFavorites.userId, session.user.id));
    
    const typedRows = rows as unknown as UserFavoriteRow[];
    const favorites: FavoriteKey[] = (typedRows || []).map((r) => r.gpuUuid as FavoriteKey);
    
    return NextResponse.json<FavoritesResponse>({ favorites });
  } catch (error) {
    console.error("[GET /api/favorites] Database query failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/favorites
 * Adds one or more GPUs to the user's favorites
 * 
 * @body { gpuUuids: string[] } - Array of 1-100 GPU UUIDs to favorite
 * @returns 200 on success with rate limit headers
 * @returns 400 if request body is invalid
 * @returns 401 if not authenticated
 * @returns 429 if rate limit exceeded
 * @returns 500 on server error
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check rate limit
    const rate = await writeLimiter.limit(getFavoritesRateLimitKey(session.user.id));
    if (!rate.success) {
      console.warn("[POST /api/favorites] Rate limit exceeded", {
        userId: session.user.id,
        limit: rate.limit,
        reset: rate.reset,
      });
      
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) }
      );
    }

    // Validate request body
    const BodySchema = z.object({ 
      gpuUuids: z.array(z.string().min(1).max(256)).min(1).max(100) 
    });
    
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      console.warn("[POST /api/favorites] Invalid request body", {
        userId: session.user.id,
        errors: parsed.error.errors,
      });
      
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    // Deduplicate UUIDs
    const gpuUuids = Array.from(new Set(parsed.data.gpuUuids)) as FavoriteKey[];

    // Insert favorites, ignoring duplicates via unique constraint
    const favoritesToInsert = gpuUuids.map((gpuUuid) => ({
      id: crypto.randomUUID(),
      userId: session.user.id,
      gpuUuid,
    }));

    /**
     * Type suppression needed due to Drizzle ORM build artifact conflicts
     * Issue: Multiple Drizzle versions in node_modules create incompatible type declarations
     * Solution: Use type assertion - runtime behavior is correct
     * TODO: Remove when Drizzle resolves upstream type conflicts
     */
    await db
      // @ts-ignore - Drizzle ORM type conflict between build artifacts (see comment above)
      .insert(userFavorites)
      .values(favoritesToInsert)
      .onConflictDoNothing();

    // Revalidate cached favorites for this user
    try { 
      revalidateTag(getFavoritesCacheTag(session.user.id)); 
    } catch (revalidateError) {
      console.error("[POST /api/favorites] Cache revalidation failed", {
        userId: session.user.id,
        error: revalidateError instanceof Error ? revalidateError.message : String(revalidateError),
      });
    }
    
    return NextResponse.json(
      { success: true }, 
      { headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) }
    );
  } catch (error) {
    console.error("[POST /api/favorites] Database operation failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/favorites
 * Removes one or more GPUs from the user's favorites
 * 
 * @body { gpuUuids: string[] } - Array of 1-100 GPU UUIDs to unfavorite
 * @returns 200 on success with rate limit headers
 * @returns 400 if request body is invalid
 * @returns 401 if not authenticated
 * @returns 429 if rate limit exceeded
 * @returns 500 on server error
 */
export async function DELETE(request: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check rate limit
    const rate = await writeLimiter.limit(getFavoritesRateLimitKey(session.user.id));
    if (!rate.success) {
      console.warn("[DELETE /api/favorites] Rate limit exceeded", {
        userId: session.user.id,
        limit: rate.limit,
        reset: rate.reset,
      });
      
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) }
      );
    }

    // Validate request body
    const BodySchema = z.object({ 
      gpuUuids: z.array(z.string().min(1).max(256)).min(1).max(100) 
    });
    
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      console.warn("[DELETE /api/favorites] Invalid request body", {
        userId: session.user.id,
        errors: parsed.error.errors,
      });
      
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    
    // Deduplicate UUIDs
    const gpuUuids = Array.from(new Set(parsed.data.gpuUuids)) as FavoriteKey[];

    /**
     * Type suppression needed due to Drizzle ORM build artifact conflicts
     * Issue: Multiple Drizzle versions in node_modules create incompatible type declarations
     * Solution: Use type assertion - runtime behavior is correct
     * TODO: Remove when Drizzle resolves upstream type conflicts
     */
    await db
      // @ts-ignore - Drizzle ORM type conflict between build artifacts (see comment above)
      .delete(userFavorites)
      .where(
        // @ts-ignore - Drizzle ORM type conflict between build artifacts
        and(
          eq(userFavorites.userId, session.user.id),
          inArray(userFavorites.gpuUuid, gpuUuids)
        )
      );

    // Revalidate cached favorites for this user
    try { 
      revalidateTag(getFavoritesCacheTag(session.user.id)); 
    } catch (revalidateError) {
      console.error("[DELETE /api/favorites] Cache revalidation failed", {
        userId: session.user.id,
        error: revalidateError instanceof Error ? revalidateError.message : String(revalidateError),
      });
    }
    
    return NextResponse.json(
      { success: true }, 
      { headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) }
    );
  } catch (error) {
    console.error("[DELETE /api/favorites] Database operation failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
