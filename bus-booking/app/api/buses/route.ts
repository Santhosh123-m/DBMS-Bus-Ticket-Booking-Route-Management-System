import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface BusRow extends RowDataPacket {
  bus_id: number;
  bus_name: string;
  bus_type: string;
  total_seats: number;
  operator_name: string | null;
  schedule_id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  fare: number;
  source: string;
  destination: string;
  distance_km: number;
  available_seats: number;
}

interface DateRow extends RowDataPacket {
  travel_date: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from")?.trim();
    const to = searchParams.get("to")?.trim();
    const date = searchParams.get("date")?.trim();

    if (!from || !to) {
      return NextResponse.json(
        { message: "Please provide both source (from) and destination (to)." },
        { status: 400 }
      );
    }

    // Base query
    let sql = `
      SELECT
        b.bus_id,
        b.bus_name,
        b.bus_type,
        b.total_seats,
        o.operator_name,
        s.schedule_id,
        CAST(s.travel_date AS CHAR) AS travel_date,
        s.departure_time,
        s.arrival_time,
        s.fare,
        r.source,
        r.destination,
        r.distance_km,
        CAST((b.total_seats - IFNULL(bs_count.booked_count, 0)) AS SIGNED) AS available_seats
      FROM routes r
      JOIN schedules s ON r.route_id = s.route_id
      JOIN buses b ON s.bus_id = b.bus_id
      LEFT JOIN operators o ON b.operator_id = o.operator_id
      LEFT JOIN (
        SELECT schedule_id, COUNT(*) AS booked_count
        FROM booking_seats
        GROUP BY schedule_id
      ) bs_count ON s.schedule_id = bs_count.schedule_id
      WHERE LOWER(TRIM(r.source)) = LOWER(?)
        AND LOWER(TRIM(r.destination)) = LOWER(?)
    `;

    const params: (string | number)[] = [from, to];

    if (date) {
      sql += ` AND s.travel_date = ?`;
      params.push(date);
    } else {
      sql += ` AND s.travel_date >= CURDATE()`;
    }

    sql += ` ORDER BY s.travel_date, s.departure_time`;

    const [rows] = (await pool.execute(sql, params)) as [BusRow[], unknown];

    // If a specific date was searched and yielded 0 results, find alternative dates
    let alternativeDates: string[] = [];
    if (date && rows.length === 0) {
      const altSql = `
        SELECT DISTINCT CAST(s.travel_date AS CHAR) AS travel_date
        FROM routes r
        JOIN schedules s ON r.route_id = s.route_id
        WHERE LOWER(TRIM(r.source)) = LOWER(?)
          AND LOWER(TRIM(r.destination)) = LOWER(?)
        ORDER BY s.travel_date
        LIMIT 6
      `;
      const [altRows] = (await pool.execute(altSql, [from, to])) as [DateRow[], unknown];
      alternativeDates = altRows.map((r) => r.travel_date);
    }

    return NextResponse.json({
      buses: rows,
      total: rows.length,
      alternativeDates,
    });
  } catch (error) {
    console.error("Bus search error:", error);
    return NextResponse.json(
      { message: "Unable to search buses. Check database connection." },
      { status: 500 }
    );
  }
}
