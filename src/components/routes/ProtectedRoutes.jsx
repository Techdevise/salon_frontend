import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

export function PrivateRoute() {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function RoleRoute({ allowedRoles }) {
  const { user } = useSelector((state) => state.auth);
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'Staff' ? "/dashboard/appointments" : "/dashboard"} replace />;
  }
  
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  if (isAuthenticated) {
     return <Navigate to={user?.role === 'Staff' ? "/dashboard/appointments" : "/dashboard"} replace />;
  }
  return <Outlet />;
}
