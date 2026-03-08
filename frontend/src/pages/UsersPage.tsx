import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { users, type User } from "../api";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import Badge from "../components/Badge";

const columns: Column<User & Record<string, unknown>>[] = [
  { key: "username", header: "Username" },
  { key: "first_name", header: "Name", render: (r) => `${r.first_name} ${r.last_name}`.trim() || "--" },
  { key: "email", header: "Email" },
  {
    key: "is_active",
    header: "Status",
    render: (r) => (
      <Badge variant={r.is_active ? "success" : "danger"}>
        {r.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "role_assignments",
    header: "Roles",
    sortable: false,
    render: (r) => {
      const ra = r.role_assignments as User["role_assignments"];
      return ra.map((a) => a.role_name).join(", ") || "--";
    },
  },
];

export default function UsersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: "", email: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState("");

  const load = () => {
    users.list().then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setError("");
    try {
      await users.create(form);
      setShowCreate(false);
      setForm({ username: "", email: "", password: "", first_name: "", last_name: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Users</h1>
      </div>

      <DataTable
        columns={columns}
        data={data as (User & Record<string, unknown>)[]}
        keyField="id"
        onRowClick={(r) => navigate(`/dashboard/users/${r.id}`)}
        searchPlaceholder="Search users..."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            Add User
          </button>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create User"
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        {error && <div className="alert alert--error">{error}</div>}
        <FormField label="Username" name="username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
        <FormField label="Email" name="email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
        <FormField label="First Name" name="first_name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
        <FormField label="Last Name" name="last_name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        <FormField label="Password" name="password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
      </Modal>
    </div>
  );
}
