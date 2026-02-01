import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useApp } from "./AppContext";

export function Layout() {
  const { setMasterPassword } = useApp();
  const location = useLocation();
  const isDomainsRoute = location.pathname.startsWith("/domains") || location.pathname.startsWith("/records");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">LaoChenDNS</div>
          <div className="brand-subtitle">DNS 聚合管理</div>
        </div>
        <nav className="nav">
          <NavLink className={() => `nav-link${isDomainsRoute ? " active" : ""}`} to="/domains">
            域名
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/integrations">
            接入
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/settings">
            设置
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-secondary w-full" onClick={() => setMasterPassword(null)}>
            锁定
          </button>
        </div>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
