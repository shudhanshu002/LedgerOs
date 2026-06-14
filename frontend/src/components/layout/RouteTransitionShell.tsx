import { Outlet, useLocation } from "react-router-dom";

export function RouteTransitionShell() {
  const location = useLocation();

  return (
    <div key={location.pathname} className="route-fade">
      <Outlet />
    </div>
  );
}