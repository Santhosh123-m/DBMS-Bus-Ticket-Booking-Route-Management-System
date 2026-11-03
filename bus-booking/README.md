# 🚌 Online Bus Ticket Booking System

A full-stack Bus Ticket Booking mini-project built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **MySQL 8**.

---

## 🌟 Key Features

1. **Smart Bus Search**:
   - Source & Destination selection with autocomplete and 1-click popular routes (Bangalore ➔ Mysore, Bangalore ➔ Chennai, Mysore ➔ Mangalore, etc.).
   - Date picker with quick shortcuts and alternative date recommendations if no direct buses run on an off-peak date.
   - Filters by Bus Type (AC Sleeper, AC Seater, Non-AC) and sorting by Departure Time or Lowest Fare.

2. **Interactive Seat Selection & Layout**:
   - Visual 20-seat bus layout with driver cabin orientation and aisle gap.
   - Real-time seat availability color coding:
     - ⚪ Available
     - 🔵 Selected
     - 🔘 Booked / Taken (disabled)
   - Real-time price calculation (Selected Seats × Fare).

3. **Passenger Checkout & Booking Engine**:
   - Passenger details capture (Name, Email, Mobile number).
   - Multiple payment options (UPI, Credit/Debit Card, Net Banking, Pay at Boarding).
   - Atomic database transactions with double-booking prevention (`UNIQUE (schedule_id, seat_id)`).

4. **Instant E-Ticket Generation & Printable View**:
   - Dedicated printable e-ticket modal with booking reference (`#BUS-XXXX`), journey details, passenger information, and fare summary.
   - Standalone URL ticket view at `/ticket/[id]`.
   - Built-in print / save PDF styling.

5. **My Bookings & Ticket Lookup**:
   - Search past and active bookings by Email, Phone number, or Booking ID.

---

## 🛠️ Technology Stack

- **Framework:** Next.js 16.4 (App Router, Turbopack)
- **Frontend:** React 19, TypeScript
- **Database:** MySQL 8 with connection pooling (`mysql2`)
- **Styling:** Responsive modern CSS with print support

---

## 🗄️ Database Schema

The system connects to MySQL database `bus_booking`:
- `operators` (operator_id, operator_name)
- `buses` (bus_id, bus_name, bus_type, total_seats, operator_id)
- `routes` (route_id, source, destination, distance_km)
- `schedules` (schedule_id, bus_id, route_id, travel_date, departure_time, arrival_time, fare)
- `seats` (seat_id, bus_id, seat_number)
- `passengers` (passenger_id, name, email [UNIQUE], phone)
- `bookings` (booking_id, passenger_id, schedule_id, booking_date, total_amount, booking_status)
- `booking_seats` (booking_seat_id, booking_id, schedule_id, seat_id [UNIQUE schedule_id + seat_id])
- `payments` (payment_id, booking_id, payment_amount, payment_method, payment_status, payment_date)

---

## 🚀 Running the Project

### 1. Ensure MySQL is Running
Make sure the MySQL service is active on `localhost:3306` with database `bus_booking` and credentials matching `.env.local`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Santhu@123
DB_NAME=bus_booking
```

### 2. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Start
```bash
npm run build
npm start
```

---

## 📡 API Endpoints

- `GET /api/routes` — Returns distinct source/destination cities and route pairs.
- `GET /api/buses?from=...&to=...&date=...` — Searches buses matching route and date.
- `GET /api/seats?schedule_id=...` — Returns seat map with booked status.
- `POST /api/book` — Creates booking, passenger record, reserves seats, and creates payment in a single transaction.
- `GET /api/bookings?booking_id=...` — Returns full ticket details.
- `GET /api/bookings?search=...` — Finds bookings by email, phone, or booking ID.
