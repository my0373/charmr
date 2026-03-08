import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { families, type Family } from "../api";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import { SelectField } from "../components/FormField";
import Badge, { statusVariant } from "../components/Badge";

const columns: Column<Family & Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  {
    key: "status",
    header: "Status",
    render: (r) => <Badge variant={statusVariant(r.status as string)}>{r.status as string}</Badge>,
  },
  { key: "member_count", header: "Members" },
  { key: "created_at", header: "Created", render: (r) => new Date(r.created_at as string).toLocaleDateString() },
];

export default function FamiliesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", status: "active" });
  const [error, setError] = useState("");

  const load = () => {
    families.list().then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    setError("");
    try {
      await families.create({ name: form.name, status: form.status as Family["status"] });
      setShowCreate(false);
      setForm({ name: "", status: "active" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading families...</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Families</h1>
      </div>

      <DataTable
        columns={columns}
        data={data as (Family & Record<string, unknown>)[]}
        keyField="id"
        onRowClick={(r) => navigate(`/dashboard/families/${r.id}`)}
        searchPlaceholder="Search families..."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            Add Family
          </button>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Family"
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        {error && <div className="alert alert--error">{error}</div>}
        <FormField label="Family Name" name="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <SelectField
          label="Status"
          name="status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          options={[
            { value: "active", label: "Active" },
            { value: "pending", label: "Pending" },
            { value: "lapsed", label: "Lapsed" },
          ]}
        />
      </Modal>
    </div>
  );
}
