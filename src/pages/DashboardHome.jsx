import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import '../styles/DashboardHome.css';
import { IndianRupee, Users, Scissors, TrendingUp } from 'lucide-react';

const COLORS = ['#7c3aed', '#db2777', '#3b82f6', '#10b981', '#f59e0b'];

function DashboardHome() {
  const [filter, setFilter] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [businessData, setBusinessData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [staffData, setStaffData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [filter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetching from all 3 dashboard endpoints in parallel
      const [businessRes, customerRes, staffRes] = await Promise.all([
        axios.get(`/api/dashboard/business?filter=${filter}`, { withCredentials: true }),
        axios.get(`/api/dashboard/customers?filter=${filter}`, { withCredentials: true }),
        axios.get(`/api/dashboard/staff?filter=${filter}`, { withCredentials: true })
      ]);

      setBusinessData(businessRes.data.data);
      setCustomerData(customerRes.data.data);
      setStaffData(staffRes.data.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      // Don't completely break UI if one fails or no data yet, just show empty
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Loading Analytics...</div>;

  // Safe fallbacks for data
  const totalRev = businessData?.totalRevenue?.total || 0;
  const totalBills = businessData?.totalRevenue?.totalBills || 0;
  const newCust = customerData?.newCustomers || 0;
  const totalCust = customerData?.totalCustomers || 0;
  
  // Formatting data for charts
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
        <h1 className="page-title">Business Overview</h1>
        <div className="filter-group">
          <button className={`filter-btn ${filter === 'daily' ? 'active' : ''}`} onClick={() => setFilter('daily')}>Today</button>
          <button className={`filter-btn ${filter === 'weekly' ? 'active' : ''}`} onClick={() => setFilter('weekly')}>This Week</button>
          <button className={`filter-btn ${filter === 'monthly' ? 'active' : ''}`} onClick={() => setFilter('monthly')}>This Month</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon revenue"><IndianRupee size={24} /></div>
          <div className="metric-info">
            <p>Total Revenue</p>
            <h3>₹{totalRev.toLocaleString()}</h3>
            <span className="trend positive"><TrendingUp size={14}/> {totalBills} Bills</span>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon customers"><Users size={24} /></div>
          <div className="metric-info">
            <p>Total Customers</p>
            <h3>{totalCust}</h3>
            <span className="trend positive"><TrendingUp size={14}/> +{newCust} New</span>
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
                    data={serviceBreakdown.slice(0, 5)} // Only top 5
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
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#db2777" stopOpacity={0.8}/>
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
    </div>
  );
}

export default DashboardHome;
