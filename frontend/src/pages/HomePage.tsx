import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="page-home">
      <section className="hero">
        <h1>
          Empowering charities<br />
          to do what they do best
        </h1>
        <p className="hero-sub">
          Charmr helps charities manage members, coordinate regional events,
          and run their organisations — securely and simply.
        </p>
        <div className="hero-actions">
          <Link to="/about" className="btn btn--primary btn--lg">
            Learn more
          </Link>
          <Link to="/events" className="btn btn--outline btn--lg">
            View events
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <h2>Member management</h2>
          <p>
            Track families, participants, volunteers, and carers with strong
            privacy protections for personal data.
          </p>
        </div>

        <div className="feature">
          <h2>Event coordination</h2>
          <p>
            Create and manage regional and national events, handle
            registrations, and track attendance.
          </p>
        </div>

        <div className="feature">
          <h2>Secure by design</h2>
          <p>
            Fine-grained permissions, audit logging, and encryption at rest —
            because member data matters.
          </p>
        </div>

        <div className="feature">
          <h2>Free for charities</h2>
          <p>
            Free to use, modify, and deploy. Built by the community, for
            charities — and protected from commercial exploitation.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
