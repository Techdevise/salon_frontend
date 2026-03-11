import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { logout, updateProfileImage } from '../../redux/slices/authSlice';
import axios from 'axios';
import { 
  Users, Calendar, Scissors, CreditCard, Tag, Repeat, CalendarDays,
  Settings, LogOut, LayoutDashboard, UserCircle, Bell
} from 'lucide-react';
import '../../styles/DashboardLayout.css';

// Admin Routes vs Staff Routes definition
const SIDEBAR_ROUTES = [
  { path: '/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Receptionist'] },
  { path: '/dashboard/calendar', name: 'Booking Calendar', icon: <CalendarDays size={20} />, roles: ['Admin', 'Receptionist', 'Staff'] },
  { path: '/dashboard/appointments', name: 'Appointments & Bookings', icon: <Calendar size={20} />, roles: ['Admin', 'Receptionist', 'Staff'] },
  { path: '/dashboard/recurring', name: 'Recurring Bookings', icon: <Repeat size={20} />, roles: ['Admin', 'Receptionist'] },
  { path: '/dashboard/customers', name: 'Customer Management', icon: <Users size={20} />, roles: ['Admin', 'Receptionist', 'Staff'] },
  { path: '/dashboard/staff', name: 'Staff Management', icon: <UserCircle size={20} />, roles: ['Admin'] },
  { path: '/dashboard/services', name: 'Services & Pricing', icon: <Scissors size={20} />, roles: ['Admin'] },
  { path: '/dashboard/service-packages', name: 'Service Packages', icon: <Tag size={20} />, roles: ['Admin'] },
  { path: '/dashboard/billing', name: 'Billing & Payments', icon: <CreditCard size={20} />, roles: ['Admin', 'Receptionist'] },
  { path: '/dashboard/discounts', name: 'Discounts & Offers', icon: <Tag size={20} />, roles: ['Admin'] }
];

function DashboardLayout() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  
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
  }, []);

  const fetchNotifications = async () => {
      try {
          const res = await axios.get('/api/notification', { withCredentials: true });
          
          // Flattening the grouped aggregate from the controller
          let allAlerts = [];
          let count = 0;
          if (res.data?.data) {
              res.data.data.forEach(group => {
                  count += group.unreadCount || 0;
                  allAlerts = [...allAlerts, ...group.notifications];
              });
          }
          // Sort by latest
          allAlerts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          
          setNotifications(allAlerts);
          setUnreadCount(count);
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

      if(imageUrl) {
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
        <header className="top-header">
          <div className="header-actions" style={{ marginLeft: 'auto' }}>
            
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
    </div>
  );
}

export default DashboardLayout;

