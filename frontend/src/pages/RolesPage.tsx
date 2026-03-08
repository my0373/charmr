import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roles, permissions as permissionsApi, type Role, type Permission } from "../api";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import Badge from "../components/Badge";

const columns: Column<Role & Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  { key: "description", header: "Description" },
  {
    key: "is_system_role",
    header: "Type",
    render: (r) => (
      <Badge variant={r.is_system_role ? "info" : "default"}>
        {r.is_system_role ? "System" : "Custom"}
      </Badge>
    ),
  },
  {
    key: "permissions",
    header: "Permissions",
    sortable: false,
    render: (r) => (r.permissions as Permission[]).length,
  },
  { key: "assignment_count", header: "Assignments" },
];

export default function RolesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", permission_ids: [] as number[] });
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([roles.list(), permissionsApi.list()])
      .then(([r, p]) => { setData(r); setAllPerms(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const togglePerm = (id: number) => {
    setForm((f) => ({
      ...f,
      permission_ids: f.permission_ids.includes(id)
        ? f.permission_ids.filter((p) => p !== id)
        : [...f.permission_ids, id],
    }));
  };

  const handleCreate = async () => {
    setError("");
    try {
      await roles.create({ name: form.name, description: form.description, permission_ids: form.permission_ids });
      setShowCreate(false);
      setForm({ name: "", description: "", permission_ids: [] });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading roles...</div>;

  const grouped = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="admin-page-header">
        <h1>Roles</h1>
      </div>

      <DataTable
        columns={columns}
        data={data as (Role & Record<string, unknown>)[]}
        keyField="id"
        onRowClick={(r) => navigate(`/dashboard/roles/${r.id}`)}
        searchPlaceholder="Search roles..."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            Add Role
          </button>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Role"
        wide
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        {error && <div className="alert alert--error">{error}</div>}
        <FormField label="Name" name="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <FormField label="Description" name="description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <div className="form-field">
          <label>Permissions</label>
          {Object.entries(grouped).map(([cat, perms]) => (
            <div key={cat} style={{ marginBottom: "var(--space-sm)" }}>
              <strong style={{ fontSize: "var(--font-size-sm)", textTransform: "capitalize" }}>{cat}</strong>
              <div className="checkbox-group">
                {perms.map((p) => (
                  <label key={p.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.permission_ids.includes(p.id)}
                      onChange={() => togglePerm(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
