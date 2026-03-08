import { useEffect, useState } from "react";
import { profile as profileApi, type Profile } from "../api";
import Badge from "../components/Badge";
import FormField from "../components/FormField";

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    profileApi.get().then((p) => {
      setData(p);
      if (p.person) {
        setForm({
          first_name: p.person.first_name,
          last_name: p.person.last_name,
          email: p.person.email,
          phone: p.person.phone,
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.update(form);
      setEditing(false);
      load();
    } catch {
      // swallow
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!data) return <div className="loading">Could not load profile</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>My Profile</h1>
      </div>

      <div className="profile-card">
        <h2>Account</h2>
        <div className="detail-grid">
          <dl className="detail-field"><dt>Username</dt><dd>{data.user.username}</dd></dl>
          <dl className="detail-field"><dt>Email</dt><dd>{data.user.email || "--"}</dd></dl>
          <dl className="detail-field"><dt>Joined</dt><dd>{new Date(data.user.date_joined).toLocaleDateString()}</dd></dl>
        </div>
      </div>

      {data.person && (
        <div className="profile-card" style={{ marginTop: "var(--space-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Personal Details</h2>
            {!editing && (
              <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>

          {editing ? (
            <>
              <FormField label="First Name" name="first_name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
              <FormField label="Last Name" name="last_name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
              <FormField label="Email" name="email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <FormField label="Phone" name="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>Save</button>
                <button className="btn btn--outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="detail-grid">
              <dl className="detail-field"><dt>Name</dt><dd>{data.person.full_name}</dd></dl>
              <dl className="detail-field"><dt>Email</dt><dd>{data.person.email || "--"}</dd></dl>
              <dl className="detail-field"><dt>Phone</dt><dd>{data.person.phone || "--"}</dd></dl>
              <dl className="detail-field"><dt>Family</dt><dd>{data.person.family_name}</dd></dl>
              <dl className="detail-field">
                <dt>Age</dt>
                <dd><Badge variant={data.person.is_minor ? "warning" : "default"}>{data.person.is_minor ? "Minor" : "Adult"}</Badge></dd>
              </dl>
            </div>
          )}
        </div>
      )}

      <div className="profile-card" style={{ marginTop: "var(--space-lg)" }}>
        <h2>Roles & Permissions</h2>
        {data.user.role_assignments.length > 0 && (
          <div style={{ marginBottom: "var(--space-md)" }}>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-light)" }}>Roles</strong>
            <div className="permission-tags" style={{ marginTop: "var(--space-xs)" }}>
              {data.user.role_assignments.map((ra) => (
                <Badge key={ra.id} variant="info">{ra.role_name} ({ra.scope_display})</Badge>
              ))}
            </div>
          </div>
        )}
        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-light)" }}>Effective Permissions</strong>
        <div className="permission-tags" style={{ marginTop: "var(--space-xs)" }}>
          {data.permissions.length === 0 ? (
            <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-light)" }}>No permissions</span>
          ) : (
            data.permissions.map((p) => <Badge key={p}>{p}</Badge>)
          )}
        </div>
      </div>
    </div>
  );
}
