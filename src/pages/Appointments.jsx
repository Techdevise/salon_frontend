import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, Plus, Search, Edit2, Trash2, Clock, User, Scissors, IndianRupee, X, Store } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useSelector } from 'react-redux';

import { useConfirm } from '../components/ConfirmModal';

function Appointments() {
  const { selectedSalonId, selectedSalonInfo } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);
  const confirm = useConfirm();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal & Option States
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [serviceList, setServiceList] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    customerId: '',
    staffId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    totalAmount: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (selectedSalonId || user?.role !== 'Admin') fetchAppointments();
  }, [filterDate, selectedSalonId]);

  useEffect(() => {
    if (selectedSalonId || user?.role !== 'Admin') fetchOptions();
  }, [selectedSalonId]);

  const fetchOptions = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const [staffRes, custRes, servRes] = await Promise.all([
        axios.get(`/api/staff/all${salonParam}`, { withCredentials: true }),
        axios.get(`/api/customer${salonParam}`, { withCredentials: true }),
        axios.get('/api/service/all', { withCredentials: true })
      ]);
      setStaffList(staffRes.data.data || []);
      setCustomerList(custRes.data.data || []);
      setServiceList(servRes.data.data || []);
    } catch (err) {
      console.error("Failed to load select options");
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const salonParam = selectedSalonId ? `&salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/appointment/date?date=${filterDate}${salonParam}`, { withCredentials: true });
      setAppointments(res.data.data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Auto populate price logic
    let updatedData = { ...formData, [name]: value };
    if (name === 'serviceId') {
      const selectedService = serviceList.find(s => s._id === value);
      if (selectedService) {
        updatedData.totalAmount = selectedService.price;
      }
    }
    setFormData(updatedData);
  };

  // Walk-in Modal states (Manual Text Inputs)
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInFormData, setWalkInFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceName: '',
    staffName: '',
    startTime: '10:00 AM',
    totalAmount: '',
    notes: ''
  });
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState('');

  const openWalkInModal = () => {
    setWalkInError('');
    setWalkInFormData({
      customerName: '',
      customerPhone: '',
      serviceName: '',
      staffName: staffList[0]?.name || '',
      startTime: '10:00 AM',
      totalAmount: '',
      notes: ''
    });
    setShowWalkInModal(true);
  };

  const handleWalkInChange = (e) => {
    const { name, value } = e.target;
    setWalkInFormData({ ...walkInFormData, [name]: value });
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    setWalkInLoading(true);
    setWalkInError('');

    try {
      // 1. Resolve or create Customer
      let targetCustomerId = '';
      const existingCust = customerList.find(
        c => (walkInFormData.customerPhone && c.phone === walkInFormData.customerPhone) ||
             (c.name.toLowerCase() === walkInFormData.customerName.toLowerCase())
      );

      if (existingCust) {
        targetCustomerId = existingCust._id;
      } else {
        const custRes = await axios.post('/api/customer/create', {
          name: walkInFormData.customerName || 'Walk-in Client',
          phone: walkInFormData.customerPhone || '0000000000',
          ...(selectedSalonId && { salonId: selectedSalonId })
        }, { withCredentials: true });
        targetCustomerId = custRes.data?.data?._id;
      }

      // 2. Resolve Staff ID
      const matchedStaff = staffList.find(s => s.name.toLowerCase().includes(walkInFormData.staffName.toLowerCase()));
      const targetStaffId = matchedStaff?._id || staffList[0]?._id;

      // 3. Resolve Service ID
      const matchedService = serviceList.find(s => s.serviceName.toLowerCase().includes(walkInFormData.serviceName.toLowerCase()));
      const targetServiceId = matchedService?._id || serviceList[0]?._id;

      if (!targetStaffId || !targetServiceId) {
        throw new Error("Salon requires at least one staff and service record in database.");
      }

      const payload = {
        customerId: targetCustomerId,
        staffId: targetStaffId,
        services: [targetServiceId],
        date: new Date().toISOString().split('T')[0],
        timeSlot: { start: walkInFormData.startTime || '10:00 AM', end: "TBD" },
        totalAmount: Number(walkInFormData.totalAmount) || 0,
        notes: walkInFormData.notes ? `[${walkInFormData.serviceName || 'Custom Service'}] ${walkInFormData.notes}` : `[${walkInFormData.serviceName || 'Custom Service'}]`,
        ...(selectedSalonId && { salonId: selectedSalonId })
      };

      await axios.post('/api/appointment/create', payload, { withCredentials: true });
      fetchAppointments();
      setShowWalkInModal(false);
    } catch (error) {
      setWalkInError(error.response?.data?.message || error.message || 'Failed to create walk-in booking');
    } finally {
      setWalkInLoading(false);
    }
  };

  const openModal = (appointment = null) => {
    setErrorMsg('');
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        customerId: appointment.customerId || '',
        staffId: appointment.staffId || '',
        serviceId: appointment.services?.[0] || '',
        date: appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : filterDate,
        startTime: appointment.timeSlot?.start || '',
        totalAmount: appointment.totalAmount || '',
        notes: appointment.notes || ''
      });
    } else {
      setEditingAppointment(null);
      setFormData({
        customerId: '', staffId: '', serviceId: '',
        date: filterDate, startTime: '', totalAmount: '', notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAppointment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        customerId: formData.customerId,
        staffId: formData.staffId,
        services: [formData.serviceId],
        date: formData.date,
        timeSlot: { start: formData.startTime, end: "TBD" },
        totalAmount: formData.totalAmount,
        notes: formData.notes,
        ...(selectedSalonId && { salonId: selectedSalonId })
      };

      if (editingAppointment) {
        alert("Full edit not supported by current API routes. Use status toggles.");
        setFormLoading(false);
        return;
      } else {
        await axios.post('/api/appointment/create', payload, { withCredentials: true });
      }

      fetchAppointments();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.patch(`/api/appointment/status/${id}`, { status: newStatus }, { withCredentials: true });
      fetchAppointments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = async (id) => {
    const apt = appointments.find(a => a._id === id);
    const customerName = apt?.customerDetails?.name || 'this booking';
    const confirmed = await confirm({
      title: 'Cancel Appointment',
      message: `Are you sure you want to cancel the appointment for "${customerName}"?`,
      confirmText: 'Cancel Booking',
      cancelText: 'Keep Booking',
      type: 'danger'
    });
    if (confirmed) {
      try {
        await axios.patch(`/api/appointment/cancel/${id}`, {}, { withCredentials: true });
        fetchAppointments();
      } catch (error) {
        console.error('Failed to cancel appointment:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'inactive';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments & Bookings</h1>
          <p className="page-subtitle">Manage salon schedule, staff assignments, and client bookings</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="primary-btn" style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }} onClick={() => openWalkInModal()}>
            <Plus size={18} /> Walk in Booking
          </button>
          <button className="primary-btn" onClick={() => openModal()}>
            <Plus size={18} /> New Booking
          </button>
        </div>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <CalendarIcon size={18} className="search-icon" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="date-picker-input"
          />
        </div>
        <div className="quick-filters">
          <button className="filter-pill active">All</button>
          <button className="filter-pill">Confirmed</button>
          <button className="filter-pill">Pending</button>
          <button className="filter-pill">Cancelled</button>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading appointments...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Customer</th>
                <th>Service Details</th>
                <th>Staff Assigned</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length > 0 ? (
                appointments.map((apt) => (
                  <tr key={apt._id}>
                    <td>
                      <div className="time-cell">
                        <Clock size={16} /> {apt.timeSlot?.start || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="user-combo">
                        <User size={14} /> {apt.customerDetails?.name || apt.customerId || 'Walk-in'}
                        {apt.customerDetails?.phone && <span style={{ fontSize: '0.75rem', color: '#a1a1aa', borderLeft: '1px solid #333', paddingLeft: '5px', marginLeft: '5px' }}>{apt.customerDetails?.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="service-combo">
                        <Scissors size={14} /> {apt.serviceDetails?.[0]?.serviceName || 'Service N/A'}
                      </div>
                    </td>
                    <td>
                      <span className="staff-assignee">{apt.staffDetails?.name || apt.staffId || 'Unassigned'}</span>
                    </td>
                    <td>
                      <div className="price-cell" style={{ fontWeight: 600 }}>
                        <IndianRupee size={12} /> {apt.totalAmount}
                      </div>
                    </td>
                    <td>
                      <select
                        className={`status-badge border-0 cursor-pointer ${getStatusColor(apt.status)}`}
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt._id, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {apt.status !== 'Cancelled' && (
                          <button className="icon-btn delete" onClick={() => handleCancel(apt._id)} title="Cancel Booking"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">No appointments found for this date.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Walk in Booking Modal (No Calendar Widget) */}
      {showWalkInModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Walk in Booking</h2>
              <button className="close-btn" onClick={() => setShowWalkInModal(false)}><X size={20} /></button>
            </div>

            {walkInError && <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>{walkInError}</div>}

            <form onSubmit={handleWalkInSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    name="customerName"
                    required
                    value={walkInFormData.customerName}
                    onChange={handleWalkInChange}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div className="form-group">
                  <label>Customer Phone *</label>
                  <input
                    type="tel"
                    name="customerPhone"
                    required
                    value={walkInFormData.customerPhone}
                    onChange={handleWalkInChange}
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Service Name *</label>
                  <input
                    type="text"
                    name="serviceName"
                    required
                    value={walkInFormData.serviceName}
                    onChange={handleWalkInChange}
                    placeholder="e.g. Haircut & Styling"
                  />
                </div>
                <div className="form-group">
                  <label>Staff Assigned *</label>
                  <input
                    type="text"
                    name="staffName"
                    required
                    value={walkInFormData.staffName}
                    onChange={handleWalkInChange}
                    placeholder="e.g. Aman"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time Slot *</label>
                  <input
                    type="text"
                    name="startTime"
                    required
                    value={walkInFormData.startTime}
                    onChange={handleWalkInChange}
                    placeholder="e.g. 10:30 AM"
                  />
                </div>
                <div className="form-group">
                  <label>Total Price (₹) *</label>
                  <input
                    type="number"
                    name="totalAmount"
                    required
                    min="0"
                    value={walkInFormData.totalAmount}
                    onChange={handleWalkInChange}
                    placeholder="Enter manual amount"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Booking Notes</label>
                <textarea
                  name="notes"
                  rows="2"
                  value={walkInFormData.notes}
                  onChange={handleWalkInChange}
                  placeholder="Walk-in remarks..."
                ></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowWalkInModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={walkInLoading}>
                  {walkInLoading ? 'Booking...' : 'Confirm Walk in Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Booking Modal (Original with Calendar Widget) */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Appointment Booking</h2>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {errorMsg && <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Select Customer *</label>
                <select name="customerId" required value={formData.customerId} onChange={handleInputChange}>
                  <option value="">-- Choose Customer --</option>
                  {customerList.map(c => (
                    <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Select Service *</label>
                <select name="serviceId" required value={formData.serviceId} onChange={handleInputChange}>
                  <option value="">-- Choose Service --</option>
                  {serviceList.map(s => (
                    <option key={s._id} value={s._id}>{s.serviceName} - ₹{s.price}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assigned Staff *</label>
                <select name="staffId" required value={formData.staffId} onChange={handleInputChange}>
                  <option value="">-- Assign To Staff --</option>
                  {staffList.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" name="date" required value={formData.date} onChange={handleInputChange} className="date-picker-input" />
                </div>
                <div className="form-group">
                  <label>Time Slot *</label>
                  <input type="time" name="startTime" required value={formData.startTime} onChange={handleInputChange} className="date-picker-input" />
                </div>
              </div>

              <div className="form-group">
                <label>Total Price (₹)</label>
                <input type="number" name="totalAmount" required min="0" value={formData.totalAmount} onChange={handleInputChange} placeholder="Auto calculates or enter manual" />
              </div>

              <div className="form-group">
                <label>Booking Notes</label>
                <textarea name="notes" rows="2" value={formData.notes} onChange={handleInputChange} placeholder="Special instructions for staff..."></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Appointments;
