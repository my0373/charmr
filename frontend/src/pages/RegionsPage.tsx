import { useEffect, useState } from "react";
import { regions, type Region } from "../api";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";

const columns: Column<Region & Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  { key: "code", header: "Code" },
  { key: "created_at", header: "Created", render: (r) => new Date(r.created_at as string).toLocaleDateString() },
];

export default function RegionsPage() {
  const [data, setData] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });
  const [error, setError] = useState("");

  const load = () => {
    regions.list().then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEdit = (r: Region & Record<string, unknown>) => {
    setEditId(r.id as number);
    setForm({ name: r.name as string, code: r.code as string });
  };

  const handleSave = async () => {
    setError("");
    try {
      if (editId) {
        await regions.update(editId, { name: form.name, code: form.code });
      } else {
        await regions.create({ name: form.name, code: form.code });
      }
      setShowCreate(false);
      setEditId(null);
      setForm({ name: "", code: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this region?")) return;
    try {
      await regions.delete(id);
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading regions...</div>;

  const tableColumns: Column<Region & Record<string, unknown>>[] = [
    ...columns,
    {
      key: "_actions",
      header: "",
      sortable: false,
      render: (r) => (
        <div style={{ display: "flex", gap: "var(--space-xs)" }}>
          <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</button>
          <button className="btn btn--danger btn--sm" onClick={(e) => { e.stopPropagation(); handleDelete(r.id as number); }}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <h1>Regions</h1>
      </div>

      <DataTable
        columns={tableColumns}
        data={data as (Region & Record<string, unknown>)[]}
        keyField="id"
        searchPlaceholder="Search regions..."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => { setEditId(null); setForm({ name: "", code: "" }); setShowCreate(true); }}>
            Add Region
          </button>
        }
      />

      <Modal
        open={showCreate || editId !== null}
        onClose={() => { setShowCreate(false); setEditId(null); }}
        title={editId ? "Edit Region" : "Add Region"}
        footer={
          <>
            <button className="btn btn--outline" onClick={() => { setShowCreate(false); setEditId(null); }}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSave}>{editId ? "Save" : "Create"}</button>
          </>
        }
      >
        {error && <div className="alert alert--error">{error}</div>}
        <FormField label="Name" name="name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <FormField label="Code" name="code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} required />
      </Modal>
    </div>
  );
}
