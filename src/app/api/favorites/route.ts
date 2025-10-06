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

function buildRateHeaders(limit?: number, remaining?: number, reset?: number) {
  const headers: Record<string, string> = {};
  if (typeof limit === "number") headers["X-RateLimit-Limit"] = String(limit);
  if (typeof remaining === "number") headers["X-RateLimit-Remaining"] = String(remaining);
  if (typeof reset === "number") headers["X-RateLimit-Reset"] = String(reset);
  return headers;
}

export async function GET() {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fallback to untyped select due to Drizzle typing conflicts in this build
    // Replace with typed select({ gpuUuid }) when upstream types are compatible
    // @ts-ignore - Drizzle type issues
    const rows = await db.select().from(userFavorites).where(eq(userFavorites.userId, session.user.id));
    const favorites: FavoriteKey[] = (rows || []).map((r: any) => r.gpuUuid);
    return NextResponse.json<FavoritesResponse>({ favorites });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rate = await writeLimiter.limit(`favorites:${session.user.id}`);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) }
      );
    }

    const BodySchema = z.object({ gpuUuids: z.array(z.string().min(1).max(256)).min(1).max(100) });
    const parsed = BodySchema.safeParse(await request.json() as FavoritesRequest);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const gpuUuids = Array.from(new Set(parsed.data.gpuUuids));

    // Insert favorites, ignoring duplicates due to unique constraint
    const favoritesToInsert = gpuUuids.map((gpuUuid: FavoriteKey) => ({
      id: crypto.randomUUID(),
      userId: session.user.id,
      gpuUuid,
    }));

    // @ts-ignore - Drizzle type issues
    await db.insert(userFavorites).values(favoritesToInsert).onConflictDoNothing();

    // Revalidate cached favorites keys for this user
    try { revalidateTag(`favorites:user:${session.user.id}`); } catch {}
    return NextResponse.json({ success: true }, { headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) });
  } catch (error) {
    console.error("Error adding favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const hdrs = await headers();
    const session = await auth.api.getSession({ headers: hdrs });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rate = await writeLimiter.limit(`favorites:${session.user.id}`);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) }
      );
    }

    const BodySchema = z.object({ gpuUuids: z.array(z.string().min(1).max(256)).min(1).max(100) });
    const parsed = BodySchema.safeParse(await request.json() as FavoritesRequest);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const gpuUuids = Array.from(new Set(parsed.data.gpuUuids));

    // Delete favorites
    // @ts-ignore - Drizzle type issues
    await db.delete(userFavorites).where(and(eq(userFavorites.userId, session.user.id), inArray(userFavorites.gpuUuid, gpuUuids as FavoriteKey[])));

    // Revalidate cached favorites keys for this user
    try { revalidateTag(`favorites:user:${session.user.id}`); } catch {}
    return NextResponse.json({ success: true }, { headers: buildRateHeaders(rate.limit, rate.remaining, rate.reset) });
  } catch (error) {
    console.error("Error removing favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
