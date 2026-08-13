import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, Plus, Search, Edit2, Trash2, Clock, User, Scissors, IndianRupee, X, Store } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useSelector } from 'react-redux';
import { useConfirm } from '../components/ConfirmModal';

export const format24Hour = (timeStr) => {
  if (!timeStr) return 'N/A';
  const str = timeStr.trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const [h, m] = str.split(':').map(Number);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const period = match[3].toUpperCase();
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  return timeStr;
};

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

  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, selectedSalonId]);

  useEffect(() => {
    fetchOptions();
  }, [selectedSalonId]);

  const fetchOptions = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const [staffRes, custRes, servRes] = await Promise.all([
        axios.get(`/api/staff/all${salonParam}`, { withCredentials: true }),
        axios.get(`/api/customer${salonParam}`, { withCredentials: true }),
        axios.get(`/api/service/all${salonParam}`, { withCredentials: true })
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
      setAppointments(res.data.data || []);
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

  // Walk-in Modal states
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInFormData, setWalkInFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceName: '',
    staffName: '',
    startTime: '',
    totalAmount: '',
    notes: ''
  });
  const [walkInDate, setWalkInDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState('');

  // Cancel/Reschedule Dialog state
  const [cancelModalData, setCancelModalData] = useState({
    show: false,
    appointment: null,
    mode: 'choice', // 'choice' | 'reschedule'
    rescheduleDate: new Date().toISOString().split('T')[0],
    rescheduleTime: '',
    loading: false,
    error: ''
  });

  // Generate available time slots based on salon hours, booked appointments & slot duration
  const generateAvailableSlots = async (date, staffName, slotDurationMins = 30) => {
    setSlotsLoading(true);
    try {
      const openingTime = selectedSalonInfo?.openingTime || '09:00';
      const closingTime = selectedSalonInfo?.closingTime || '21:00';

      // Build all possible slots
      const toMins = (t) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const toHHMM = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const start = toMins(openingTime);
      const end = toMins(closingTime) - slotDurationMins;
      const allSlots = [];
      for (let m = start; m <= end; m += slotDurationMins) {
        const timeVal = toHHMM(m);
        allSlots.push({ value: timeVal, label: timeVal });
      }

      // Fetch booked appointments for selected date + staff
      const token = localStorage.getItem('token');
      const salonParam = selectedSalonId ? `&salonId=${selectedSalonId}` : '';
      const res = await axios.get(
        `/api/appointment/date?date=${date}${salonParam}`,
        { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }
      );
      const bookedApts = res.data.data || [];

      // Filter slots for the selected staff member
      const matchedStaff = staffList.find(s => s.name === staffName);
      const filteredApts = matchedStaff
        ? bookedApts.filter(a => {
            const aptStaffId = a.staffDetails?._id || a.staffId;
            return aptStaffId?.toString() === matchedStaff._id?.toString();
          })
        : [];

      const bookedTimes = filteredApts
        .map(a => a.timeSlot?.start)
        .filter(Boolean)
        .map(t => format24Hour(t));

      // Also block past slots if selected date is today
      const now = new Date();
      const isToday = date === now.toISOString().split('T')[0];
      const currentMins = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

      const freeSlots = allSlots.filter(slot => {
        if (bookedTimes.includes(slot.value)) return false;
        if (isToday && toMins(slot.value) <= currentMins) return false;
        return true;
      });

      setAvailableSlots(freeSlots);
      // Auto-select first free slot
      if (freeSlots.length > 0) {
        setWalkInFormData(prev => ({ ...prev, startTime: freeSlots[0].value }));
        setFormData(prev => ({ ...prev, startTime: prev.startTime || freeSlots[0].value }));
        setCancelModalData(prev => ({ ...prev, rescheduleTime: prev.rescheduleTime || freeSlots[0].value }));
      } else {
        setWalkInFormData(prev => ({ ...prev, startTime: '' }));
      }
    } catch (err) {
      console.error('Error generating time slots:', err);
      // Fallback: show generic half-hour slots 09:00-21:00
      const fallback = [];
      for (let h = 9; h < 21; h++) {
        ['00', '30'].forEach(m => {
          const val = `${h.toString().padStart(2, '0')}:${m}`;
          fallback.push({ value: val, label: val });
        });
      }
      setAvailableSlots(fallback);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Regenerate slots whenever date or selected staff changes (inside modals)
  useEffect(() => {
    if (showWalkInModal && walkInDate) {
      generateAvailableSlots(walkInDate, walkInFormData.staffName);
    } else if (showModal && formData.date) {
      const selectedStaff = staffList.find(s => s._id === formData.staffId);
      generateAvailableSlots(formData.date, selectedStaff?.name || '');
    } else if (cancelModalData.show && cancelModalData.mode === 'reschedule' && cancelModalData.rescheduleDate) {
      const staffName = cancelModalData.appointment?.staffDetails?.name || '';
      generateAvailableSlots(cancelModalData.rescheduleDate, staffName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWalkInModal, walkInDate, walkInFormData.staffName, showModal, formData.date, formData.staffId, cancelModalData.show, cancelModalData.mode, cancelModalData.rescheduleDate, selectedSalonId]);

  const openWalkInModal = () => {
    fetchOptions();
    setWalkInError('');
    const today = new Date().toISOString().split('T')[0];
    setWalkInDate(today);
    setAvailableSlots([]);
    setWalkInFormData({
      customerName: '',
      customerPhone: '',
      serviceName: '',
      staffName: '',
      startTime: '',
      totalAmount: '',
      notes: ''
    });
    setShowWalkInModal(true);
  };

  const handleWalkInChange = (e) => {
    let { name, value } = e.target;
    if (name === 'customerName') {
      value = value.replace(/[0-9]/g, '');
    } else if (name === 'customerPhone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    const updatedWalkIn = { ...walkInFormData, [name]: value };
    if (name === 'serviceName') {
      const selectedService = serviceList.find(s => s.serviceName === value);
      if (selectedService) {
        updatedWalkIn.totalAmount = selectedService.price;
      }
    }
    setWalkInFormData(updatedWalkIn);
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    setWalkInError('');

    if (!walkInFormData.customerName.trim() || !walkInFormData.customerPhone.trim()) {
      setWalkInError('Customer Name and Phone Number are mandatory fields.');
      return;
    }

    if (/\d/.test(walkInFormData.customerName)) {
      setWalkInError('Customer name cannot contain numbers.');
      return;
    }

    const phoneDigits = walkInFormData.customerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setWalkInError('Phone number must be exactly 10 digits.');
      return;
    }

    setWalkInLoading(true);

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
        date: walkInDate || new Date().toISOString().split('T')[0],
        timeSlot: { start: walkInFormData.startTime || 'TBD', end: "TBD" },
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
    fetchOptions();
    setErrorMsg('');
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        customerId: appointment.customerId || '',
        staffId: appointment.staffId || '',
        serviceId: appointment.services?.[0] || '',
        date: appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : filterDate,
        startTime: appointment.timeSlot?.start ? format24Hour(appointment.timeSlot.start) : '',
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

  const openCancelModal = (apt) => {
    fetchOptions();
    const aptDate = apt.date ? new Date(apt.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setCancelModalData({
      show: true,
      appointment: apt,
      mode: 'choice',
      rescheduleDate: aptDate,
      rescheduleTime: apt.timeSlot?.start ? format24Hour(apt.timeSlot.start) : '',
      loading: false,
      error: ''
    });
  };

  const closeCancelModal = () => {
    setCancelModalData({
      show: false,
      appointment: null,
      mode: 'choice',
      rescheduleDate: '',
      rescheduleTime: '',
      loading: false,
      error: ''
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalData.appointment) return;
    setCancelModalData(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await axios.patch(`/api/appointment/cancel/${cancelModalData.appointment._id}`, {}, { withCredentials: true });
      fetchAppointments();
      closeCancelModal();
    } catch (err) {
      setCancelModalData(prev => ({ ...prev, error: err.response?.data?.message || 'Failed to cancel appointment', loading: false }));
    }
  };

  const handleConfirmReschedule = async () => {
    if (!cancelModalData.appointment) return;
    if (!cancelModalData.rescheduleDate || !cancelModalData.rescheduleTime) {
      setCancelModalData(prev => ({ ...prev, error: 'Please select both Date and Time Slot for rescheduling.' }));
      return;
    }
    setCancelModalData(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await axios.patch(
        `/api/appointment/reschedule/${cancelModalData.appointment._id}`,
        {
          date: cancelModalData.rescheduleDate,
          timeSlot: { start: cancelModalData.rescheduleTime, end: 'TBD' }
        },
        { withCredentials: true }
      );
      fetchAppointments();
      closeCancelModal();
    } catch (err) {
      setCancelModalData(prev => ({ ...prev, error: err.response?.data?.message || 'Failed to reschedule appointment', loading: false }));
    }
  };

  const openRescheduleModal = (apt) => {
    fetchOptions();
    const aptDate = apt.date ? new Date(apt.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setCancelModalData({
      show: true,
      appointment: apt,
      mode: 'reschedule',
      rescheduleDate: aptDate,
      rescheduleTime: apt.timeSlot?.start ? format24Hour(apt.timeSlot.start) : '',
      loading: false,
      error: ''
    });
  };

  const handleStatusChange = async (id, newStatus) => {
    const apt = appointments.find(a => a._id === id);
    if (newStatus === 'Cancelled' && apt) {
      openCancelModal(apt);
      return;
    }
    if (newStatus === 'Reschedule' && apt) {
      openRescheduleModal(apt);
      return;
    }
    try {
      await axios.patch(`/api/appointment/status/${id}`, { status: newStatus }, { withCredentials: true });
      fetchAppointments();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = (id) => {
    const apt = appointments.find(a => a._id === id);
    if (apt) {
      openCancelModal(apt);
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
          {['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              className={`filter-pill ${selectedStatusFilter === status ? 'active' : ''}`}
              onClick={() => setSelectedStatusFilter(status)}
            >
              {status}
            </button>
          ))}
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
              {appointments.filter((apt) => {
                if (selectedStatusFilter === 'All') return true;
                return (apt.status || 'Pending').toLowerCase() === selectedStatusFilter.toLowerCase();
              }).length > 0 ? (
                appointments
                  .filter((apt) => {
                    if (selectedStatusFilter === 'All') return true;
                    return (apt.status || 'Pending').toLowerCase() === selectedStatusFilter.toLowerCase();
                  })
                  .map((apt) => (
                  <tr key={apt._id}>
                    <td>
                      <div className="time-cell">
                        <Clock size={16} /> {format24Hour(apt.timeSlot?.start)}
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
                        className={`status-badge border-0 ${apt.status?.toLowerCase() === 'cancelled' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${getStatusColor(apt.status)}`}
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt._id, e.target.value)}
                        disabled={apt.status?.toLowerCase() === 'cancelled'}
                        style={apt.status?.toLowerCase() === 'cancelled' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                        <option value="Reschedule">Reschedule</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {apt.status !== 'Cancelled' && (
                          <>
                            <button
                              className="icon-btn edit"
                              style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' }}
                              onClick={() => openRescheduleModal(apt)}
                              title="Reschedule Appointment"
                            >
                              <CalendarIcon size={16} />
                            </button>
                            <button className="icon-btn delete" onClick={() => handleCancel(apt._id)} title="Cancel Booking"><Trash2 size={16} /></button>
                          </>
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
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Service Name *</label>
                  <select
                    name="serviceName"
                    required
                    value={walkInFormData.serviceName}
                    onChange={handleWalkInChange}
                  >
                    <option value="">-- Select Service --</option>
                    {serviceList.map((s) => (
                      <option key={s._id} value={s.serviceName}>
                        {s.serviceName} - ₹{s.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Staff Assigned *</label>
                  <select
                    name="staffName"
                    required
                    value={walkInFormData.staffName}
                    onChange={handleWalkInChange}
                  >
                    <option value="">-- Select Staff --</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s.name}>
                        {s.name} ({s.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Booking Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={walkInDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="date-picker-input"
                  />
                </div>
                <div className="form-group">
                  <label>Time Slot *</label>
                  {slotsLoading ? (
                    <select disabled>
                      <option>Loading slots...</option>
                    </select>
                  ) : availableSlots.length === 0 ? (
                    <select disabled>
                      <option>No slots available</option>
                    </select>
                  ) : (
                    <select
                      name="startTime"
                      required
                      value={walkInFormData.startTime}
                      onChange={handleWalkInChange}
                    >
                      <option value="">-- Select Time Slot --</option>
                      {availableSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
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
                  {slotsLoading ? (
                    <select disabled className="date-picker-input">
                      <option>Loading slots...</option>
                    </select>
                  ) : availableSlots.length === 0 ? (
                    <select disabled className="date-picker-input">
                      <option>No slots available</option>
                    </select>
                  ) : (
                    <select
                      name="startTime"
                      required
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="date-picker-input"
                    >
                      <option value="">-- Select Time Slot --</option>
                      {availableSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  )}
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

      {/* Cancel or Reschedule Confirmation Modal */}
      {cancelModalData.show && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>{cancelModalData.mode === 'choice' ? 'Cancel or Reschedule' : 'Reschedule Appointment'}</h2>
              <button className="close-btn" onClick={closeCancelModal}><X size={20} /></button>
            </div>

            {cancelModalData.error && (
              <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>
                {cancelModalData.error}
              </div>
            )}

            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <div style={{ marginBottom: '1.25rem', color: '#e4e4e7', fontSize: '0.95rem', lineHeight: '1.6' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>Customer:</strong> {cancelModalData.appointment?.customerDetails?.name || cancelModalData.appointment?.customerId || 'Walk-in'}</p>
                <p style={{ margin: '0 0 6px 0' }}><strong>Service:</strong> {cancelModalData.appointment?.serviceDetails?.[0]?.serviceName || 'Service'}</p>
                <p style={{ margin: 0 }}><strong>Current Schedule:</strong> {cancelModalData.appointment?.date ? new Date(cancelModalData.appointment.date).toLocaleDateString('en-IN') : 'N/A'} at {format24Hour(cancelModalData.appointment?.timeSlot?.start)}</p>
              </div>

              {cancelModalData.mode === 'choice' ? (
                <div>
                  <p style={{ color: '#f4f4f5', fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Are you sure you want to cancel this appointment, or would you like to reschedule it for another date and time slot?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', justifyContent: 'center' }}
                      onClick={() => setCancelModalData(prev => ({ ...prev, mode: 'reschedule' }))}
                    >
                      <CalendarIcon size={16} /> Reschedule Appointment
                    </button>

                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ background: '#ef4444', color: '#fff', border: 'none', justifyContent: 'center' }}
                      disabled={cancelModalData.loading}
                      onClick={handleConfirmCancel}
                    >
                      {cancelModalData.loading ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Select New Date *</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={cancelModalData.rescheduleDate}
                      onChange={(e) => setCancelModalData(prev => ({ ...prev, rescheduleDate: e.target.value }))}
                      className="date-picker-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Select New Time Slot *</label>
                    {slotsLoading ? (
                      <select disabled className="date-picker-input">
                        <option>Loading available slots...</option>
                      </select>
                    ) : availableSlots.length === 0 ? (
                      <select disabled className="date-picker-input">
                        <option>No slots available on this date</option>
                      </select>
                    ) : (
                      <select
                        required
                        value={cancelModalData.rescheduleTime}
                        onChange={(e) => setCancelModalData(prev => ({ ...prev, rescheduleTime: e.target.value }))}
                        className="date-picker-input"
                      >
                        <option value="">-- Select Time Slot --</option>
                        {availableSlots.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setCancelModalData(prev => ({ ...prev, mode: 'choice' }))}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      disabled={cancelModalData.loading}
                      onClick={handleConfirmReschedule}
                    >
                      {cancelModalData.loading ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Appointments;
