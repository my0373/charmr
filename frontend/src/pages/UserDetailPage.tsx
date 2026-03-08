import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { users, type User } from "../api";
import Badge from "../components/Badge";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    users.get(Number(id)).then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading user...</div>;
  if (!user) return <div className="loading">User not found</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>{user.username}</h1>
        <Link to="/dashboard/users" className="btn btn--outline btn--sm">Back to Users</Link>
      </div>

      <div className="card detail-section">
        <h2>User Information</h2>
        <div className="detail-grid">
          <dl className="detail-field">
            <dt>Username</dt>
            <dd>{user.username}</dd>
          </dl>
          <dl className="detail-field">
            <dt>Email</dt>
            <dd>{user.email || "--"}</dd>
          </dl>
          <dl className="detail-field">
            <dt>Name</dt>
            <dd>{`${user.first_name} ${user.last_name}`.trim() || "--"}</dd>
          </dl>
          <dl className="detail-field">
            <dt>Status</dt>
            <dd>
              <Badge variant={user.is_active ? "success" : "danger"}>
                {user.is_active ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </dl>
          <dl className="detail-field">
            <dt>Staff</dt>
            <dd>{user.is_staff ? "Yes" : "No"}</dd>
          </dl>
          <dl className="detail-field">
            <dt>Joined</dt>
            <dd>{new Date(user.date_joined).toLocaleDateString()}</dd>
          </dl>
          <dl className="detail-field">
            <dt>Last Login</dt>
            <dd>{user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}</dd>
          </dl>
        </div>
      </div>

      {user.person && (
        <div className="card detail-section">
          <h2>Linked Person</h2>
          <div className="detail-grid">
            <dl className="detail-field">
              <dt>Name</dt>
              <dd>
                <Link to={`/dashboard/people/${user.person.id}`}>
                  {user.person.full_name}
                </Link>
              </dd>
            </dl>
            <dl className="detail-field">
              <dt>Family</dt>
              <dd>
                <Link to={`/dashboard/families/${user.person.family}`}>
                  {user.person.family_name}
                </Link>
              </dd>
            </dl>
            <dl className="detail-field">
              <dt>Minor</dt>
              <dd>{user.person.is_minor ? "Yes" : "No"}</dd>
            </dl>
          </div>
        </div>
      )}

      <div className="card detail-section">
        <h2>Role Assignments</h2>
        {user.role_assignments.length === 0 ? (
          <p style={{ color: "var(--color-text-light)", fontSize: "var(--font-size-sm)" }}>
            No roles assigned
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Scope</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {user.role_assignments.map((ra) => (
                <tr key={ra.id}>
                  <td>{ra.role_name}</td>
                  <td>
                    <Badge variant="info">{ra.scope_display}</Badge>
                  </td>
                  <td>{new Date(ra.assigned_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
