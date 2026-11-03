"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface BookingDetails {
  booking_id: number;
  booking_date: string;
  total_amount: number | string;
  booking_status: string;
  passenger_name: string;
  email: string;
  phone: string;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  bus_name: string;
  bus_type: string;
  operator_name: string | null;
  source: string;
  destination: string;
  distance_km?: number | string;
  payment_method?: string | null;
  seats: string[];
}

export default function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTicket() {
      try {
        const res = await fetch(`/api/bookings?booking_id=${bookingId}`);
        const data = await res.json();
        if (res.ok && data.booking) {
          setBooking(data.booking);
        } else {
          setError(data.message || "Ticket not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load ticket.");
      } finally {
        setLoading(false);
      }
    }
    loadTicket();
  }, [bookingId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
        Loading ticket details...
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ maxWidth: "500px", margin: "60px auto", padding: "30px", background: "white", borderRadius: "12px", textAlign: "center" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "10px" }}>Ticket Not Found</h2>
        <p style={{ color: "#64748b", marginBottom: "20px" }}>{error || "Invalid booking ID."}</p>
        <Link href="/" style={{ background: "#123b70", color: "white", padding: "10px 20px", borderRadius: "6px", textDecoration: "none", fontWeight: "600" }}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "40px 20px" }}>
      <div
        className="ticket-print-container"
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ background: "#123b70", color: "white", padding: "26px", textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "800" }}>Official E-Ticket</h1>
          <p style={{ fontSize: "13px", opacity: 0.85, marginTop: "4px" }}>
            BusTicket Express Reservation Confirmation
          </p>
        </div>

        <div style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #cbd5e1", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>BOOKING REF</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "#123b70" }}>
                #BUS-{booking.booking_id}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>STATUS</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#059669" }}>
                ✓ {booking.booking_status}
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "10px", marginBottom: "20px" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "#1e293b" }}>
              {booking.source} ➔ {booking.destination}
            </div>
            <div style={{ fontSize: "14px", color: "#475569", marginTop: "4px" }}>
              {booking.bus_name} ({booking.bus_type}) {booking.operator_name ? `• ${booking.operator_name}` : ""}
            </div>
            <div style={{ display: "flex", gap: "24px", marginTop: "12px", fontSize: "14px" }}>
              <div>
                <strong>Date:</strong> {booking.travel_date}
              </div>
              <div>
                <strong>Departure:</strong> {booking.departure_time?.slice(0, 5)}
              </div>
              <div>
                <strong>Arrival:</strong> {booking.arrival_time?.slice(0, 5)}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px", fontSize: "14px" }}>
            <div>
              <span style={{ color: "#64748b" }}>Passenger Name:</span>
              <div style={{ fontWeight: "700" }}>{booking.passenger_name}</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Phone Number:</span>
              <div style={{ fontWeight: "700" }}>{booking.phone}</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Email:</span>
              <div style={{ fontWeight: "700" }}>{booking.email}</div>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>Seat Number(s):</span>
              <div style={{ fontWeight: "800", color: "#123b70", fontSize: "16px" }}>
                {Array.isArray(booking.seats) ? booking.seats.join(", ") : booking.seats}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Payment Method</div>
              <div style={{ fontSize: "14px", fontWeight: "600" }}>{booking.payment_method || "UPI"} (Paid)</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Total Paid</div>
              <div style={{ fontSize: "24px", fontWeight: "800", color: "#ff6b35" }}>
                ₹{Number(booking.total_amount).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", gap: "12px", marginTop: "30px" }}>
            <button
              onClick={() => window.print()}
              style={{
                flex: 1,
                padding: "12px",
                background: "#123b70",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
              }}
            >
              🖨️ Print Ticket
            </button>
            <Link
              href="/"
              style={{
                flex: 1,
                padding: "12px",
                background: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontWeight: "600",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Book Another Ticket
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
