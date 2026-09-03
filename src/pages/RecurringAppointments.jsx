import { useState, useEffect } from 'react';
import axios from 'axios';
import { Repeat, Plus, Search, Trash2, Calendar, User, Clock, Scissors, X, Bell } from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import '../styles/DashboardPages.css';
import '../styles/RecurringAppointments.css';
import { useSelector } from 'react-redux';
import { useConfirm } from '../components/ConfirmModal';

export const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
};

function RecurringAppointments() {
  const confirm = useConfirm();
  const { selectedSalonId } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);
  const [recurringList, setRecurringList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Dropdown options
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4500);
  };

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
  }, [selectedSalonId]);

  const fetchRecurring = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/recurring${salonParam}`, { withCredentials: true });
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
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const [custRes, servRes, staffRes] = await Promise.all([
        axios.get(`/api/customer${salonParam}`, { withCredentials: true }),
        axios.get(`/api/service/all${salonParam}`, { withCredentials: true }),
        axios.get(`/api/staff/all${salonParam}`, { withCredentials: true })
      ]);
      setCustomers(Array.isArray(custRes.data?.data) ? custRes.data.data : (Array.isArray(custRes.data) ? custRes.data : []));
      setServices(Array.isArray(servRes.data?.data) ? servRes.data.data : (Array.isArray(servRes.data) ? servRes.data : []));
      setStaffList(Array.isArray(staffRes.data?.data) ? staffRes.data.data : (Array.isArray(staffRes.data) ? staffRes.data : []));
    } catch (err) {
      console.error("Failed to fetch dropdown options", err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = () => {
    fetchOptions();
    setErrorMsg('');
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      customerId: '', serviceId: '', staffId: '', frequency: 'Weekly',
      firstAppointmentDate: today, appointmentTime: '', endDate: '', notes: ''
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const getMinEndDate = () => {
    if (!formData.firstAppointmentDate) return '';
    const d = new Date(formData.firstAppointmentDate);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.firstAppointmentDate < todayStr) {
      setErrorMsg('Starting date cannot be in the past. Please select today or a future date.');
      setFormLoading(false);
      return;
    }

    const startYr = new Date(formData.firstAppointmentDate).getFullYear();
    if (isNaN(startYr) || startYr > 2099) {
      setErrorMsg('Invalid year. Please enter a valid 4-digit year (max 2099).');
      setFormLoading(false);
      return;
    }

    if (formData.endDate) {
      if (formData.endDate <= formData.firstAppointmentDate) {
        setErrorMsg('End date cannot be the same as or before the starting date.');
        setFormLoading(false);
        return;
      }
      const endYr = new Date(formData.endDate).getFullYear();
      if (isNaN(endYr) || endYr > 2099) {
        setErrorMsg('Invalid year in end date. Please enter a valid 4-digit year (max 2099).');
        setFormLoading(false);
        return;
      }
    }

    try {
      // Create recurring booking in the selected salon
      const payload = {
        ...formData,
        ...(selectedSalonId && { salonId: selectedSalonId })
      };
      await axios.post('/api/recurring/create', payload, { withCredentials: true });
      fetchRecurring();
      closeModal();
      showToast('Recurring series created! Automated reminders active (24h & 1h before booking).', 'success');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to setup recurring series');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async (id) => {
    const item = recurringList.find(r => r._id === id);
    const customerName = item?.customerName || 'this series';
    const confirmed = await confirm({
      title: 'Cancel Recurring Series',
      message: `Are you sure you want to cancel all future appointments in the series for "${customerName}"? They will be removed from the booking calendar.`,
      confirmText: 'Cancel Series',
      cancelText: 'Keep Series',
      type: 'danger'
    });
    if (confirmed) {
      try {
        await axios.patch(`/api/recurring/cancel/${id}`, {}, { withCredentials: true });
        fetchRecurring();
        showToast('Recurring series cancelled and future dates removed from calendar.', 'success');
      } catch (error) {
        console.error('Failed to cancel recurring series:', error);
        showToast('Failed to cancel recurring series.', 'error');
      }
    }
  };

  const handleDelete = async (id) => {
    const item = recurringList.find(r => r._id === id);
    const customerName = item?.customerName || 'this series';
    const confirmed = await confirm({
      title: 'Delete Recurring Series',
      message: `Permanently delete recurring series for "${customerName}" and all associated future scheduled appointments?`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (confirmed) {
      try {
        await axios.delete(`/api/recurring/${id}`, { withCredentials: true });
        fetchRecurring();
        showToast('Recurring series and upcoming dates permanently removed.', 'success');
      } catch (error) {
        console.error('Failed to delete recurring series:', error);
        showToast('Failed to delete recurring series.', 'error');
      }
    }
  };

  const handleSendWhatsAppReminder = async (item) => {
    if (!item || !item._id) return;
    setSendingReminderId(item._id);
    try {
      const res = await axios.post(`/api/recurring/reminder/${item._id}`, { reminderType: '24h' }, { withCredentials: true });
      if (res.data?.success) {
        showToast(`WhatsApp reminder sent to ${item.customerName}!`, 'success');
      } else {
        showToast(res.data?.message || 'Failed to send WhatsApp reminder', 'error');
      }
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error);
      const errMsg = error.response?.data?.message || 'Error sending WhatsApp reminder. You can also use WhatsApp Web.';
      showToast(errMsg, 'error');
    } finally {
      setSendingReminderId(null);
    }
  };

  const openWhatsAppWeb = (item) => {
    if (!item?.customerPhone) {
      showToast('Customer phone number is missing.', 'error');
      return;
    }
    let cleanPhone = String(item.customerPhone).replace(/\D/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const message = `*SALON APPOINTMENT REMINDER*\n--------------------------------\nHello ${item.customerName || 'Customer'},\n\nThis is a friendly reminder for your upcoming recurring appointment!\n\n*Service:* ${item.serviceName || 'Salon Service'}\n*Staff:* ${item.staffName || 'Stylist'}\n*Time:* ${item.appointmentTime || 'Scheduled Time'}\n*Schedule:* ${item.frequency || 'Recurring'}\n--------------------------------\nWe look forward to seeing you! ✨`;

    const encodedText = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  const filteredList = recurringList.filter(r =>
    r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.serviceName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      {toast.show && (
        <div className={`reminder-toast ${toast.type}`}>
          {toast.type === 'success' ? '✅ ' : '⚠️ '}
          {toast.message}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Recurring Appointments</h1>
          <p className="page-subtitle">Manage automated weekly or monthly appointment schedules</p>
          <div className="reminder-header-pill">
            <Bell size={14} /> Automatic WhatsApp Reminders: 24h & 1h before booking active
          </div>
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
                <th>WhatsApp Reminders</th>
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
                        <div>
                          <span className="font-medium text-white block">{item.customerName || 'Customer'}</span>
                          {item.customerPhone && <span className="text-sm text-gray">{item.customerPhone}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex-col-cell">
                        <span className="font-medium text-white flex-center gap-2"><Scissors size={14} className="text-pink" /> {item.serviceName || 'Service'}</span>
                        <span className="text-sm text-gray flex-center gap-2 mt-1"><User size={12} /> with {item.staffName || 'Any'}</span>
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
                        <span className="date-block text-white">Starts: {formatDisplayDate(item.startDate)}</span>
                        <span className="date-block text-gray">Ends: {item.endDate ? formatDisplayDate(item.endDate) : 'No end date'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${item.status?.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === 'Active' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            className="icon-btn whatsapp"
                            style={{ padding: '6px 10px', fontSize: '12px', gap: '4px' }}
                            disabled={sendingReminderId === item._id}
                            onClick={() => handleSendWhatsAppReminder(item)}
                            title="Send instant WhatsApp Reminder API"
                          >
                            <WhatsAppIcon size={14} />
                            {sendingReminderId === item._id ? 'Sending...' : 'Send Reminder'}
                          </button>
                          <button
                            className="icon-btn whatsapp-web"
                            onClick={() => openWhatsAppWeb(item)}
                            title="Open in WhatsApp Web"
                          >
                            <WhatsAppIcon size={12} /> Web
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {item.status === 'Active' ? (
                          <button className="icon-btn delete" onClick={() => handleCancel(item._id)} title="Cancel Series & Remove Upcoming Bookings">
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button className="icon-btn delete" style={{ color: '#ef4444' }} onClick={() => handleDelete(item._id)} title="Permanently Delete Series">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">No recurring appointments found</td>
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
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {errorMsg && <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>{errorMsg}</div>}

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
                    {services.map(s => <option key={s._id} value={s._id}>{s.serviceName || s.name} - ₹{s.price}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Staff Assigned *</label>
                  <select name="staffId" required value={formData.staffId} onChange={handleInputChange}>
                    <option value="">-- Select Staff --</option>
                    {staffList.map(s => <option key={s._id} value={s._id}>{s.name} ({s.role || 'Staff'})</option>)}
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
                  <input type="date" name="firstAppointmentDate" required min={new Date().toISOString().split('T')[0]} max="2099-12-31" value={formData.firstAppointmentDate} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Starting Time *</label>
                  <input type="time" name="appointmentTime" required value={formData.appointmentTime} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label>End Date (Optional)</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} min={getMinEndDate()} max="2099-12-31" />
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
