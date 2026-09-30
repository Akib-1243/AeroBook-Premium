import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAirlineAircraft, getAirlineFlights, logoutAirline, updateAirlineFlight } from '../../api/airlineFlights';
import '../../styles/AdminDashboard.css';
import '../../styles/FlightManagement.css';

const toLocalDateTime = (value) => (value ? String(value).replace(' ', 'T').slice(0, 16) : '');

const toFlightForm = (flight) => ({
	aircraft_id: String(flight.aircraft_id),
	origin: flight.origin,
	destination: flight.destination,
	departure: toLocalDateTime(flight.departure),
	arrival: toLocalDateTime(flight.arrival),
	status: flight.status,
	base_fare: String(flight.base_fare),
	currency: flight.currency || 'USD',
});

const emptyAircraftForm = () => ({
	model: '',
	capacity: '180',
	total_flight_hours: '0',
	maintenance_threshold: '50000',
});

function FlightManagementPage() {
	const navigate = useNavigate();
	const [flights, setFlights] = useState([]);
	const [airports, setAirports] = useState([]);
	const [aircraft, setAircraft] = useState([]);
	 const [company, setCompany] = useState(null);
	const [showAircraftForm, setShowAircraftForm] = useState(false);
	const [aircraftForm, setAircraftForm] = useState(emptyAircraftForm);
	const [addingAircraft, setAddingAircraft] = useState(false);
	const [selectedId, setSelectedId] = useState(null);
	const [form, setForm] = useState(null);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');

	useEffect(() => {
		getAirlineFlights()
			.then((result) => {
				setFlights(result.flights || []);
				setAirports(result.airports || []);
				setAircraft(result.aircraft || []);
				setCompany(result.company || null);
			})
			.catch((requestError) => setError(requestError.message || 'Flight information could not be loaded.'))
			.finally(() => setLoading(false));
	}, []);

	const filteredFlights = flights.filter((flight) => {
		const normalizedSearch = search.trim().toLowerCase();
		const matchesSearch = !normalizedSearch || [
			String(flight.id),
			flight.origin,
			flight.destination,
			flight.aircraft_model,
		].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
		const matchesStatus = statusFilter === 'all' || flight.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const selectedFlight = flights.find((flight) => flight.id === selectedId);

	const selectFlight = (flight) => {
		setSelectedId(flight.id);
		setForm(toFlightForm(flight));
		setError('');
		setNotice('');
	};

	const updateField = (event) => {
		const { name, value } = event.target;
		setForm((current) => ({ ...current, [name]: name === 'currency' ? value.toUpperCase() : value }));
	};

	const handleSave = async (event) => {
		event.preventDefault();
		if (!selectedFlight) return;

		setSaving(true);
		setError('');
		setNotice('');
		try {
			const result = await updateAirlineFlight(selectedFlight.id, {
				...form,
				aircraft_id: Number(form.aircraft_id),
				departure: `${form.departure}:00`,
				arrival: `${form.arrival}:00`,
				base_fare: Number(form.base_fare),
			});
			setFlights((current) => current.map((flight) => (
				flight.id === selectedFlight.id
					? { ...flight, ...result.flight }
					: flight
			)));
			setForm(toFlightForm(result.flight));
			setNotice(result.message || 'Flight details updated.');
		} catch (requestError) {
			setError(requestError.message || 'Flight details could not be saved.');
		} finally {
			setSaving(false);
		}
	};

	const handleSignOut = async () => {
		try {
			await logoutAirline();
		} finally {
			localStorage.removeItem('airline_token');
			localStorage.removeItem('airline_user');
			navigate('/airline-login', { replace: true });
		}
	};

	const handleCreateAircraft = async (event) => {
		event.preventDefault();
		setAddingAircraft(true);
		setError('');
		setNotice('');
		try {
			const result = await createAirlineAircraft({
				...aircraftForm,
				capacity: Number(aircraftForm.capacity),
				total_flight_hours: Number(aircraftForm.total_flight_hours),
				maintenance_threshold: Number(aircraftForm.maintenance_threshold),
			});
			const newAircraft = result.aircraft;
			setAircraft((current) => [...current, newAircraft].sort((left, right) => left.model.localeCompare(right.model)));
			setForm((current) => current ? { ...current, aircraft_id: String(newAircraft.id) } : current);
			setAircraftForm(emptyAircraftForm());
			setShowAircraftForm(false);
			setNotice(result.message || 'Aircraft added to your fleet.');
		} catch (requestError) {
			setError(requestError.message || 'Aircraft could not be added.');
		} finally {
			setAddingAircraft(false);
		}
	};

	return (
		<div className="admin-dashboard flight-management-page">
			<nav className="admin-navbar">
				<h1>{company?.name || 'Airline'} Operations</h1>
				<div className="admin-navbar-actions">
					<button type="button" onClick={handleSignOut}>Sign out</button>
				</div>
			</nav>

			<main className="admin-content">
				<header className="flight-management-heading">
					<div>
						<p className="flight-management-eyebrow">{company?.code || 'AIRLINE'} OPERATIONS</p>
						<h2>Flight management</h2>
						<p>Update schedules, routes, aircraft, fares, and flight status.</p>
					</div>
					<div className="airline-fleet-actions">
						<div className="flight-management-total">
							<strong>{flights.length}</strong>
							<span>flights</span>
						</div>
						<div className="flight-management-total">
							<strong>{aircraft.length}</strong>
							<span>aircraft</span>
						</div>
						<button type="button" className="flight-edit-button" onClick={() => { setShowAircraftForm((open) => !open); setError(''); }}>
							{showAircraftForm ? 'Close form' : 'Add aircraft'}
						</button>
					</div>
				</header>

				{error && <p className="flight-management-alert" role="alert">{error}</p>}
				{notice && <p className="flight-management-notice" role="status">{notice}</p>}

				{showAircraftForm && !loading && (
					<section className="flight-editor-panel aircraft-create-panel" aria-labelledby="aircraft-form-title">
						<div className="flight-editor-heading">
							<div>
								<p className="flight-management-eyebrow">{company?.code || 'AIRLINE'} FLEET</p>
								<h3 id="aircraft-form-title">Add aircraft</h3>
							</div>
						</div>
						<form className="flight-editor-form" onSubmit={handleCreateAircraft}>
							<label>
								<span>Aircraft model or registration</span>
								<input type="text" value={aircraftForm.model} onChange={(event) => setAircraftForm((current) => ({ ...current, model: event.target.value }))} maxLength="120" placeholder="e.g. Airbus A321neo" required />
							</label>
							<div className="flight-form-row">
								<label>
									<span>Seat capacity</span>
									<input type="number" value={aircraftForm.capacity} onChange={(event) => setAircraftForm((current) => ({ ...current, capacity: event.target.value }))} min="1" max="2000" step="1" required />
								</label>
								<label>
									<span>Current flight hours</span>
									<input type="number" value={aircraftForm.total_flight_hours} onChange={(event) => setAircraftForm((current) => ({ ...current, total_flight_hours: event.target.value }))} min="0" step="0.1" required />
								</label>
							</div>
							<label>
								<span>Maintenance threshold (hours)</span>
								<input type="number" value={aircraftForm.maintenance_threshold} onChange={(event) => setAircraftForm((current) => ({ ...current, maintenance_threshold: event.target.value }))} min="0.1" step="0.1" required />
							</label>
							<button type="submit" className="flight-save-button" disabled={addingAircraft}>
								{addingAircraft ? 'Adding aircraft...' : 'Add to fleet'}
							</button>
						</form>
					</section>
				)}

				{loading ? <p className="dashboard-loading">Loading flights...</p> : (
					<div className="flight-management-layout">
						<section className="flight-list-panel" aria-label="Flights">
							<div className="flight-list-toolbar">
								<label>
									<span>Search flights</span>
									<input
										type="search"
										value={search}
										onChange={(event) => setSearch(event.target.value)}
										placeholder="Flight, city, or aircraft"
									/>
								</label>
								<label>
									<span>Status</span>
									<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
										<option value="all">All statuses</option>
										<option value="scheduled">Scheduled</option>
										<option value="delayed">Delayed</option>
										<option value="cancelled">Cancelled</option>
										<option value="completed">Completed</option>
									</select>
								</label>
							</div>

							<div className="flight-list-scroll">
								<table className="admin-table flight-list-table">
									<thead>
										<tr>
											<th>Flight</th>
											<th>Departure</th>
											<th>Aircraft</th>
											<th>Fare</th>
											<th>Seats</th>
											<th>Status</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										{filteredFlights.map((flight) => (
											<tr key={flight.id} className={selectedId === flight.id ? 'selected-flight-row' : ''}>
												<td>
													<strong>FL-{flight.id}</strong>
													<span className="flight-route-cell">{flight.origin} to {flight.destination}</span>
												</td>
												<td>{new Date(flight.departure).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
												<td>{flight.aircraft_model}</td>
												<td>{new Intl.NumberFormat(undefined, { style: 'currency', currency: flight.currency || 'USD' }).format(Number(flight.base_fare || 0))}</td>
												<td>{flight.occupied_seats || 0}/{flight.seat_count || 0}</td>
												<td><span className={`status-badge flight-status-${flight.status}`}>{flight.status}</span></td>
												<td>
													<button type="button" className="flight-edit-button" onClick={() => selectFlight(flight)}>
														Edit
													</button>
												</td>
											</tr>
										))}
										{!filteredFlights.length && <tr><td colSpan="7">No flights match your filters.</td></tr>}
									</tbody>
								</table>
							</div>
						</section>

						{selectedFlight && form && (
							<section className="flight-editor-panel" aria-labelledby="flight-editor-title">
								<div className="flight-editor-heading">
									<div>
										<p className="flight-management-eyebrow">FLIGHT FL-{selectedFlight.id}</p>
										<h3 id="flight-editor-title">Edit flight details</h3>
									</div>
									<button type="button" className="flight-editor-close" aria-label="Close editor" onClick={() => { setSelectedId(null); setForm(null); }}>
										×
									</button>
								</div>

								<form className="flight-editor-form" onSubmit={handleSave}>
									<label>
										<span>Aircraft</span>
										<select name="aircraft_id" value={form.aircraft_id} onChange={updateField} required>
											{aircraft.map((plane) => <option key={plane.id} value={plane.id}>{plane.model} · {plane.capacity} seats</option>)}
										</select>
									</label>
									<div className="flight-form-row">
										<label>
											<span>Origin</span>
											<select name="origin" value={form.origin} onChange={updateField} required>
												{airports.map((airport) => <option key={airport.id} value={airport.city}>{airport.city} ({airport.code})</option>)}
											</select>
										</label>
										<label>
											<span>Destination</span>
											<select name="destination" value={form.destination} onChange={updateField} required>
												{airports.map((airport) => <option key={airport.id} value={airport.city}>{airport.city} ({airport.code})</option>)}
											</select>
										</label>
									</div>
									<div className="flight-form-row">
										<label>
											<span>Departure</span>
											<input type="datetime-local" name="departure" value={form.departure} onChange={updateField} required />
										</label>
										<label>
											<span>Arrival</span>
											<input type="datetime-local" name="arrival" value={form.arrival} onChange={updateField} required />
										</label>
									</div>
									<div className="flight-form-row">
										<label>
											<span>Base fare</span>
											<input type="number" name="base_fare" value={form.base_fare} onChange={updateField} min="0" step="0.01" required />
										</label>
										<label>
											<span>Currency</span>
											<input type="text" name="currency" value={form.currency} onChange={updateField} maxLength="3" minLength="3" pattern="[A-Za-z]{3}" required />
										</label>
									</div>
									<label>
										<span>Flight status</span>
										<select name="status" value={form.status} onChange={updateField} required>
											<option value="scheduled">Scheduled</option>
											<option value="delayed">Delayed</option>
											<option value="cancelled">Cancelled</option>
											<option value="completed">Completed</option>
										</select>
									</label>
									<div className="flight-editor-seat-note">
										{selectedFlight.occupied_seats || 0} of {selectedFlight.seat_count || 0} seats currently booked or sold.
									</div>
									<button type="submit" className="flight-save-button" disabled={saving}>
										{saving ? 'Saving...' : 'Save flight details'}
									</button>
								</form>
							</section>
						)}
					</div>
				)}
			</main>
		</div>
	);
}

export default FlightManagementPage;
