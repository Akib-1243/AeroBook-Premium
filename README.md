
Readme · MD
# AeroBook Premium
 
AeroBook Premium is a database-driven airline reservation system that keeps seat booking, fleet maintenance, and business analytics fast, accurate, and race-condition free — all handled natively at the database layer.
 
## Features
 
- **Real-Time Seat Assignment** — Transaction locks ensure two passengers can never book the exact same seat simultaneously.
- **Colour-Coded Seat Map** — An aircraft cabin view with a legend: available (green), selected (blue ✓), booked (amber B), sold (grey X), blocked (dark -), plus extra-legroom and exit-row markers. It refreshes every 8 seconds (`GET /api/flights/{id}/seatmap`).
- **Automated Maintenance Logging** — Triggers update aircraft maintenance logs automatically based on completed flight hours.
- **Built-In Analytics** — Stored procedures generate occupancy and revenue reports on demand.
