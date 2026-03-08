import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { families, people, type Family, type Person } from "../api";
import Badge, { statusVariant } from "../components/Badge";

export default function FamilyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fid = Number(id);
    Promise.all([
      families.get(fid),
      people.list(),
    ]).then(([f, allPeople]) => {
      setFamily(f);
      setMembers(allPeople.filter((p) => p.family === fid));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading family...</div>;
  if (!family) return <div className="loading">Family not found</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>{family.name}</h1>
        <Link to="/dashboard/families" className="btn btn--outline btn--sm">Back to Families</Link>
      </div>

      <div className="card detail-section">
        <h2>Family Information</h2>
        <div className="detail-grid">
          <dl className="detail-field"><dt>Name</dt><dd>{family.name}</dd></dl>
          <dl className="detail-field">
            <dt>Status</dt>
            <dd><Badge variant={statusVariant(family.status)}>{family.status}</Badge></dd>
          </dl>
          <dl className="detail-field"><dt>Members</dt><dd>{family.member_count}</dd></dl>
          <dl className="detail-field"><dt>Created</dt><dd>{new Date(family.created_at).toLocaleDateString()}</dd></dl>
        </div>
      </div>

      <div className="card detail-section">
        <h2>Family Members</h2>
        {members.length === 0 ? (
          <p style={{ color: "var(--color-text-light)", fontSize: "var(--font-size-sm)" }}>No members</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Age Category</th>
                <th>User Account</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><Link to={`/dashboard/people/${m.id}`}>{m.full_name}</Link></td>
                  <td>{m.email || "--"}</td>
                  <td><Badge variant={m.is_minor ? "warning" : "default"}>{m.is_minor ? "Minor" : "Adult"}</Badge></td>
                  <td>{m.username || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
