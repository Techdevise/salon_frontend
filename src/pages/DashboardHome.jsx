import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import '../styles/DashboardHome.css';
import { IndianRupee, Users, Scissors, TrendingUp, Plus, Store, ChevronDown, Pencil, Trash2, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedStaffIdFilter, setSelectedStaffIdFilter] = useState('all');
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  const filteredStaffActivities = useMemo(() => {
    if (!staffActivities || staffActivities.length === 0) return [];

    return staffActivities.filter(act => {
      // 0. Exclude Cancelled appointments/orders
      const statusStr = String(act.paymentStatus || act.status || '').toLowerCase();
      if (statusStr === 'cancelled' || statusStr === 'canceled' || statusStr === 'refunded') {
        return false;
      }

      // 1. Staff Filter
      if (selectedStaffIdFilter !== 'all') {
        const actStaffId = act.staffId?.toString() || act.staffId;
        if (actStaffId !== selectedStaffIdFilter) return false;
      }

      // 2. From Date / To Date Filter
      if (fromDate || toDate) {
        const actDate = new Date(act.date);
        const year = actDate.getFullYear();
        const month = String(actDate.getMonth() + 1).padStart(2, '0');
        const day = String(actDate.getDate()).padStart(2, '0');
        const actDateStr = `${year}-${month}-${day}`;

        if (fromDate && actDateStr < fromDate) return false;
        if (toDate && actDateStr > toDate) return false;
      }

      return true;
    });
  }, [staffActivities, fromDate, toDate, selectedStaffIdFilter]);

  const ITEMS_PER_PAGE = 10;
  const totalActivityPages = Math.ceil(filteredStaffActivities.length / ITEMS_PER_PAGE) || 1;

  const paginatedStaffActivities = useMemo(() => {
    const start = (activityPage - 1) * ITEMS_PER_PAGE;
    return filteredStaffActivities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStaffActivities, activityPage]);

  // Staff list for dropdown — only from selected salon
  const combinedStaffList = useMemo(() => {
    const map = new Map();
    (allStaffList || []).forEach(s => {
      if (s._id && s.name) {
        map.set(s._id.toString(), { id: s._id.toString(), name: s.name, role: s.role || 'Staff' });
      }
    });
    return Array.from(map.values());
  }, [allStaffList]);

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
        const savedSalonId = localStorage.getItem('selectedSalonId') || selectedSalonId;
        const savedSalon = fetchedSalons.find(s => s._id === savedSalonId);
        if (savedSalon) {
          dispatch(setSelectedSalon(savedSalon));
        } else if (fetchedSalons.length > 0) {
          dispatch(setSelectedSalon(fetchedSalons[0]));
        } else {
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

  // Fetch staff list for the currently selected salon only
  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem('token');
      // Always filter by selectedSalonId so only the active salon's staff appears
      const param = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      if (!param) {
        setAllStaffList([]);
        return;
      }
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
    // Reset staff filter when salon changes to avoid stale selection
    setSelectedStaffIdFilter('all');
    if (selectedSalonId || !isAdmin) {
      fetchDashboardData();
      fetchStaffActivities();
      fetchStaffList();
    } else if (isAdmin && salons.length === 0) {
      setLoading(false);
    }
  }, [filter, selectedSalonId, salons.length, isAdmin]);

  useEffect(() => {
    setActivityPage(1);
    if (selectedSalonId || !isAdmin) {
      fetchStaffActivities();
    }
  }, [activityFilter, fromDate, toDate, selectedStaffIdFilter, selectedSalonId]);

  const fetchStaffActivities = async () => {
    setActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const filterParam = salonParam ? `&filter=${activityFilter}` : `?filter=${activityFilter}`;
      const fromParam = fromDate ? `&fromDate=${fromDate}` : '';
      const toParam = toDate ? `&toDate=${toDate}` : '';
      const staffParam = selectedStaffIdFilter !== 'all' ? `&staffId=${selectedStaffIdFilter}` : '';

      const res = await axios.get(`/api/dashboard/staff-activity${salonParam}${filterParam}${fromParam}${toParam}${staffParam}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success && Array.isArray(res.data.data)) {
        setStaffActivities(res.data.data);
      } else {
        // Fallback to billing logs if staff-activity returns empty or isn't available
        const billRes = await axios.get(`/api/billing${salonParam}`, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        });

        if (billRes.data.success || Array.isArray(billRes.data.data)) {
          const rawBills = billRes.data.data || [];
          const formattedActivities = rawBills.map(bill => {
            const staffObj = typeof bill.staffId === 'object' ? bill.staffId : bill.staffDetails;
            const custObj = typeof bill.customerId === 'object' ? bill.customerId : bill.customerDetails;

            return {
              billId: bill._id,
              staffId: staffObj?._id || bill.staffId || null,
              staffName: staffObj?.name || bill.staffName || 'Staff Member',
              staffRole: staffObj?.role || 'Staff',
              customerId: custObj?._id || bill.customerId || null,
              customerName: custObj?.name || bill.customerName || 'Customer',
              customerPhone: custObj?.phone || bill.customerPhone || 'N/A',
              services: (bill.services || []).map(s => ({
                serviceId: s.serviceId?._id || s.serviceId,
                serviceName: s.serviceName || s.serviceId?.serviceName || 'Service',
                price: s.price || s.serviceId?.price || 0
              })),
              totalAmount: bill.totalAmount || bill.subTotal || bill.paidAmount || 0,
              paymentMethod: bill.paymentMethod || 'Cash',
              paymentStatus: bill.paymentStatus || 'Paid',
              date: bill.createdAt
            };
          });
          setStaffActivities(formattedActivities);
        }
      }
    } catch (err) {
      console.error('Error loading staff activity:', err);
      setStaffActivities([]);
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

  const formattedStaffData = useMemo(() => {
    if (Array.isArray(staffData) && staffData.length > 0) {
      return staffData.map(s => ({
        name: s.staffName || 'Unknown',
        revenue: s.totalRevenue || 0,
        customers: s.totalCustomers || 0
      }));
    }

    if (filteredStaffActivities && filteredStaffActivities.length > 0) {
      const map = new Map();
      filteredStaffActivities.forEach(act => {
        const name = act.staffName || 'Staff';
        const current = map.get(name) || { revenue: 0, customers: 0 };
        map.set(name, {
          revenue: current.revenue + (Number(act.totalAmount) || 0),
          customers: current.customers + 1
        });
      });
      return Array.from(map.entries()).map(([name, data]) => ({
        name,
        revenue: data.revenue,
        customers: data.customers
      })).sort((a, b) => b.revenue - a.revenue);
    }

    if (allStaffList && allStaffList.length > 0) {
      return allStaffList.map(s => ({
        name: s.name || 'Staff',
        revenue: 0,
        customers: 0
      }));
    }

    return [];
  }, [staffData, filteredStaffActivities, allStaffList]);

  if (loading) return <div className="dashboard-loading">Loading Analytics...</div>;

  // Safe fallbacks
  const totalRev = businessData?.totalRevenue?.total || 0;
  const totalBills = businessData?.totalRevenue?.totalBills || 0;
  const newCust = customerData?.newCustomers || 0;
  const totalCust = customerData?.totalCustomers || 0;
  const revenueTrend = businessData?.revenueTrend || [];
  const serviceBreakdown = businessData?.serviceBreakdown || [];

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
            <button className={`filter-btn ${filter === 'monthly' ? 'active' : ''}`} onClick={() => setFilter('monthly')}>This Month</button>
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
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
            <h3>{businessData?.serviceBreakdown?.reduce((acc, curr) => acc + curr.totalBookings, 0) || totalBills || 0}</h3>
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
                className={`filter-btn ${activityFilter === 'daily' && !fromDate && !toDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('daily'); setFromDate(''); setToDate(''); }}
              >
                Today
              </button>
              <button
                className={`filter-btn ${activityFilter === 'monthly' && !fromDate && !toDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('monthly'); setFromDate(''); setToDate(''); }}
              >
                This Month
              </button>
              <button
                className={`filter-btn ${activityFilter === 'all' && !fromDate && !toDate ? 'active' : ''}`}
                onClick={() => { setActivityFilter('all'); setFromDate(''); setToDate(''); }}
              >
                All
              </button>
            </div>

            {/* From Date to To Date Range Selection */}
            <div className="date-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 500 }}>From:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setActivityFilter('custom');
                  }}
                  className="activity-date-input"
                  title="From Date"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 500 }}>To:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setActivityFilter('custom');
                  }}
                  className="activity-date-input"
                  title="To Date"
                />
              </div>
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



        {/* Detailed Service Activity Table */}
        <div className="activity-table-card">
          {activityLoading ? (
            <div className="activity-loading">Loading staff service logs...</div>
          ) : filteredStaffActivities.length > 0 ? (
            <>
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStaffActivities.map((act) => (
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
                        <td>
                          <span className={`activity-status-badge ${String(act.status || act.paymentStatus || 'Confirmed').toLowerCase()}`}>
                            {act.status || act.paymentStatus || 'Confirmed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredStaffActivities.length > 0 && (
                <div className="activity-pagination">
                  <div className="pagination-info">
                    Showing {((activityPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(activityPage * ITEMS_PER_PAGE, filteredStaffActivities.length)} of {filteredStaffActivities.length} entries
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      disabled={activityPage === 1}
                      onClick={() => setActivityPage((prev) => Math.max(prev - 1, 1))}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="pagination-page-indicator">
                      Page {activityPage} of {totalActivityPages}
                    </span>
                    <button
                      className="pagination-btn"
                      disabled={activityPage === totalActivityPages}
                      onClick={() => setActivityPage((prev) => Math.min(prev + 1, totalActivityPages))}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
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
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
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
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
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
              <ResponsiveContainer width="100%" height={300} minWidth={0}>
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
