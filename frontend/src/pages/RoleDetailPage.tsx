import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { roles, roleAssignments, type Role, type RoleAssignment } from "../api";
import Badge from "../components/Badge";

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const rid = Number(id);
    Promise.all([
      roles.get(rid),
      roleAssignments.list(),
    ]).then(([r, all]) => {
      setRole(r);
      setAssignments(all.filter((a) => a.role === rid));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading role...</div>;
  if (!role) return <div className="loading">Role not found</div>;

  const grouped = role.permissions.reduce<Record<string, typeof role.permissions>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="admin-page-header">
        <h1>{role.name}</h1>
        <Link to="/dashboard/roles" className="btn btn--outline btn--sm">Back to Roles</Link>
      </div>

      <div className="card detail-section">
        <h2>Role Information</h2>
        <div className="detail-grid">
          <dl className="detail-field"><dt>Name</dt><dd>{role.name}</dd></dl>
          <dl className="detail-field"><dt>Description</dt><dd>{role.description || "--"}</dd></dl>
          <dl className="detail-field">
            <dt>Type</dt>
            <dd><Badge variant={role.is_system_role ? "info" : "default"}>{role.is_system_role ? "System" : "Custom"}</Badge></dd>
          </dl>
          <dl className="detail-field"><dt>Assignments</dt><dd>{role.assignment_count}</dd></dl>
        </div>
      </div>

      <div className="card detail-section">
        <h2>Permissions ({role.permissions.length})</h2>
        {Object.entries(grouped).map(([cat, perms]) => (
          <div key={cat} style={{ marginBottom: "var(--space-md)" }}>
            <strong style={{ fontSize: "var(--font-size-sm)", textTransform: "capitalize", color: "var(--color-text-light)" }}>{cat}</strong>
            <div className="permission-tags" style={{ marginTop: "var(--space-xs)" }}>
              {perms.map((p) => (
                <Badge key={p.id} variant="info">{p.codename}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card detail-section">
        <h2>Assignments</h2>
        {assignments.length === 0 ? (
          <p style={{ color: "var(--color-text-light)", fontSize: "var(--font-size-sm)" }}>No assignments</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Assignee</th>
                <th>Type</th>
                <th>Scope</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td>{a.user_display || a.group_display || "--"}</td>
                  <td>{a.user ? "User" : "Group"}</td>
                  <td><Badge variant="info">{a.scope_display}</Badge></td>
                  <td>{new Date(a.assigned_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
