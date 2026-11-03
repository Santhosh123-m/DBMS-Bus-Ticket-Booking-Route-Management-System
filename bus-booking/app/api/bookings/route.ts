import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

interface BookingDetailRow extends RowDataPacket {
  booking_id: number;
  booking_date: string;
  total_amount: number;
  booking_status: string;
  passenger_id: number;
  passenger_name: string;
  email: string;
  phone: string;
  schedule_id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  fare: number;
  bus_id: number;
  bus_name: string;
  bus_type: string;
  operator_name: string | null;
  source: string;
  destination: string;
  distance_km: number;
  payment_method: string | null;
  payment_status: string | null;
  payment_date: string | null;
}

interface SeatNumberRow extends RowDataPacket {
  seat_number: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingIdParam = searchParams.get("booking_id");
    const search = searchParams.get("search")?.trim();

    // 1. Single booking lookup by booking_id
    if (bookingIdParam) {
      const bookingId = parseInt(bookingIdParam, 10);
      if (isNaN(bookingId)) {
        return NextResponse.json(
          { message: "Invalid booking_id parameter." },
          { status: 400 }
        );
      }

      const sql = `
        SELECT
          b.booking_id,
          CAST(b.booking_date AS CHAR) AS booking_date,
          b.total_amount,
          b.booking_status,
          p.passenger_id,
          p.name AS passenger_name,
          p.email,
          p.phone,
          s.schedule_id,
          CAST(s.travel_date AS CHAR) AS travel_date,
          s.departure_time,
          s.arrival_time,
          s.fare,
          bus.bus_id,
          bus.bus_name,
          bus.bus_type,
          o.operator_name,
          r.source,
          r.destination,
          r.distance_km,
          pay.payment_method,
          pay.payment_status,
          CAST(pay.payment_date AS CHAR) AS payment_date
        FROM bookings b
        JOIN passengers p ON b.passenger_id = p.passenger_id
        JOIN schedules s ON b.schedule_id = s.schedule_id
        JOIN buses bus ON s.bus_id = bus.bus_id
        JOIN routes r ON s.route_id = r.route_id
        LEFT JOIN operators o ON bus.operator_id = o.operator_id
        LEFT JOIN payments pay ON b.booking_id = pay.booking_id
        WHERE b.booking_id = ?
      `;

      const [rows] = (await pool.execute(sql, [bookingId])) as [
        BookingDetailRow[],
        unknown
      ];

      if (rows.length === 0) {
        return NextResponse.json(
          { message: "Booking not found." },
          { status: 404 }
        );
      }

      const booking = rows[0];

      // Fetch seat numbers
      const [seatRows] = (await pool.execute(
        `SELECT s.seat_number
         FROM booking_seats bs
         JOIN seats s ON bs.seat_id = s.seat_id
         WHERE bs.booking_id = ?
         ORDER BY s.seat_id`,
        [bookingId]
      )) as [SeatNumberRow[], unknown];

      const seatNumbers = seatRows.map((s) => s.seat_number);

      return NextResponse.json({
        booking: {
          ...booking,
          seats: seatNumbers,
        },
      });
    }

    // 2. Search bookings by passenger email, phone, or booking ID
    if (search) {
      const isNum = !isNaN(parseInt(search, 10));
      const sql = `
        SELECT
          b.booking_id,
          CAST(b.booking_date AS CHAR) AS booking_date,
          b.total_amount,
          b.booking_status,
          p.name AS passenger_name,
          p.email,
          p.phone,
          CAST(s.travel_date AS CHAR) AS travel_date,
          s.departure_time,
          s.arrival_time,
          bus.bus_name,
          bus.bus_type,
          o.operator_name,
          r.source,
          r.destination,
          GROUP_CONCAT(seats.seat_number ORDER BY seats.seat_id SEPARATOR ', ') AS seats_list
        FROM bookings b
        JOIN passengers p ON b.passenger_id = p.passenger_id
        JOIN schedules s ON b.schedule_id = s.schedule_id
        JOIN buses bus ON s.bus_id = bus.bus_id
        JOIN routes r ON s.route_id = r.route_id
        LEFT JOIN operators o ON bus.operator_id = o.operator_id
        JOIN booking_seats bs ON b.booking_id = bs.booking_id
        JOIN seats ON bs.seat_id = seats.seat_id
        WHERE LOWER(p.email) = LOWER(?)
           OR p.phone LIKE ?
           ${isNum ? "OR b.booking_id = ?" : ""}
        GROUP BY b.booking_id, p.passenger_id, s.schedule_id, bus.bus_id, r.route_id
        ORDER BY b.booking_id DESC
        LIMIT 20
      `;

      const params: (string | number)[] = [search, `%${search}%`];
      if (isNum) params.push(parseInt(search, 10));

      const [bookings] = (await pool.query(sql, params)) as [
        RowDataPacket[],
        unknown
      ];

      return NextResponse.json({ bookings });
    }

    // Default: fetch the 10 most recent bookings
    const defaultSql = `
      SELECT
        b.booking_id,
        CAST(b.booking_date AS CHAR) AS booking_date,
        b.total_amount,
        b.booking_status,
        p.name AS passenger_name,
        p.email,
        p.phone,
        CAST(s.travel_date AS CHAR) AS travel_date,
        s.departure_time,
        s.arrival_time,
        bus.bus_name,
        bus.bus_type,
        o.operator_name,
        r.source,
        r.destination,
        GROUP_CONCAT(seats.seat_number ORDER BY seats.seat_id SEPARATOR ', ') AS seats_list
      FROM bookings b
      JOIN passengers p ON b.passenger_id = p.passenger_id
      JOIN schedules s ON b.schedule_id = s.schedule_id
      JOIN buses bus ON s.bus_id = bus.bus_id
      JOIN routes r ON s.route_id = r.route_id
      LEFT JOIN operators o ON bus.operator_id = o.operator_id
      JOIN booking_seats bs ON b.booking_id = bs.booking_id
      JOIN seats ON bs.seat_id = seats.seat_id
      GROUP BY b.booking_id, p.passenger_id, s.schedule_id, bus.bus_id, r.route_id
      ORDER BY b.booking_id DESC
      LIMIT 10
    `;
    const [recentBookings] = (await pool.query(defaultSql)) as [
      RowDataPacket[],
      unknown
    ];

    return NextResponse.json({ bookings: recentBookings });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json(
      { message: "Failed to fetch bookings." },
      { status: 500 }
    );
  }
}
