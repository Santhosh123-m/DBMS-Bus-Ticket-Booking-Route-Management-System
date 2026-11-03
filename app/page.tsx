"use client";

import { useState, useEffect } from "react";

interface Bus {
  bus_id: number;
  bus_name: string;
  bus_type: string;
  total_seats: number;
  operator_name: string | null;
  schedule_id: number;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  fare: number | string;
  source: string;
  destination: string;
  distance_km: number | string;
  available_seats: number;
}

interface Seat {
  seat_id: number;
  seat_number: string;
  is_booked: boolean;
}

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
  payment_status?: string | null;
  seats: string[] | string;
  seats_list?: string;
}

interface RouteItem {
  route_id: number;
  source: string;
  destination: string;
  distance_km: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"search" | "my-bookings" | "routes">("search");

  // Search states
  const [source, setSource] = useState("Bangalore");
  const [destination, setDestination] = useState("Mysore");
  const [date, setDate] = useState("2026-11-03");
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<RouteItem[]>([]);

  // Bus results
  const [buses, setBuses] = useState<Bus[]>([]);
  const [searched, setSearched] = useState(false);
  const [loadingBuses, setLoadingBuses] = useState(false);
  const [alternativeDates, setAlternativeDates] = useState<string[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"time" | "fare">("time");

  // Seat selection states
  const [activeScheduleId, setActiveScheduleId] = useState<number | null>(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  // Checkout & Booking states
  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // Confirmation modal
  const [confirmedBooking, setConfirmedBooking] = useState<BookingDetails | null>(null);

  // My Bookings tab state
  const [myBookingsSearch, setMyBookingsSearch] = useState("");
  const [myBookingsList, setMyBookingsList] = useState<BookingDetails[]>([]);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);

  // Load available routes on mount
  useEffect(() => {
    fetchRoutes();
    // Default search for Bangalore to Mysore
    handleSearch("Bangalore", "Mysore", "2026-11-03");
  }, []);

  async function fetchRoutes() {
    try {
      const res = await fetch("/api/routes");
      const data = await res.json();
      if (res.ok) {
        setAvailableSources(data.sources || []);
        setAvailableDestinations(data.destinations || []);
        setPopularRoutes(data.routes || []);
      }
    } catch (err) {
      console.error("Failed to load routes:", err);
    }
  }

  async function handleSearch(src = source, dest = destination, dt = date) {
    if (!src.trim() || !dest.trim()) {
      setSearchMessage("Please select both source and destination cities.");
      return;
    }
    if (src.trim().toLowerCase() === dest.trim().toLowerCase()) {
      setSearchMessage("Source and destination cannot be the same city.");
      return;
    }

    setLoadingBuses(true);
    setSearchMessage("");
    setSearched(true);
    setActiveScheduleId(null);
    setSelectedSeatIds([]);

    try {
      const url = `/api/buses?from=${encodeURIComponent(src.trim())}&to=${encodeURIComponent(dest.trim())}${dt ? `&date=${dt}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setBuses(data.buses || []);
        setAlternativeDates(data.alternativeDates || []);
      } else {
        setSearchMessage(data.message || "Failed to search buses.");
        setBuses([]);
      }
    } catch (err) {
      console.error(err);
      setSearchMessage("Failed to reach server. Please ensure database is running.");
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  }

  function handleSwapCities() {
    const temp = source;
    setSource(destination);
    setDestination(temp);
  }

  async function openSeatSelector(scheduleId: number) {
    if (activeScheduleId === scheduleId) {
      setActiveScheduleId(null);
      setSelectedSeatIds([]);
      return;
    }

    setActiveScheduleId(scheduleId);
    setSelectedSeatIds([]);
    setBookingError("");
    setLoadingSeats(true);

    try {
      const res = await fetch(`/api/seats?schedule_id=${scheduleId}`);
      const data = await res.json();
      if (res.ok) {
        setSeats(data.seats || []);
      } else {
        setBookingError(data.message || "Failed to load seat layout.");
      }
    } catch (err) {
      console.error(err);
      setBookingError("Error loading seats.");
    } finally {
      setLoadingSeats(false);
    }
  }

  function toggleSeat(seatId: number) {
    if (selectedSeatIds.includes(seatId)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seatId));
    } else {
      if (selectedSeatIds.length >= 6) {
        alert("Maximum 6 seats can be selected per booking.");
        return;
      }
      setSelectedSeatIds([...selectedSeatIds, seatId]);
    }
  }

  async function handleConfirmBooking(schedule: Bus) {
    setBookingError("");
    if (selectedSeatIds.length === 0) {
      setBookingError("Please select at least 1 seat.");
      return;
    }
    if (!passengerName.trim()) {
      setBookingError("Please enter passenger full name.");
      return;
    }
    if (!passengerEmail.trim() || !passengerEmail.includes("@")) {
      setBookingError("Please enter a valid email address.");
      return;
    }
    if (!passengerPhone.trim() || passengerPhone.length < 8) {
      setBookingError("Please enter a valid phone number.");
      return;
    }

    setIsBooking(true);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: schedule.schedule_id,
          seat_ids: selectedSeatIds,
          passenger_name: passengerName,
          email: passengerEmail,
          phone: passengerPhone,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.message || "Booking failed.");
        setIsBooking(false);
        return;
      }

      // Fetch confirmed booking details to display ticket
      const ticketRes = await fetch(`/api/bookings?booking_id=${data.booking_id}`);
      const ticketData = await ticketRes.json();

      if (ticketRes.ok && ticketData.booking) {
        setConfirmedBooking(ticketData.booking);
      } else {
        // Fallback ticket structure
        setConfirmedBooking({
          booking_id: data.booking_id,
          booking_date: new Date().toISOString(),
          total_amount: data.total_amount,
          booking_status: "CONFIRMED",
          passenger_name: passengerName,
          email: passengerEmail,
          phone: passengerPhone,
          travel_date: schedule.travel_date,
          departure_time: schedule.departure_time,
          arrival_time: schedule.arrival_time,
          bus_name: schedule.bus_name,
          bus_type: schedule.bus_type,
          operator_name: schedule.operator_name,
          source: schedule.source,
          destination: schedule.destination,
          payment_method: paymentMethod,
          payment_status: "Success",
          seats: data.seats,
        });
      }

      // Refresh bus results to update available count
      handleSearch();
    } catch (err) {
      console.error(err);
      setBookingError("An unexpected error occurred during booking.");
    } finally {
      setIsBooking(false);
    }
  }

  async function handleSearchMyBookings() {
    setLoadingMyBookings(true);
    try {
      const url = myBookingsSearch.trim()
        ? `/api/bookings?search=${encodeURIComponent(myBookingsSearch.trim())}`
        : `/api/bookings`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setMyBookingsList(data.bookings || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyBookings(false);
    }
  }

  // Filter and sort buses
  const filteredBuses = buses
    .filter((b) => {
      if (filterType === "ALL") return true;
      if (filterType === "AC") return b.bus_type.toLowerCase().includes("ac");
      if (filterType === "NON_AC") return b.bus_type.toLowerCase().includes("non ac");
      if (filterType === "SLEEPER") return b.bus_type.toLowerCase().includes("sleeper");
      if (filterType === "SEATER") return b.bus_type.toLowerCase().includes("seater");
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "fare") return Number(a.fare) - Number(b.fare);
      return a.departure_time.localeCompare(b.departure_time);
    });

  const activeBus = buses.find((b) => b.schedule_id === activeScheduleId);
  const selectedSeatObjects = seats.filter((s) => selectedSeatIds.includes(s.seat_id));
  const totalAmount = activeBus ? Number(activeBus.fare) * selectedSeatIds.length : 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <header
        className="no-print"
        style={{
          background: "linear-gradient(135deg, #123b70 0%, #1e5296 100%)",
          color: "white",
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            maxWidth: "1150px",
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            onClick={() => setActiveTab("search")}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "white",
                color: "#123b70",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              🚌
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "0.5px" }}>
                BusTicket Express
              </h1>
              <p style={{ fontSize: "12px", opacity: 0.85 }}>Online Bus Booking & Reservation</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("search")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "600",
                fontSize: "14px",
                background: activeTab === "search" ? "white" : "rgba(255,255,255,0.15)",
                color: activeTab === "search" ? "#123b70" : "white",
              }}
            >
              🔍 Book Tickets
            </button>
            <button
              onClick={() => {
                setActiveTab("my-bookings");
                handleSearchMyBookings();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "600",
                fontSize: "14px",
                background: activeTab === "my-bookings" ? "white" : "rgba(255,255,255,0.15)",
                color: activeTab === "my-bookings" ? "#123b70" : "white",
              }}
            >
              🎫 My Bookings
            </button>
            <button
              onClick={() => setActiveTab("routes")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                fontWeight: "600",
                fontSize: "14px",
                background: activeTab === "routes" ? "white" : "rgba(255,255,255,0.15)",
                color: activeTab === "routes" ? "#123b70" : "white",
              }}
            >
              🗺️ All Routes
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: "1150px", width: "100%", margin: "0 auto", padding: "25px 20px" }}>
        {/* TAB 1: SEARCH & BOOK */}
        {activeTab === "search" && (
          <div>
            {/* Search Box Card */}
            <div
              className="no-print"
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                marginBottom: "30px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontSize: "24px", color: "#123b70", fontWeight: "700" }}>
                  Find & Book Bus Tickets
                </h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
                  Guaranteed seats with instant booking & verified operators
                </p>
              </div>

              {/* Form Inputs Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "15px",
                  alignItems: "end",
                }}
              >
                {/* From Input */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                    From City
                  </label>
                  <input
                    type="text"
                    list="source-list"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Bangalore"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                    }}
                  />
                  <datalist id="source-list">
                    {availableSources.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Swap Button */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={handleSwapCities}
                    title="Swap Source & Destination"
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#123b70",
                    }}
                  >
                    ⇄
                  </button>
                </div>

                {/* To Input */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                    To City
                  </label>
                  <input
                    type="text"
                    list="dest-list"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Mysore"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                    }}
                  />
                  <datalist id="dest-list">
                    {availableDestinations.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* Travel Date */}
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" }}>
                    Date of Journey
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "15px",
                    }}
                  />
                </div>

                {/* Search Button */}
                <div>
                  <button
                    onClick={() => handleSearch()}
                    disabled={loadingBuses}
                    style={{
                      width: "100%",
                      padding: "13px 20px",
                      background: "#ff6b35",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "700",
                      fontSize: "15px",
                      boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {loadingBuses ? "Searching..." : "🔍 Search Buses"}
                  </button>
                </div>
              </div>

              {/* Quick Popular Route Pills */}
              <div style={{ marginTop: "18px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Popular Routes:</span>
                {[
                  { from: "Bangalore", to: "Mysore" },
                  { from: "Bangalore", to: "Chennai" },
                  { from: "Mysore", to: "Mangalore" },
                  { from: "Mysore", to: "Bangalore" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSource(item.from);
                      setDestination(item.to);
                      handleSearch(item.from, item.to, date);
                    }}
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "4px 10px",
                      borderRadius: "15px",
                      fontSize: "12px",
                      fontWeight: "500",
                    }}
                  >
                    {item.from} ➔ {item.to}
                  </button>
                ))}
              </div>

              {searchMessage && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px 16px",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: "8px",
                    fontSize: "14px",
                    border: "1px solid #fecaca",
                  }}
                >
                  {searchMessage}
                </div>
              )}
            </div>

            {/* Results Header / Filters */}
            {searched && (
              <div
                className="no-print"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                    {source} ➔ {destination}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748b" }}>
                    {filteredBuses.length} {filteredBuses.length === 1 ? "bus" : "buses"} available on {date}
                  </p>
                </div>

                {/* Filter and Sort controls */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "white",
                    }}
                  >
                    <option value="ALL">All Bus Types</option>
                    <option value="AC">AC Only</option>
                    <option value="NON_AC">Non-AC Only</option>
                    <option value="SLEEPER">Sleeper Only</option>
                    <option value="SEATER">Seater Only</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "time" | "fare")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      background: "white",
                    }}
                  >
                    <option value="time">Sort by: Departure Time</option>
                    <option value="fare">Sort by: Lowest Fare</option>
                  </select>
                </div>
              </div>
            )}

            {/* Empty State / Alternative Dates */}
            {searched && !loadingBuses && filteredBuses.length === 0 && (
              <div
                style={{
                  background: "white",
                  padding: "40px 20px",
                  borderRadius: "14px",
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "42px", marginBottom: "12px" }}>🚌💨</div>
                <h3 style={{ fontSize: "20px", color: "#1e293b", fontWeight: "700" }}>
                  No buses found for this date
                </h3>
                <p style={{ color: "#64748b", margin: "8px 0 20px 0", fontSize: "14px" }}>
                  We couldn&apos;t find any buses running from {source} to {destination} on {date}.
                </p>

                {alternativeDates.length > 0 && (
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "10px" }}>
                      Buses are available on these upcoming dates:
                    </p>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                      {alternativeDates.map((alt) => (
                        <button
                          key={alt}
                          onClick={() => {
                            setDate(alt);
                            handleSearch(source, destination, alt);
                          }}
                          style={{
                            background: "#123b70",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          📅 {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bus Cards List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredBuses.map((bus) => {
                const isExpanded = activeScheduleId === bus.schedule_id;
                const formattedFare = Number(bus.fare).toFixed(2);

                return (
                  <div
                    key={bus.schedule_id}
                    style={{
                      background: "white",
                      borderRadius: "14px",
                      border: isExpanded ? "2px solid #123b70" : "1px solid #e2e8f0",
                      boxShadow: isExpanded
                        ? "0 6px 20px rgba(18, 59, 112, 0.12)"
                        : "0 2px 8px rgba(0,0,0,0.04)",
                      overflow: "hidden",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Bus Card Header Summary */}
                    <div
                      style={{
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "20px",
                      }}
                    >
                      {/* Operator & Bus Info */}
                      <div style={{ minWidth: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h4 style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                            {bus.bus_name}
                          </h4>
                          {bus.operator_name && (
                            <span
                              style={{
                                background: "#f1f5f9",
                                color: "#475569",
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: "600",
                              }}
                            >
                              {bus.operator_name}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                          {bus.bus_type} • {bus.distance_km} km
                        </p>
                      </div>

                      {/* Schedule Timing */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", textAlign: "center" }}>
                        <div>
                          <div style={{ fontSize: "20px", fontWeight: "700", color: "#123b70" }}>
                            {bus.departure_time.slice(0, 5)}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{bus.source}</div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600" }}>➔</div>
                          <div
                            style={{
                              width: "60px",
                              height: "2px",
                              background: "#cbd5e1",
                              margin: "2px 0",
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: "20px", fontWeight: "700", color: "#123b70" }}>
                            {bus.arrival_time.slice(0, 5)}
                          </div>
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{bus.destination}</div>
                        </div>
                      </div>

                      {/* Seats & Price */}
                      <div style={{ textAlign: "right", minWidth: "140px" }}>
                        <div style={{ fontSize: "22px", fontWeight: "800", color: "#ff6b35" }}>
                          ₹{formattedFare}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: bus.available_seats > 5 ? "#10b981" : "#f59e0b",
                            marginTop: "2px",
                          }}
                        >
                          {bus.available_seats} seats available
                        </div>
                      </div>

                      {/* Toggle Seats Button */}
                      <div>
                        <button
                          onClick={() => openSeatSelector(bus.schedule_id)}
                          style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "none",
                            background: isExpanded ? "#123b70" : "#eff6ff",
                            color: isExpanded ? "white" : "#1d4ed8",
                            fontWeight: "700",
                            fontSize: "14px",
                          }}
                        >
                          {isExpanded ? "Close Seats ▲" : "Select Seats ▼"}
                        </button>
                      </div>
                    </div>

                    {/* EXPANDED SEAT SELECTION & BOOKING SECTION */}
                    {isExpanded && (
                      <div
                        style={{
                          background: "#f8fafc",
                          borderTop: "1px solid #e2e8f0",
                          padding: "24px",
                        }}
                      >
                        {loadingSeats ? (
                          <div style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                            Loading real-time seat availability...
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                            {/* Seat Grid Layout */}
                            <div
                              style={{
                                background: "white",
                                padding: "20px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "16px",
                                }}
                              >
                                <h5 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
                                  Choose Your Seat(s)
                                </h5>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                  Max 6 seats
                                </div>
                              </div>

                              {/* Bus Front Indicator (Driver) */}
                              <div
                                style={{
                                  background: "#f1f5f9",
                                  padding: "8px",
                                  borderRadius: "6px",
                                  textAlign: "right",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#64748b",
                                  marginBottom: "16px",
                                }}
                              >
                                💺 Driver Cabin / Front
                              </div>

                              {/* Seat Layout (4 seats per row with aisle) */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(4, 1fr)",
                                  gap: "10px",
                                  justifyItems: "center",
                                  maxWidth: "280px",
                                  margin: "0 auto",
                                }}
                              >
                                {seats.map((seat, index) => {
                                  const isSelected = selectedSeatIds.includes(seat.seat_id);
                                  const isBooked = seat.is_booked;

                                  // Add aisle margin between seat 2 and 3
                                  const isRightSide = index % 4 >= 2;

                                  return (
                                    <button
                                      key={seat.seat_id}
                                      disabled={isBooked}
                                      onClick={() => toggleSeat(seat.seat_id)}
                                      title={
                                        isBooked
                                          ? `Seat ${seat.seat_number} is already booked`
                                          : `Seat ${seat.seat_number}`
                                      }
                                      style={{
                                        width: "48px",
                                        height: "44px",
                                        borderRadius: "6px",
                                        border: isSelected
                                          ? "2px solid #123b70"
                                          : isBooked
                                          ? "1px solid #e2e8f0"
                                          : "1px solid #cbd5e1",
                                        background: isSelected
                                          ? "#123b70"
                                          : isBooked
                                          ? "#e2e8f0"
                                          : "white",
                                        color: isSelected
                                          ? "white"
                                          : isBooked
                                          ? "#94a3b8"
                                          : "#1e293b",
                                        fontWeight: "700",
                                        fontSize: "12px",
                                        cursor: isBooked ? "not-allowed" : "pointer",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginLeft: isRightSide && index % 4 === 2 ? "12px" : "0",
                                        boxShadow: isSelected ? "0 2px 6px rgba(18,59,112,0.3)" : "none",
                                      }}
                                    >
                                      <span>{seat.seat_number}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Legend */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: "16px",
                                  marginTop: "20px",
                                  fontSize: "12px",
                                  color: "#64748b",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ width: "14px", height: "14px", background: "white", border: "1px solid #cbd5e1", borderRadius: "3px" }} />
                                  <span>Available</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ width: "14px", height: "14px", background: "#123b70", borderRadius: "3px" }} />
                                  <span>Selected</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ width: "14px", height: "14px", background: "#e2e8f0", borderRadius: "3px" }} />
                                  <span>Booked</span>
                                </div>
                              </div>
                            </div>

                            {/* Booking & Passenger Form */}
                            <div
                              style={{
                                background: "white",
                                padding: "20px",
                                borderRadius: "12px",
                                border: "1px solid #e2e8f0",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                              }}
                            >
                              <div>
                                <h5 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginBottom: "16px" }}>
                                  Passenger & Fare Summary
                                </h5>

                                {/* Selection summary pill */}
                                <div
                                  style={{
                                    background: "#eff6ff",
                                    padding: "12px 16px",
                                    borderRadius: "8px",
                                    marginBottom: "16px",
                                    border: "1px solid #bfdbfe",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                                    <span style={{ color: "#475569" }}>Selected Seats:</span>
                                    <span style={{ fontWeight: "700", color: "#1d4ed8" }}>
                                      {selectedSeatObjects.length > 0
                                        ? selectedSeatObjects.map((s) => s.seat_number).join(", ")
                                        : "None selected yet"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: "700" }}>
                                    <span style={{ color: "#1e293b" }}>Total Amount:</span>
                                    <span style={{ color: "#ff6b35" }}>₹{totalAmount.toFixed(2)}</span>
                                  </div>
                                </div>

                                {/* Form Inputs */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                  <div>
                                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>
                                      Full Name *
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Sanjay Kumar"
                                      value={passengerName}
                                      onChange={(e) => setPassengerName(e.target.value)}
                                      style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                      }}
                                    />
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                    <div>
                                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>
                                        Email *
                                      </label>
                                      <input
                                        type="email"
                                        placeholder="sanjay@mail.com"
                                        value={passengerEmail}
                                        onChange={(e) => setPassengerEmail(e.target.value)}
                                        style={{
                                          width: "100%",
                                          padding: "10px",
                                          borderRadius: "6px",
                                          border: "1px solid #cbd5e1",
                                          fontSize: "14px",
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>
                                        Mobile Number *
                                      </label>
                                      <input
                                        type="tel"
                                        placeholder="9876543210"
                                        value={passengerPhone}
                                        onChange={(e) => setPassengerPhone(e.target.value)}
                                        style={{
                                          width: "100%",
                                          padding: "10px",
                                          borderRadius: "6px",
                                          border: "1px solid #cbd5e1",
                                          fontSize: "14px",
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>
                                      Payment Method
                                    </label>
                                    <select
                                      value={paymentMethod}
                                      onChange={(e) => setPaymentMethod(e.target.value)}
                                      style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: "6px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        background: "white",
                                      }}
                                    >
                                      <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                                      <option value="Credit/Debit Card">Credit / Debit Card</option>
                                      <option value="Net Banking">Net Banking</option>
                                      <option value="Pay at Boarding">Pay at Boarding</option>
                                    </select>
                                  </div>
                                </div>

                                {bookingError && (
                                  <div
                                    style={{
                                      marginTop: "12px",
                                      padding: "10px 12px",
                                      background: "#fef2f2",
                                      color: "#b91c1c",
                                      borderRadius: "6px",
                                      fontSize: "13px",
                                      border: "1px solid #fecaca",
                                    }}
                                  >
                                    {bookingError}
                                  </div>
                                )}
                              </div>

                              {/* Submit Button */}
                              <div style={{ marginTop: "20px" }}>
                                <button
                                  onClick={() => handleConfirmBooking(bus)}
                                  disabled={isBooking || selectedSeatIds.length === 0}
                                  style={{
                                    width: "100%",
                                    padding: "13px",
                                    background: selectedSeatIds.length === 0 ? "#cbd5e1" : "#10b981",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                    fontSize: "15px",
                                    cursor: selectedSeatIds.length === 0 ? "not-allowed" : "pointer",
                                    boxShadow:
                                      selectedSeatIds.length > 0
                                        ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                                        : "none",
                                  }}
                                >
                                  {isBooking
                                    ? "Processing Booking..."
                                    : selectedSeatIds.length === 0
                                    ? "Select Seat(s) to Proceed"
                                    : `Confirm & Pay ₹${totalAmount.toFixed(2)}`}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MY BOOKINGS */}
        {activeTab === "my-bookings" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", color: "#123b70", fontWeight: "700" }}>
                My Bookings & Tickets
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
                Enter your email address, phone number, or booking reference number to find your tickets.
              </p>
            </div>

            {/* Search Box */}
            <div style={{ display: "flex", gap: "10px", maxWidth: "600px", marginBottom: "25px" }}>
              <input
                type="text"
                placeholder="Search by email, phone, or booking ID..."
                value={myBookingsSearch}
                onChange={(e) => setMyBookingsSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchMyBookings()}
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "15px",
                }}
              />
              <button
                onClick={handleSearchMyBookings}
                style={{
                  padding: "12px 24px",
                  background: "#123b70",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "700",
                }}
              >
                Search
              </button>
            </div>

            {loadingMyBookings ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                Searching bookings...
              </div>
            ) : myBookingsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>🎫</div>
                <p style={{ fontWeight: "600", fontSize: "16px", color: "#1e293b" }}>No bookings found</p>
                <p style={{ fontSize: "14px", marginTop: "4px" }}>
                  Try searching with your email or phone number.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {myBookingsList.map((item) => (
                  <div
                    key={item.booking_id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "18px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "15px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontWeight: "800", color: "#123b70", fontSize: "16px" }}>
                          #{item.booking_id}
                        </span>
                        <span
                          style={{
                            background: "#ecfdf5",
                            color: "#059669",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "10px",
                          }}
                        >
                          {item.booking_status}
                        </span>
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
                        {item.source} ➔ {item.destination}
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                        {item.bus_name} • {item.travel_date} at {item.departure_time?.slice(0, 5)}
                      </div>
                      <div style={{ fontSize: "13px", color: "#475569", marginTop: "4px" }}>
                        Seats: <strong style={{ color: "#123b70" }}>{item.seats_list || (Array.isArray(item.seats) ? item.seats.join(", ") : item.seats)}</strong> • Passenger: {item.passenger_name} ({item.phone})
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#ff6b35" }}>
                        ₹{Number(item.total_amount).toFixed(2)}
                      </div>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/bookings?booking_id=${item.booking_id}`);
                          const data = await res.json();
                          if (res.ok && data.booking) {
                            setConfirmedBooking(data.booking);
                          }
                        }}
                        style={{
                          marginTop: "8px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontWeight: "600",
                          fontSize: "13px",
                        }}
                      >
                        🖨️ View & Print Ticket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROUTES & FARES */}
        {activeTab === "routes" && (
          <div style={{ background: "white", borderRadius: "16px", padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", color: "#123b70", fontWeight: "700" }}>
                Connected Routes & Schedules
              </h2>
              <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
                Daily direct bus departures across Karnataka and neighboring states.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {popularRoutes.map((r) => (
                <div
                  key={r.route_id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    background: "#f8fafc",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: "700", color: "#123b70" }}>
                      {r.source} ➔ {r.destination}
                    </div>
                    <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                      Distance: ~{r.distance_km} km
                    </p>
                    <p style={{ fontSize: "12px", color: "#10b981", fontWeight: "600", marginTop: "6px" }}>
                      ✓ Daily Airavat & Volvo Services
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSource(r.source);
                      setDestination(r.destination);
                      setActiveTab("search");
                      handleSearch(r.source, r.destination, date);
                    }}
                    style={{
                      marginTop: "16px",
                      background: "#123b70",
                      color: "white",
                      border: "none",
                      padding: "9px 14px",
                      borderRadius: "6px",
                      fontWeight: "600",
                      fontSize: "13px",
                    }}
                  >
                    Check Buses for this Route
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONFIRMED E-TICKET MODAL */}
        {confirmedBooking && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
          >
            <div
              className="ticket-print-container"
              style={{
                background: "white",
                borderRadius: "16px",
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
            >
              {/* Ticket Top Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #123b70 0%, #1e5296 100%)",
                  color: "white",
                  padding: "24px",
                  borderTopLeftRadius: "16px",
                  borderTopRightRadius: "16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "38px", marginBottom: "8px" }}>🎉</div>
                <h3 style={{ fontSize: "22px", fontWeight: "800" }}>Booking Confirmed!</h3>
                <p style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
                  Your official E-Ticket has been generated
                </p>
              </div>

              {/* Ticket Body */}
              <div style={{ padding: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed #cbd5e1",
                    paddingBottom: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>BOOKING REF</div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#123b70" }}>
                      #BUS-{confirmedBooking.booking_id}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>STATUS</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#059669" }}>
                      ✓ {confirmedBooking.booking_status || "CONFIRMED"}
                    </div>
                  </div>
                </div>

                {/* Journey Details */}
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#1e293b", marginBottom: "4px" }}>
                    {confirmedBooking.source} ➔ {confirmedBooking.destination}
                  </div>
                  <div style={{ fontSize: "13px", color: "#475569" }}>
                    {confirmedBooking.bus_name} ({confirmedBooking.bus_type})
                  </div>
                  <div style={{ display: "flex", gap: "20px", marginTop: "10px", fontSize: "13px" }}>
                    <div>
                      <strong style={{ color: "#1e293b" }}>Travel Date:</strong> {confirmedBooking.travel_date}
                    </div>
                    <div>
                      <strong style={{ color: "#1e293b" }}>Time:</strong> {confirmedBooking.departure_time?.slice(0, 5)} - {confirmedBooking.arrival_time?.slice(0, 5)}
                    </div>
                  </div>
                </div>

                {/* Passenger & Seats Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Passenger Name:</span>
                    <div style={{ fontWeight: "700", color: "#1e293b" }}>{confirmedBooking.passenger_name}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Phone Number:</span>
                    <div style={{ fontWeight: "700", color: "#1e293b" }}>{confirmedBooking.phone}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Email:</span>
                    <div style={{ fontWeight: "700", color: "#1e293b" }}>{confirmedBooking.email}</div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Seat Number(s):</span>
                    <div style={{ fontWeight: "800", color: "#123b70", fontSize: "15px" }}>
                      {Array.isArray(confirmedBooking.seats)
                        ? confirmedBooking.seats.join(", ")
                        : confirmedBooking.seats}
                    </div>
                  </div>
                </div>

                {/* Fare & Payment Breakdown */}
                <div
                  style={{
                    borderTop: "1px solid #e2e8f0",
                    paddingTop: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Payment Method</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                      {confirmedBooking.payment_method || "UPI"} (Paid)
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>Total Fare Paid</div>
                    <div style={{ fontSize: "22px", fontWeight: "800", color: "#ff6b35" }}>
                      ₹{Number(confirmedBooking.total_amount).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="no-print" style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
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
                      fontSize: "14px",
                    }}
                  >
                    🖨️ Print / Save PDF
                  </button>
                  <button
                    onClick={() => {
                      setConfirmedBooking(null);
                      setSelectedSeatIds([]);
                      setActiveScheduleId(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="no-print"
        style={{
          background: "#0f172a",
          color: "#94a3b8",
          padding: "24px 20px",
          textAlign: "center",
          fontSize: "13px",
          marginTop: "40px",
          borderTop: "1px solid #1e293b",
        }}
      >
        <p>© 2026 BusTicket Express — Mini Project. Built with Next.js & MySQL.</p>
        <p style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
          Safe & Secure Travel • Real-time Seat Allocation • Instant Ticket Generation
        </p>
      </footer>
    </div>
  );
}
