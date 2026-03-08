import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { people, guardianships, type Person, type Guardianship } from "../api";
import Badge, { statusVariant } from "../components/Badge";

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [guards, setGuards] = useState<Guardianship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const pid = Number(id);
    Promise.all([
      people.get(pid),
      guardianships.list(),
    ]).then(([p, g]) => {
      setPerson(p);
      setGuards(g.filter((gs) => gs.guardian === pid || gs.ward === pid));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading person...</div>;
  if (!person) return <div className="loading">Person not found</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>{person.full_name}</h1>
        <Link to="/dashboard/people" className="btn btn--outline btn--sm">Back to People</Link>
      </div>

      <div className="card detail-section">
        <h2>Personal Information</h2>
        <div className="detail-grid">
          <dl className="detail-field"><dt>First Name</dt><dd>{person.first_name}</dd></dl>
          <dl className="detail-field"><dt>Last Name</dt><dd>{person.last_name}</dd></dl>
          <dl className="detail-field"><dt>Date of Birth</dt><dd>{person.date_of_birth || "--"}</dd></dl>
          <dl className="detail-field">
            <dt>Age Category</dt>
            <dd><Badge variant={person.is_minor ? "warning" : "default"}>{person.is_minor ? "Minor" : "Adult"}</Badge></dd>
          </dl>
          <dl className="detail-field"><dt>Email</dt><dd>{person.email || "--"}</dd></dl>
          <dl className="detail-field"><dt>Phone</dt><dd>{person.phone || "--"}</dd></dl>
          <dl className="detail-field">
            <dt>Family</dt>
            <dd><Link to={`/dashboard/families/${person.family}`}>{person.family_name}</Link></dd>
          </dl>
          <dl className="detail-field">
            <dt>User Account</dt>
            <dd>{person.user ? <Link to={`/dashboard/users/${person.user}`}>{person.username}</Link> : "--"}</dd>
          </dl>
        </div>
      </div>

      <div className="card detail-section">
        <h2>Guardianships</h2>
        {guards.length === 0 ? (
          <p style={{ color: "var(--color-text-light)", fontSize: "var(--font-size-sm)" }}>No guardianships</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Relationship</th>
                <th>Person</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {guards.map((g) => (
                <tr key={g.id}>
                  <td>{g.guardian === person.id ? "Guardian of" : "Ward of"}</td>
                  <td>
                    <Link to={`/dashboard/people/${g.guardian === person.id ? g.ward : g.guardian}`}>
                      {g.guardian === person.id ? g.ward_name : g.guardian_name}
                    </Link>
                  </td>
                  <td><Badge variant={statusVariant(g.status)}>{g.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
