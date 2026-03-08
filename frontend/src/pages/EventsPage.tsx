function EventsPage() {
  return (
    <div className="page-events">
      <h1>Events</h1>
      <p className="page-intro">
        Public events from across the charity's regions will be listed here.
      </p>

      <div className="events-placeholder">
        <div className="card">
          <p className="card-label">No events yet</p>
          <p>
            Event management is coming soon. Check back later for upcoming
            competitions, training days, and social events.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EventsPage;
