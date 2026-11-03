import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface ScheduleDetailRow extends RowDataPacket {
  schedule_id: number;
  bus_id: number;
  bus_name: string;
  bus_type: string;
  total_seats: number;
  operator_name: string | null;
  source: string;
  destination: string;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  fare: number;
}

interface SeatRow extends RowDataPacket {
  seat_id: number;
  bus_id: number;
  seat_number: string;
}

interface BookedSeatRow extends RowDataPacket {
  seat_id: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleIdParam = searchParams.get("schedule_id");

    if (!scheduleIdParam) {
      return NextResponse.json(
        { message: "schedule_id query parameter is required." },
        { status: 400 }
      );
    }

    const scheduleId = parseInt(scheduleIdParam, 10);
    if (isNaN(scheduleId)) {
      return NextResponse.json(
        { message: "Invalid schedule_id." },
        { status: 400 }
      );
    }

    // 1. Fetch schedule info
    const scheduleSql = `
      SELECT
        s.schedule_id,
        s.bus_id,
        b.bus_name,
        b.bus_type,
        b.total_seats,
        o.operator_name,
        r.source,
        r.destination,
        CAST(s.travel_date AS CHAR) AS travel_date,
        s.departure_time,
        s.arrival_time,
        s.fare
      FROM schedules s
      JOIN buses b ON s.bus_id = b.bus_id
      JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN operators o ON b.operator_id = o.operator_id
      WHERE s.schedule_id = ?
    `;

    const [scheduleRows] = (await pool.execute(scheduleSql, [scheduleId])) as [
      ScheduleDetailRow[],
      unknown
    ];

    if (scheduleRows.length === 0) {
      return NextResponse.json(
        { message: "Bus schedule not found." },
        { status: 404 }
      );
    }

    const schedule = scheduleRows[0];

    // 2. Fetch all seats configured for this bus
    const seatsSql = `
      SELECT seat_id, bus_id, seat_number
      FROM seats
      WHERE bus_id = ?
      ORDER BY seat_id ASC
    `;
    const [allSeats] = (await pool.execute(seatsSql, [schedule.bus_id])) as [
      SeatRow[],
      unknown
    ];

    // 3. Fetch all already booked seat IDs for this schedule
    const bookedSql = `
      SELECT seat_id
      FROM booking_seats
      WHERE schedule_id = ?
    `;
    const [bookedRows] = (await pool.execute(bookedSql, [scheduleId])) as [
      BookedSeatRow[],
      unknown
    ];
    const bookedSet = new Set(bookedRows.map((b) => b.seat_id));

    // Map each seat with booked status
    const seats = allSeats.map((s) => ({
      seat_id: s.seat_id,
      seat_number: s.seat_number,
      is_booked: bookedSet.has(s.seat_id),
    }));

    const availableCount = seats.filter((s) => !s.is_booked).length;

    return NextResponse.json({
      schedule,
      seats,
      total_seats: seats.length,
      available_seats: availableCount,
      booked_seats_count: bookedSet.size,
    });
  } catch (error) {
    console.error("Fetch seats error:", error);
    return NextResponse.json(
      { message: "Failed to load seat layout." },
      { status: 500 }
    );
  }
}
