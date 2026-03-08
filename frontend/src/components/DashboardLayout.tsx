import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const adminPaths = [
  "/dashboard/users",
  "/dashboard/people",
  "/dashboard/families",
  "/dashboard/roles",
  "/dashboard/regions",
  "/dashboard/guardianships",
  "/dashboard/data",
];

const adminLinks = [
  { section: "Management" },
  { to: "/dashboard/users", label: "Users" },
  { to: "/dashboard/people", label: "People" },
  { to: "/dashboard/families", label: "Families" },
  { section: "Access Control" },
  { to: "/dashboard/roles", label: "Roles" },
  { to: "/dashboard/regions", label: "Regions" },
  { to: "/dashboard/guardianships", label: "Guardianships" },
  { section: "System" },
  { to: "/dashboard/data", label: "Data Management" },
] as const;

export default function DashboardLayout() {
  const location = useLocation();
  const isOnAdminPage = adminPaths.some((p) => location.pathname.startsWith(p));
  const [adminOpen, setAdminOpen] = useState(isOnAdminPage);

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <nav>
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            Overview
          </NavLink>

          <button
            className={`sidebar-collapse-toggle${adminOpen ? " open" : ""}`}
            onClick={() => setAdminOpen((o) => !o)}
          >
            <span className="sidebar-collapse-arrow" />
            Admin
          </button>

          {adminOpen && (
            <div className="sidebar-collapse-body">
              {adminLinks.map((item, i) =>
                "section" in item ? (
                  <div key={i} className="sidebar-section">
                    {item.section}
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `sidebar-link${isActive ? " active" : ""}`
                    }
                  >
                    {item.label}
                  </NavLink>
                )
              )}
            </div>
          )}
        </nav>
      </aside>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
