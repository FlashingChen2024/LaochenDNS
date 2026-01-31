import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "./AppContext";

export function Layout() {
  const { setMasterPassword } = useApp();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">LaoChenDNS</div>
          <div className="brand-subtitle">DNS 聚合管理</div>
        </div>
        <nav className="nav">
          <NavLink className="nav-link" to="/domains">
            域名
          </NavLink>
          <NavLink className="nav-link" to="/integrations">
            接入
          </NavLink>
          <NavLink className="nav-link" to="/settings">
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
