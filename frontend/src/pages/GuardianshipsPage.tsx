import { useEffect, useState } from "react";
import { guardianships, people, type Guardianship, type Person } from "../api";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import { SelectField } from "../components/FormField";
import Badge, { statusVariant } from "../components/Badge";

export default function GuardianshipsPage() {
  const [data, setData] = useState<Guardianship[]>([]);
  const [personList, setPersonList] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ guardian: "", ward: "", status: "pending" });
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([guardianships.list(), people.list()])
      .then(([g, p]) => { setData(g); setPersonList(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const columns: Column<Guardianship & Record<string, unknown>>[] = [
    { key: "guardian_name", header: "Guardian" },
    { key: "ward_name", header: "Ward" },
    {
      key: "ward_is_minor",
      header: "Ward Minor",
      render: (r) => <Badge variant={r.ward_is_minor ? "warning" : "default"}>{r.ward_is_minor ? "Yes" : "No"}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={statusVariant(r.status as string)}>{r.status as string}</Badge>,
    },
    { key: "created_at", header: "Created", render: (r) => new Date(r.created_at as string).toLocaleDateString() },
    {
      key: "_actions",
      header: "",
      sortable: false,
      render: (r) => {
        const gs = r as unknown as Guardianship;
        return (
          <div style={{ display: "flex", gap: "var(--space-xs)" }}>
            {gs.status === "pending" && (
              <button
                className="btn btn--primary btn--sm"
                onClick={(e) => { e.stopPropagation(); handleApprove(gs.id); }}
              >
                Approve
              </button>
            )}
            {gs.status === "active" && (
              <button
                className="btn btn--danger btn--sm"
                onClick={(e) => { e.stopPropagation(); handleRevoke(gs.id); }}
              >
                Revoke
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const handleApprove = async (id: number) => {
    try {
      await guardianships.update(id, { status: "active" } as Partial<Guardianship>);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Revoke this guardianship?")) return;
    try {
      await guardianships.update(id, { status: "revoked" } as Partial<Guardianship>);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleCreate = async () => {
    setError("");
    try {
      await guardianships.create({
        guardian: Number(form.guardian),
        ward: Number(form.ward),
        status: form.status as Guardianship["status"],
      });
      setShowCreate(false);
      setForm({ guardian: "", ward: "", status: "pending" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading guardianships...</div>;

  const adults = personList.filter((p) => !p.is_minor);
  const allPeople = personList;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Guardianships</h1>
      </div>

      <DataTable
        columns={columns}
        data={data as (Guardianship & Record<string, unknown>)[]}
        keyField="id"
        searchPlaceholder="Search guardianships..."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            Add Guardianship
          </button>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Guardianship"
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        {error && <div className="alert alert--error">{error}</div>}
        <SelectField
          label="Guardian"
          name="guardian"
          value={form.guardian}
          onChange={(v) => setForm({ ...form, guardian: v })}
          options={adults.map((p) => ({ value: p.id, label: p.full_name }))}
          placeholder="Select guardian..."
          required
        />
        <SelectField
          label="Ward"
          name="ward"
          value={form.ward}
          onChange={(v) => setForm({ ...form, ward: v })}
          options={allPeople.map((p) => ({ value: p.id, label: `${p.full_name}${p.is_minor ? " (minor)" : ""}` }))}
          placeholder="Select ward..."
          required
        />
        <SelectField
          label="Status"
          name="status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          options={[
            { value: "pending", label: "Pending" },
            { value: "active", label: "Active" },
          ]}
        />
      </Modal>
    </div>
  );
}
