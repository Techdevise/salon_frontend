import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import '../styles/DashboardHome.css';
import { IndianRupee, Users, Scissors, TrendingUp, Plus, Store, ChevronDown, Pencil, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setSalons as setSalonsList, setSelectedSalon } from '../redux/slices/salonSlice';
import AddSalon from './AddSalon';
import { useConfirm } from '../components/ConfirmModal';

const COLORS = ['#7c3aed', '#db2777', '#3b82f6', '#10b981', '#f59e0b'];

function DashboardHome() {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { user } = useSelector((state) => state.auth);
  const { salons, selectedSalonId, selectedSalonInfo } = useSelector((state) => state.salon);
  const isAdmin = user?.role === 'Admin';

  const [filter, setFilter] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { text, type }

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSalonData, setEditingSalonData] = useState(null);

  // Data states
  const [businessData, setBusinessData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [staffData, setStaffData] = useState([]);

  // Staff Activity State
  const [allStaffList, setAllStaffList] = useState([]);
  const [staffActivities, setStaffActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('daily');
  const [customDate, setCustomDate] = useState('');
  const [selectedStaffIdFilter, setSelectedStaffIdFilter] = useState('all');
  const [activityLoading, setActivityLoading] = useState(false);

  // Unified staff list combining all sources so no staff member is missing from dropdown
  const combinedStaffList = useMemo(() => {
    const map = new Map();
    (allStaffList || []).forEach(s => {
      if (s._id && s.name) map.set(s._id.toString(), { id: s._id.toString(), name: s.name, role: s.role || 'Staff' });
    });
    (staffData || []).forEach(s => {
      if (s._id && s.staffName) map.set(s._id.toString(), { id: s._id.toString(), name: s.staffName, role: 'Staff' });
    });
    (staffActivities || []).forEach(a => {
      if (a.staffId && a.staffName) map.set(a.staffId.toString(), { id: a.staffId.toString(), name: a.staffName, role: a.staffRole || 'Staff' });
    });
    return Array.from(map.values());
  }, [allStaffList, staffData, staffActivities]);

  // Fetch salons list for Admin
  useEffect(() => {
    if (isAdmin) {
      fetchSalonsList();
    } else {
      // Non-admins don't have a salon selection flow, fetch dashboard stats directly
      fetchDashboardData();
      fetchStaffList();
    }
  }, [isAdmin]);

  const fetchSalonsList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/salon/all', {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const fetchedSalons = res.data.data;
        dispatch(setSalonsList(fetchedSalons));
        // Check if currently persisted selectedSalonId still exists in the fresh list
        const stillExists = fetchedSalons.some(s => s._id === selectedSalonId);
        if (!stillExists && fetchedSalons.length > 0) {
          // Auto-select first salon if selection is stale or missing
          dispatch(setSelectedSalon(fetchedSalons[0]));
        } else if (fetchedSalons.length === 0) {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Salons fetch error:', err);
      setLoading(false);
    }
  };

  // Fetch complete staff list for dropdown filter
  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem('token');
      const param = isAdmin ? '?allSalons=true' : (selectedSalonId ? `?salonId=${selectedSalonId}` : '');
      const res = await axios.get(`/api/staff/all${param}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAllStaffList(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  // When salon selection changes, dispatch to Redux
  const handleSalonChange = (e) => {
    const id = e.target.value;
    const salon = salons.find(s => s._id === id);
    if (salon) dispatch(setSelectedSalon(salon));
  };

  useEffect(() => {
    if (selectedSalonId || !isAdmin) {
      fetchDashboardData();
      fetchStaffActivities();
      fetchStaffList();
    } else if (isAdmin && salons.length === 0) {
      setLoading(false);
    }
  }, [filter, selectedSalonId, salons.length, isAdmin]);

  useEffect(() => {
    if (selectedSalonId || !isAdmin) {
      fetchStaffActivities();
    }
  }, [activityFilter, customDate, selectedStaffIdFilter, selectedSalonId]);

  const fetchStaffActivities = async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const salonParam = selectedSalonId ? `&salonId=${selectedSalonId}` : '';
      const dateParam = customDate ? `&selectedDate=${customDate}` : '';
      const staffParam = selectedStaffIdFilter !== 'all' ? `&staffId=${selectedStaffIdFilter}` : '';

      const res = await axios.get(
        `/api/dashboard/staff-activity?filter=${activityFilter}${salonParam}${dateParam}${staffParam}`,
        {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.data.success) {
        setStaffActivities(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      // salonId query param — selected salon for Admin, blank for others (uses JWT salonId)
      const salonParam = selectedSalonId ? `&salonId=${selectedSalonId}` : '';

      const [businessRes, customerRes, staffRes] = await Promise.all([
        axios.get(`/api/dashboard/business?filter=${filter}${salonParam}`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/dashboard/customers?filter=${filter}${salonParam}`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/dashboard/staff?filter=${filter}${salonParam}`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setBusinessData(businessRes.data.data);
      setCustomerData(customerRes.data.data);
      setStaffData(staffRes.data.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Called after successfully adding a new salon
  const handleSalonAdded = (newSalon) => {
    const updatedList = [newSalon, ...salons];
    dispatch(setSalonsList(updatedList));
    dispatch(setSelectedSalon(newSalon));
  };

  const handleSalonUpdated = (updatedSalon) => {
    const updatedList = salons.map(s => s._id === updatedSalon._id ? updatedSalon : s);
    dispatch(setSalonsList(updatedList));
    dispatch(setSelectedSalon(updatedSalon));
  };

  const handleDeleteSalon = async (salon) => {
    const confirmed = await confirm({
      title: 'Delete Salon Branch',
      message: `Are you sure you want to delete "${salon.salonName}"? This action is permanent and cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`/api/salon/${salon._id}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const updatedList = salons.filter(s => s._id !== salon._id);
        dispatch(setSalonsList(updatedList));
        if (updatedList.length > 0) {
          dispatch(setSelectedSalon(updatedList[0]));
        } else {
          dispatch(setSelectedSalon(null));
        }
        showToast('Salon deleted successfully!');
      }
    } catch (err) {
      console.error('Failed to delete salon:', err);
      showToast(err.response?.data?.message || 'Failed to delete salon', 'error');
    }
  };

  if (loading) return <div className="dashboard-loading">Loading Analytics...</div>;

  // Safe fallbacks
  const totalRev = businessData?.totalRevenue?.total || 0;
  const totalBills = businessData?.totalRevenue?.totalBills || 0;
  const newCust = customerData?.newCustomers || 0;
  const totalCust = customerData?.totalCustomers || 0;
  const revenueTrend = businessData?.revenueTrend || [];
  const serviceBreakdown = businessData?.serviceBreakdown || [];

  const formattedStaffData = staffData.map(s => ({
    name: s.staffName || 'Unknown',
    revenue: s.totalRevenue || 0,
    customers: s.totalCustomers || 0
  }));

  return (
    <div className="dashboard-home">

      {/* Top Controls */}
      <div className="dashboard-controls">
        <div className="dashboard-title-block">
          <h1 className="page-title">Business Overview</h1>
          {/* Salon Info Badge */}
          {isAdmin && selectedSalonInfo && (
            <div className="salon-badge">
              <Store size={14} />
              <span>{selectedSalonInfo.salonName}</span>
              {selectedSalonInfo.isActive !== false && <span className="salon-badge-active">Active</span>}
            </div>
          )}
        </div>

        <div className="controls-right">
          {/* Salon Selector - Only for Admin */}
          {isAdmin && salons.length > 0 && (
            <div className="salon-selector-wrap">
              <Store size={16} className="selector-icon" />
              <select
                value={selectedSalonId}
                onChange={handleSalonChange}
                id="salon-selector"
              >
                {salons.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.salonName}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="selector-chevron" />
            </div>
          )}

          {/* Add Salon Button - Only for Admin */}
          {isAdmin && (
            <button
              className="add-salon-btn"
              onClick={() => setShowAddModal(true)}
              id="add-salon-btn"
            >
              <Plus size={18} />
              <span>Add Salon</span>
            </button>
          )}

          <div className="filter-group">
            <button className={`filter-btn ${filter === 'daily' ? 'active' : ''}`} onClick={() => setFilter('daily')}>Today</button>
            <button className={`filter-btn ${filter === 'weekly' ? 'active' : ''}`} onClick={() => setFilter('weekly')}>This Week</button>
            <button className={`filter-btn ${filter === 'monthly' ? 'active' : ''}`} onClick={() => setFilter('monthly')}>This Month</button>
          </div>
        </div>
      </div>

      {error && (
        error.toLowerCase().includes('subscription') ? (
          <div className="bg-gradient-to-r from-violet-600/20 via-pink-600/10 to-transparent border border-violet-500/20 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400">
                <TrendingUp size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white mb-1">Active Subscription Required</h3>
                <p className="text-zinc-400 text-sm m-0">{error}</p>
              </div>
            </div>
            <a href="/dashboard/subscription" className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md no-underline whitespace-nowrap">
              Subscribe Now
            </a>
          </div>
        ) : (
          <div className="error-banner">{error}</div>
        )
      )}

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon revenue"><IndianRupee size={24} /></div>
          <div className="metric-info">
            <p>Total Revenue</p>
            <h3>₹{totalRev.toLocaleString()}</h3>
            <span className="trend positive"><TrendingUp size={14} /> {totalBills} Bills</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon customers"><Users size={24} /></div>
          <div className="metric-info">
            <p>Total Customers</p>
            <h3>{totalCust}</h3>
            <span className="trend positive"><TrendingUp size={14} /> +{newCust} New</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon services"><Scissors size={24} /></div>
          <div className="metric-info">
            <p>Services Rendered</p>
            <h3>{businessData?.serviceBreakdown?.reduce((acc, curr) => acc + curr.totalBookings, 0) || 0}</h3>
            <span className="trend neutral">Top: {serviceBreakdown[0]?._id || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Salon Details Card - only when a salon is selected */}
      {isAdmin && selectedSalonInfo && (
        <div className="salon-detail-card">
          <div className="salon-detail-header">
            <div className="salon-detail-header-left">
              <div className="salon-detail-icon"><Store size={20} /></div>
              <div>
                <h3>{selectedSalonInfo.salonName}</h3>
                <p>Salon Details</p>
              </div>
            </div>
            <div className="salon-detail-actions">
              <button 
                className="salon-action-btn edit" 
                onClick={() => setEditingSalonData(selectedSalonInfo)}
                title="Edit Salon"
              >
                <Pencil size={16} />
              </button>
              <button 
                className="salon-action-btn delete" 
                onClick={() => handleDeleteSalon(selectedSalonInfo)}
                title="Delete Salon"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="salon-detail-grid">
            {selectedSalonInfo.ownerName && (
              <div className="salon-detail-item">
                <span className="detail-label">Owner</span>
                <span className="detail-value">{selectedSalonInfo.ownerName}</span>
              </div>
            )}
            {selectedSalonInfo.email && (
              <div className="salon-detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-value">{selectedSalonInfo.email}</span>
              </div>
            )}
            {selectedSalonInfo.phone && (
              <div className="salon-detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value">{selectedSalonInfo.phone}</span>
              </div>
            )}
            <div className="salon-detail-item">
              <span className="detail-label">Status</span>
              <span className={`detail-status ${selectedSalonInfo.isActive !== false ? 'active' : 'inactive'}`}>
                {selectedSalonInfo.isActive !== false ? '● Active' : '● Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Staff Service Activity Section */}
      <div className="staff-activity-section">
        <div className="activity-header">
          <div className="activity-header-title">
            <div className="activity-icon-wrap">
              <Scissors size={20} />
            </div>
            <div>
              <h2>Staff Services Activity</h2>
              <p>Track which staff provided which services on any day</p>
            </div>
          </div>

          <div className="activity-controls">
            {/* Filter Pills */}
            <div className="filter-group">
              <button
                className={`filter-btn ${activityFilter === 'daily' && !customDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('daily'); setCustomDate(''); }}
              >
                Today
              </button>
              <button
                className={`filter-btn ${activityFilter === 'weekly' && !customDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('weekly'); setCustomDate(''); }}
              >
                This Week
              </button>
              <button
                className={`filter-btn ${activityFilter === 'monthly' && !customDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('monthly'); setCustomDate(''); }}
              >
                This Month
              </button>
              <button
                className={`filter-btn ${activityFilter === 'all' && !customDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('all'); setCustomDate(''); }}
              >
                All
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="date-input-wrap">
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setActivityFilter('custom');
                }}
                className="activity-date-input"
                title="Select specific date"
              />
            </div>

            {/* Staff Dropdown Filter */}
            <div className="staff-filter-wrap">
              <select
                value={selectedStaffIdFilter}
                onChange={(e) => setSelectedStaffIdFilter(e.target.value)}
                className="activity-staff-select"
              >
                <option value="all">All Staff Members</option>
                {combinedStaffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Staff Overview Summary Cards */}
        {Object.values(
          staffActivities.reduce((acc, act) => {
            const key = act.staffName || 'Unassigned';
            if (!acc[key]) {
              acc[key] = {
                name: act.staffName,
                role: act.staffRole,
                totalServices: 0,
                totalRevenue: 0
              };
            }
            acc[key].totalServices += act.services.length;
            acc[key].totalRevenue += act.totalAmount;
            return acc;
          }, {})
        ).length > 0 && (
          <div className="staff-summary-grid">
            {Object.values(
              staffActivities.reduce((acc, act) => {
                const key = act.staffName || 'Unassigned';
                if (!acc[key]) {
                  acc[key] = {
                    name: act.staffName,
                    role: act.staffRole,
                    totalServices: 0,
                    totalRevenue: 0
                  };
                }
                acc[key].totalServices += act.services.length;
                acc[key].totalRevenue += act.totalAmount;
                return acc;
              }, {})
            ).map((summary, idx) => (
              <div key={idx} className="staff-summary-card">
                <div className="summary-card-top">
                  <div className="summary-avatar">
                    {summary.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="summary-staff-name">{summary.name}</h4>
                    <span className="summary-staff-role">{summary.role}</span>
                  </div>
                </div>
                <div className="summary-card-stats">
                  <div className="summary-stat-box">
                    <span className="stat-label">Services Delivered</span>
                    <span className="stat-value">{summary.totalServices}</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="stat-label">Total Amount</span>
                    <span className="stat-value rupee">₹{summary.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detailed Service Activity Table */}
        <div className="activity-table-card">
          {activityLoading ? (
            <div className="activity-loading">Loading staff service logs...</div>
          ) : staffActivities.length > 0 ? (
            <div className="activity-table-wrapper">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Staff Member</th>
                    <th>Customer Name</th>
                    <th>Services Provided</th>
                    <th>Total Amount</th>
                    <th>Payment Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {staffActivities.map((act) => (
                    <tr key={act.billId}>
                      <td className="activity-date-cell">
                        <span className="date-main">
                          {new Date(act.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="time-sub">
                          {new Date(act.date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td>
                        <div className="activity-staff-pill">
                          <span className="mini-avatar">{act.staffName.charAt(0).toUpperCase()}</span>
                          <div>
                            <span className="staff-name-bold">{act.staffName}</span>
                            <span className="staff-role-sub">{act.staffRole}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="activity-customer-info">
                          <span className="customer-name-bold">{act.customerName}</span>
                          <span className="customer-phone-sub">{act.customerPhone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="activity-services-list">
                          {act.services.map((srv, i) => (
                            <span key={i} className="activity-service-tag">
                              {srv.serviceName} {srv.price > 0 && `(₹${srv.price})`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="activity-amount-cell">
                        ₹{act.totalAmount.toLocaleString()}
                      </td>
                      <td>
                        <span className="activity-payment-badge">
                          {act.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="activity-empty">
              No services recorded for the selected date/filter.
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-container">

        {/* Revenue Trend Chart */}
        <div className="chart-card featured">
          <h3>Revenue Trend</h3>
          <div className="chart-wrapper">
            {revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="_id" stroke="#a1a1aa" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181825', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#e879f9' }}
                  />
                  <Line type="monotone" dataKey="dailyRevenue" name="Revenue" stroke="#db2777" strokeWidth={3} dot={{ r: 4, fill: '#7c3aed' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No revenue data for this period</div>
            )}
          </div>
        </div>

        {/* Top Services Pie Chart */}
        <div className="chart-card">
          <h3>Top Services Overview</h3>
          <div className="chart-wrapper">
            {serviceBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceBreakdown.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="totalRevenue"
                    nameKey="_id"
                  >
                    {serviceBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#181825', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(value) => `₹${value}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No service data for this period</div>
            )}
          </div>
        </div>

        {/* Staff Performance Bar Chart */}
        <div className="chart-card full-width">
          <h3>Staff Revenue Performance</h3>
          <div className="chart-wrapper">
            {formattedStaffData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedStaffData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#181825', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="revenue" name="Total Revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#db2777" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No staff performance data for this period</div>
            )}
          </div>
        </div>

      </div>

      {/* Add/Edit Salon Modal */}
      {(showAddModal || editingSalonData) && isAdmin && (
        <AddSalon
          onClose={() => {
            setShowAddModal(false);
            setEditingSalonData(null);
          }}
          onSalonAdded={handleSalonAdded}
          editingSalon={editingSalonData}
          onSalonUpdated={handleSalonUpdated}
        />
      )}

      {toast && (
        <div className={`dashboard-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span>{toast.text}</span>
        </div>
      )}

    </div>
  );
}

export default DashboardHome;
