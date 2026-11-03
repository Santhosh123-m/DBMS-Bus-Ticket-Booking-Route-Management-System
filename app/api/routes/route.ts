import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface RouteRow extends RowDataPacket {
  route_id: number;
  source: string;
  destination: string;
  distance_km: number;
}

export async function GET() {
  try {
    const [routes] = (await pool.query(`
      SELECT route_id, source, destination, distance_km
      FROM routes
      ORDER BY source, destination
    `)) as [RouteRow[], unknown];

    const sources = Array.from(new Set(routes.map((r) => r.source)));
    const destinations = Array.from(new Set(routes.map((r) => r.destination)));

    return NextResponse.json({
      routes,
      sources,
      destinations,
    });
  } catch (error) {
    console.error("Fetch routes error:", error);
    return NextResponse.json(
      { message: "Failed to fetch routes from database." },
      { status: 500 }
    );
  }
}
