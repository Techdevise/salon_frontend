import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout, updateProfileImage } from '../../redux/slices/authSlice';
import { setSalons, setSelectedSalon } from '../../redux/slices/salonSlice';
import axios from 'axios';
import {
  Users, Calendar, Scissors, CreditCard, Tag, Repeat, CalendarDays,
  Settings, LogOut, LayoutDashboard, UserCircle, Bell, Sparkles, Store
} from 'lucide-react';
import '../../styles/DashboardLayout.css';

// Admin Routes vs Staff Routes definition
const SIDEBAR_ROUTES = [
  { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Manager'] },
  { path: '/dashboard/calendar', name: 'Booking Calendar', icon: <CalendarDays size={20} />, roles: ['Admin', 'Manager', 'Receptionist', 'Staff'] },
  { path: '/dashboard/appointments', name: 'Appointments & Bookings', icon: <Calendar size={20} />, roles: ['Admin', 'Manager', 'Receptionist', 'Staff'] },
  { path: '/dashboard/recurring', name: 'Recurring Bookings', icon: <Repeat size={20} />, roles: ['Admin', 'Manager', 'Receptionist'] },
  { path: '/dashboard/customers', name: 'Customer Management', icon: <Users size={20} />, roles: ['Admin', 'Manager', 'Receptionist', 'Staff'] },
  { path: '/dashboard/staff', name: 'Staff Management', icon: <UserCircle size={20} />, roles: ['Admin', 'Manager'] },
  { path: '/dashboard/services', name: 'Services & Pricing', icon: <Scissors size={20} />, roles: ['Admin', 'Manager'] },
  { path: '/dashboard/service-packages', name: 'Service Packages', icon: <Tag size={20} />, roles: ['Admin', 'Manager'] },
  { path: '/dashboard/billing', name: 'Billing & Payments', icon: <CreditCard size={20} />, roles: ['Admin', 'Manager', 'Receptionist', 'Staff'] },
  { path: '/dashboard/discounts', name: 'Discounts & Offers', icon: <Tag size={20} />, roles: ['Admin', 'Manager'] },
  { path: '/dashboard/subscription', name: 'Subscription Plan', icon: <Sparkles size={20} />, roles: ['Admin'] }
];

function DashboardLayout() {
  const { user } = useSelector((state) => state.auth);
  const { selectedSalonId, salons } = useSelector((state) => state.salon);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModalMsg, setSubModalMsg] = useState('');

  // Initialize salon selection on every mount/refresh
  useEffect(() => {
    if (!user) return;
    initAdminSalon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Global subscription error interceptor
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        const data = err?.response?.data;
        if (err?.response?.status === 403 && (data?.subscriptionRequired || data?.trialLimitReached)) {
          setSubModalMsg(data?.message || 'Upgrade your plan to continue.');
          setShowSubModal(true);
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  const initAdminSalon = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/salon/all', {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.data.length > 0) {
        const fetchedSalons = res.data.data;
        dispatch(setSalons(fetchedSalons));
        const stillValid = fetchedSalons.some(s => s._id === selectedSalonId);
        if (!stillValid) {
          const userSalon = fetchedSalons.find(s => s._id === user?.salonId);
          dispatch(setSelectedSalon(userSalon || fetchedSalons[0]));
        }
      }
    } catch (err) {
      console.error('DashboardLayout: Failed to initialize salon:', err);
    }
  };

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();

    // Fetch notifications every 5 minutes
    const interval = setInterval(() => {
      fetchNotifications();
    }, 300000);

    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedSalonId]);

  const fetchNotifications = async () => {
    try {
      const params = selectedSalonId ? { salonId: selectedSalonId } : {};
      const res = await axios.get('/api/notification', { params, withCredentials: true });

      // Flattening the grouped aggregate from the controller
      let allAlerts = [];
      let count = 0;
      if (res.data?.data) {
        res.data.data.forEach(group => {
          count += group.unreadCount || 0;
          allAlerts = [...allAlerts, ...group.notifications];
        });
      }
      // Filter to only include notifications created within the last 24 hours
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      allAlerts = allAlerts.filter(n => new Date(n.createdAt).getTime() >= twentyFourHoursAgo);

      // Sort by latest
      allAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(allAlerts);
      setUnreadCount(allAlerts.filter(n => !n.isRead).length);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notification/read/${id}`, {}, { withCredentials: true });
      fetchNotifications(); // Refresh list to update counts
    } catch (error) {
      console.error("Error marking read", error);
    }
  };


  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Upload raw Image file to ImageKit via backend
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await axios.post('/api/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      const imageUrl = uploadRes.data?.data?.url;

      if (imageUrl) {
        // 2. Map Image URL to User Auth schema
        await axios.post('/api/auth/upload-profile', { profileImage: imageUrl }, { withCredentials: true });

        // 3. Update local Redux store visually
        dispatch(updateProfileImage(imageUrl));
      }
    } catch (error) {
      console.error("Failed to upload profile picture to ImageKit:", error);
      alert("Failed to upload image. Please try a smaller file.");
    } finally {
      setIsUploading(false);
    }
  };

  const visibleRoutes = SIDEBAR_ROUTES.filter(route => route.roles.includes(user?.role));

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">✂</div>
          <h2>SalonPro</h2>
        </div>

        {/* Profile Section */}
        <div className="profile-section">
          <div className="profile-image-container">
            <img
              src={user?.profileImage || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=c084fc&color=fff`}
              alt="Profile"
              className="profile-image"
            />
            <label className="image-upload-overlay" htmlFor="profile-upload">
              {isUploading ? "..." : "Edit"}
            </label>
            <input
              type="file"
              id="profile-upload"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>
          <h3 className="profile-name">{user?.name || "User"}</h3>
          <p className="profile-role">{user?.role || "Role"}</p>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {visibleRoutes.map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={`nav-item ${location.pathname === route.path ? 'active' : ''}`}
            >
              {route.icon}
              <span>{route.name}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem' }}>
          {salons.length > 0 && (
            <div className="header-salon-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={18} style={{ color: '#c084fc' }} />
              <select
                value={selectedSalonId || ''}
                onChange={(e) => {
                  const targetSalon = salons.find(s => s._id === e.target.value);
                  if (targetSalon) {
                    dispatch(setSelectedSalon(targetSalon));
                  }
                }}
                className="header-salon-select"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(192, 132, 252, 0.4)',
                  color: '#ffffff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {salons.map(s => (
                  <option key={s._id} value={s._id} style={{ background: '#18181b', color: '#ffffff' }}>
                    {s.salonName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>

            {/* Notification Bell */}
            <div className="notification-wrapper" ref={notifRef}>
              <button
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Alerts & Reminders"
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {/* Popover */}
              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h3>Notifications</h3>
                  </div>
                  <div className="notification-list">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div
                          key={n._id}
                          className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                          onClick={() => !n.isRead && markAsRead(n._id)}
                        >
                          <h4>{n.title}</h4>
                          <p>{n.message}</p>
                          <span className="notif-time">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="no-notifications">No alerts for now.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-header-profile">
              <UserCircle size={18} />
              <span>{user?.name || 'User'}</span>
            </div>
          </div>
        </header>

        <div className="content-scrollable">
          {/* Nested routes render here */}
          <Outlet />
        </div>
      </div>

      {/* ── Subscription Required Modal ── */}
      {showSubModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid #7c3aed',
            borderRadius: '20px',
            padding: '40px 36px',
            maxWidth: '460px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(124,58,237,0.3)'
          }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>✨</div>
            <h2 style={{ color: '#f8fafc', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
              Free Trial Limit Reached
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
              {subModalMsg}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowSubModal(false)}
                style={{
                  background: 'transparent', border: '1px solid #334155',
                  color: '#94a3b8', padding: '10px 24px', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSubModal(false); navigate('/dashboard/subscription'); }}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                  border: 'none', color: 'white', padding: '10px 28px',
                  borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
                  fontWeight: 600, boxShadow: '0 4px 15px rgba(124,58,237,0.4)'
                }}
              >
                🚀 Subscribe Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;

