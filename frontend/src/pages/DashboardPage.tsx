import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { families, people, regions, users } from "../api";

function DashboardPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ members: 0, families: 0, regions: 0, users: 0 });

  useEffect(() => {
    Promise.all([
      people.list().then((d) => d.length).catch(() => 0),
      families.list().then((d) => d.length).catch(() => 0),
      regions.list().then((d) => d.length).catch(() => 0),
      users.list().then((d) => d.length).catch(() => 0),
    ]).then(([m, f, r, u]) => setCounts({ members: m, families: f, regions: r, users: u }));
  }, []);

  return (
    <div className="page-dashboard">
      <h1>Dashboard</h1>
      <p className="dashboard-welcome">
        Welcome back, <strong>{user?.username}</strong>.
      </p>

      <div className="dashboard-grid">
        <div className="card">
          <h2>People</h2>
          <p className="card-stat">{counts.members}</p>
          <p className="card-label">Total people</p>
        </div>
        <div className="card">
          <h2>Families</h2>
          <p className="card-stat">{counts.families}</p>
          <p className="card-label">Registered families</p>
        </div>
        <div className="card">
          <h2>Regions</h2>
          <p className="card-stat">{counts.regions}</p>
          <p className="card-label">Active regions</p>
        </div>
        <div className="card">
          <h2>Users</h2>
          <p className="card-stat">{counts.users}</p>
          <p className="card-label">System users</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
