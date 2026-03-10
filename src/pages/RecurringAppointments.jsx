import { useState, useEffect } from 'react';
import axios from 'axios';
import { Repeat, Plus, Search, Trash2, Calendar, User, Clock, Scissors, X } from 'lucide-react';
import '../styles/DashboardPages.css';
import '../styles/RecurringAppointments.css';

function RecurringAppointments() {
  const [recurringList, setRecurringList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    staffId: '',
    frequency: 'Weekly',
    firstAppointmentDate: '',
    appointmentTime: '',
    endDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchRecurring();
    fetchOptions();
  }, []);

  const fetchRecurring = async () => {
    try {
      const res = await axios.get('/api/recurring', { withCredentials: true });
      if (res.data?.data) {
        setRecurringList(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching recurring appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [custRes, servRes, staffRes] = await Promise.all([
        axios.get('/api/customer', { withCredentials: true }),
        axios.get('/api/service/all', { withCredentials: true }),
        axios.get('/api/staff/all', { withCredentials: true })
      ]);
      setCustomers(custRes.data?.data || []);
      setServices(servRes.data?.data || []);
      setStaffList(staffRes.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch dropdown options");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = () => {
    setErrorMsg('');
    setFormData({
      customerId: '', serviceId: '', staffId: '', frequency: 'Weekly', 
      firstAppointmentDate: '', appointmentTime: '', endDate: '', notes: ''
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    try {
      await axios.post('/api/recurring/create', formData, { withCredentials: true });
      fetchRecurring();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to setup recurring series');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel all future appointments in this series?")) {
      try {
        await axios.patch(`/api/recurring/cancel/${id}`, {}, { withCredentials: true });
        fetchRecurring();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to cancel');
      }
    }
  };

  const filteredList = recurringList.filter(r => 
    r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.serviceName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring Appointments</h1>
          <p className="page-subtitle">Manage automated weekly or monthly appointment schedules</p>
        </div>
        <button className="primary-btn" onClick={openModal}>
          <Plus size={18} /> Setup New Series
        </button>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by customer or service..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading schedules...</div>
        ) : (
          <table className="data-table recurring-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service Details</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length > 0 ? (
                filteredList.map((item) => (
                  <tr key={item._id} className={item.status === 'Cancelled' ? 'row-cancelled' : ''}>
                    <td>
                      <div className="flex-cell">
                        <User size={16} className="text-gray" />
                        <span className="font-medium text-white">{item.customerName || 'Customer'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex-col-cell">
                        <span className="font-medium text-white flex-center gap-2"><Scissors size={14} className="text-pink" /> {item.serviceName || 'Service'}</span>
                        <span className="text-sm text-gray flex-center gap-2 mt-1"><User size={12}/> with {item.staffName || 'Any'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="frequency-badge">
                        <Repeat size={14} />
                        {item.frequency}
                        <div className="time-badge">{item.appointmentTime}</div>
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span className="date-block text-white">Starts: {new Date(item.startDate).toLocaleDateString()}</span>
                        <span className="date-block text-gray">Ends: {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'No end date'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${item.status?.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {item.status === 'Active' && (
                          <button className="icon-btn delete" onClick={() => handleCancel(item._id)} title="Cancel Series"><X size={16}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No recurring appointments found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h2>Setup Recurring Appointment</h2>
              <button className="close-btn" onClick={closeModal}><X size={20}/></button>
            </div>
            
            {errorMsg && <div className="error-banner" style={{margin: '0 1.5rem 1rem'}}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Customer *</label>
                  <select name="customerId" required value={formData.customerId} onChange={handleInputChange}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Service *</label>
                  <select name="serviceId" required value={formData.serviceId} onChange={handleInputChange}>
                    <option value="">-- Select Service --</option>
                    {services.filter(s => s.isActive).map(s => <option key={s._id} value={s._id}>{s.serviceName}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Staff Assigned *</label>
                  <select name="staffId" required value={formData.staffId} onChange={handleInputChange}>
                    <option value="">-- Select Staff --</option>
                    {staffList.filter(s => s.isActive).map(s => <option key={s._id} value={s._id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Frequency *</label>
                  <select name="frequency" required value={formData.frequency} onChange={handleInputChange}>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Starting Date *</label>
                  <input type="date" name="firstAppointmentDate" required value={formData.firstAppointmentDate} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Starting Time *</label>
                  <input type="time" name="appointmentTime" required value={formData.appointmentTime} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label>End Date (Optional)</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} min={formData.firstAppointmentDate} />
                <small className="form-text-muted">If left blank, it stays active until cancelled manually.</small>
              </div>

              <div className="form-group">
                <label>Internal Notes</label>
                <textarea name="notes" rows="2" value={formData.notes} onChange={handleInputChange} placeholder="e.g. Needs same color dye as usual"></textarea>
              </div>

              <div className="modal-actions mt-20">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Setting up...' : 'Save Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurringAppointments;
