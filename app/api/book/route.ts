import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";

interface BookingRequestBody {
  schedule_id: number;
  seat_ids: number[];
  passenger_name: string;
  email: string;
  phone: string;
  payment_method?: string;
}

interface ScheduleRow extends RowDataPacket {
  schedule_id: number;
  fare: number;
  total_seats: number;
  bus_id: number;
}

interface PassengerRow extends RowDataPacket {
  passenger_id: number;
}

interface SeatRow extends RowDataPacket {
  seat_id: number;
  seat_number: string;
}

export async function POST(request: Request) {
  let connection: PoolConnection | null = null;
  try {
    const body = (await request.json()) as BookingRequestBody;
    const { schedule_id, seat_ids, passenger_name, email, phone } = body;
    const payment_method = body.payment_method?.trim() || "UPI";

    if (!schedule_id || !seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return NextResponse.json(
        { message: "Please select at least one seat to proceed with booking." },
        { status: 400 }
      );
    }

    if (!passenger_name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { message: "Please provide passenger name, email, and phone number." },
        { status: 400 }
      );
    }

    // Acquire dedicated connection for transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Fetch schedule and fare
    const [scheduleRows] = (await connection.execute(
      `SELECT s.schedule_id, s.fare, s.bus_id, b.total_seats
       FROM schedules s
       JOIN buses b ON s.bus_id = b.bus_id
       WHERE s.schedule_id = ?`,
      [schedule_id]
    )) as [ScheduleRow[], unknown];

    if (scheduleRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Selected bus schedule not found." },
        { status: 404 }
      );
    }

    const schedule = scheduleRows[0];
    const farePerSeat = Number(schedule.fare);
    const totalAmount = farePerSeat * seat_ids.length;

    // 2. Validate seat availability (prevent double-booking)
    const placeholders = seat_ids.map(() => "?").join(",");
    const [conflictRows] = (await connection.query(
      `SELECT bs.seat_id, s.seat_number
       FROM booking_seats bs
       JOIN seats s ON bs.seat_id = s.seat_id
       WHERE bs.schedule_id = ? AND bs.seat_id IN (${placeholders})`,
      [schedule_id, ...seat_ids]
    )) as [RowDataPacket[], unknown];

    if (conflictRows.length > 0) {
      await connection.rollback();
      const bookedNumbers = conflictRows.map((r) => r.seat_number).join(", ");
      return NextResponse.json(
        {
          message: `The following seat(s) were just booked by someone else: ${bookedNumbers}. Please pick other seats.`,
        },
        { status: 409 }
      );
    }

    // 3. Upsert passenger
    await connection.execute(
      `INSERT INTO passengers (name, email, phone)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone)`,
      [passenger_name.trim(), email.trim().toLowerCase(), phone.trim()]
    );

    const [passengerRows] = (await connection.execute(
      `SELECT passenger_id FROM passengers WHERE email = ?`,
      [email.trim().toLowerCase()]
    )) as [PassengerRow[], unknown];

    if (passengerRows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Failed to record passenger details." },
        { status: 500 }
      );
    }

    const passengerId = passengerRows[0].passenger_id;

    // 4. Create booking record
    const [bookingResult] = (await connection.execute(
      `INSERT INTO bookings (passenger_id, schedule_id, booking_date, total_amount, booking_status)
       VALUES (?, ?, NOW(), ?, 'CONFIRMED')`,
      [passengerId, schedule_id, totalAmount]
    )) as [ResultSetHeader, unknown];

    const bookingId = bookingResult.insertId;

    // 5. Reserve each seat in booking_seats
    for (const seatId of seat_ids) {
      await connection.execute(
        `INSERT INTO booking_seats (booking_id, schedule_id, seat_id)
         VALUES (?, ?, ?)`,
        [bookingId, schedule_id, seatId]
      );
    }

    // 6. Record payment
    await connection.execute(
      `INSERT INTO payments (booking_id, payment_amount, payment_method, payment_status, payment_date)
       VALUES (?, ?, ?, 'Success', NOW())`,
      [bookingId, totalAmount, payment_method]
    );

    // Commit transaction
    await connection.commit();

    // 7. Fetch seat numbers for confirmation
    const [seatRows] = (await pool.query(
      `SELECT seat_number FROM seats WHERE seat_id IN (${placeholders}) ORDER BY seat_id`,
      seat_ids
    )) as [SeatRow[], unknown];
    const seatNumbers = seatRows.map((s) => s.seat_number);

    return NextResponse.json({
      success: true,
      message: "Booking confirmed successfully!",
      booking_id: bookingId,
      total_amount: totalAmount,
      seats: seatNumbers,
      passenger_name: passenger_name.trim(),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Booking transaction error:", error);
    return NextResponse.json(
      { message: "Failed to complete booking. Please try again." },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
