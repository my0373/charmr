import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { people, families, type Person, type Family } from "../api";
import DataTable, { type Column } from "../components/DataTable";
import Modal from "../components/Modal";
import FormField from "../components/FormField";
import { SelectField } from "../components/FormField";
import Badge from "../components/Badge";

export default function PeoplePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Person[]>([]);
  const [familyList, setFamilyList] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", family: "", date_of_birth: "" });
  const [error, setError] = useState("");

  const load = () => {
    Promise.all([people.list(), families.list()])
      .then(([p, f]) => { setData(p); setFamilyList(f); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const columns: Column<Person & Record<string, unknown>>[] = [
    { key: "full_name", header: "Name" },
    { key: "family_name", header: "Family" },
    { key: "email", header: "Email" },
    {
      key: "is_minor",
      header: "Minor",
      render: (r) => r.is_minor ? <Badge variant="warning">Minor</Badge> : <Badge variant="default">Adult</Badge>,
    },
    { key: "username", header: "User Account", render: (r) => (r.username as string) || "--" },
  ];

  const handleCreate = async () => {
    setError("");
    try {
      await people.create({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        family: Number(form.family),
        date_of_birth: form.date_of_birth || undefined,
      } as Partial<Person>);
      setShowCreate(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", family: "", date_of_birth: "" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="loading">Loading people...</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>People</h1>
      </div>

      <DataTable
        columns={columns}
        data={data as (Person & Record<string, unknown>)[]}
        keyField="id"
        onRowClick={(r) => navigate(`/dashboard/people/${r.id}`)}
        searchPlaceholder="Search people..."
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => setShowCreate(true)}>
            Add Person
          </button>
        }
      />

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Person"
        footer={
          <>
            <button className="btn btn--outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={handleCreate}>Create</button>
          </>
        }
      >
        {error && <div className="alert alert--error">{error}</div>}
        <FormField label="First Name" name="first_name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
        <FormField label="Last Name" name="last_name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
        <FormField label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
        <FormField label="Email" name="email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormField label="Phone" name="phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <SelectField
          label="Family"
          name="family"
          value={form.family}
          onChange={(v) => setForm({ ...form, family: v })}
          options={familyList.map((f) => ({ value: f.id, label: f.name }))}
          placeholder="Select a family..."
          required
        />
      </Modal>
    </div>
  );
}
