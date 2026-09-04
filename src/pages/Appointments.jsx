import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Plus, Search, Edit2, XCircle, Clock, User, Scissors, IndianRupee, X, Store, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useSelector } from 'react-redux';
import { useConfirm } from '../components/ConfirmModal';

// Helper: generate bill after appointment creation
const generateBillForAppointment = async ({ customerId, appointmentId, staffId, services, totalAmount, salonId, paymentMethod = 'Cash', promoCode = null }) => {
  try {
    const billServices = (services || []).map(s => ({
      serviceId: s.serviceId || null,
      serviceName: s.serviceName || s.name || 'Service',
      price: Number(s.price) || Number(totalAmount) || 0,
      quantity: 1
    }));
    // If no service details available, create a generic entry
    if (!billServices.length || billServices.every(s => !s.serviceName)) {
      billServices.push({ serviceId: null, serviceName: 'Appointment Service', price: Number(totalAmount) || 0, quantity: 1 });
    }
    const payload = {
      salonId,
      customerId,
      appointmentId: appointmentId || null,
      staffId,
      services: billServices,
      tax: 18,
      discountAmount: 0,
      paidAmount: Number(totalAmount) || 0,
      paymentMethod,
      ...(promoCode && { promoCode })
    };
    const res = await axios.post('/api/billing/generate', payload, { withCredentials: true });
    return res.data?.data;
  } catch (err) {
    console.error('Bill generation failed:', err.response?.data?.message || err.message);
    alert('❌ ' + (err.response?.data?.message || err.message || 'Bill generation failed'));
    return null;
  }
};

export const normalizeStatus = (status, hasBill = false, paymentStatus = '') => {
  if (hasBill || paymentStatus === 'Paid') return 'Completed';
  if (!status) return 'Pending';
  const str = String(status).trim();
  const lower = str.toLowerCase();
  if (lower === 'completed') return 'Completed';
  if (lower === 'pending') return 'Pending';
  if (lower === 'confirmed') return 'Confirmed';
  if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
  if (lower === 'reschedule') return 'Reschedule';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};


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

const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = '-- Select --',
  required = false,
  name,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) => {
      const label = (opt.label || '').toLowerCase();
      const sublabel = (opt.sublabel || '').toLowerCase();
      const searchTerms = (opt.searchTerms || '').toLowerCase();
      return label.includes(q) || sublabel.includes(q) || searchTerms.includes(q);
    });
  }, [options, searchQuery]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => { }}
          required={required}
          tabIndex={-1}
          style={{ opacity: 0, position: 'absolute', width: '100%', height: 0, bottom: 0, pointerEvents: 'none' }}
        />
      )}

      <div
        className={`searchable-select-trigger ${className}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.04)',
          border: isOpen ? '1px solid #c59d5f' : '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '0.75rem 0.9rem',
          color: selectedOption ? '#fff' : '#a1a1aa',
          fontSize: '0.92rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ color: '#a1a1aa', marginLeft: '8px', flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div
          className="searchable-select-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: '#1c1c21',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: '#18181b' }}>
            <input
              type="text"
              placeholder="🔍 Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem',
                fontSize: '0.85rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
            <div
              onClick={() => {
                onChange({ target: { name, value: '' } });
                setIsOpen(false);
                setSearchQuery('');
              }}
              style={{
                padding: '0.6rem 0.9rem',
                cursor: 'pointer',
                color: '#a1a1aa',
                fontSize: '0.88rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              {placeholder}
            </div>

            {filteredOptions.length === 0 ? (
              <div style={{ padding: '0.75rem 0.9rem', color: '#71717a', fontSize: '0.85rem', textAlign: 'center' }}>
                No matching results
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange({ target: { name, value: opt.value } });
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '0.65rem 0.9rem',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.45 : 1,
                    color: opt.disabled ? '#71717a' : String(value) === String(opt.value) ? '#c59d5f' : '#fff',
                    background: String(value) === String(opt.value) ? 'rgba(197, 157, 95, 0.15)' : 'transparent',
                    fontSize: '0.88rem',
                    transition: 'background 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  onMouseEnter={(e) => {
                    if (!opt.disabled && String(value) !== String(opt.value)) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!opt.disabled && String(value) !== String(opt.value)) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{opt.label}</span>
                  {opt.sublabel && <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{opt.sublabel}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const calculateRecurringDateTime = (baseDateStr, baseTimeStr, interval) => {
  const dStr = baseDateStr || new Date().toISOString().split('T')[0];
  const tStr = (baseTimeStr && baseTimeStr !== 'TBD') ? baseTimeStr : '09:00';

  const [year, month, day] = dStr.split('-').map(Number);
  const [hours, minutes] = tStr.split(':').map(Number);

  const dateObj = new Date(year, month - 1, day, hours || 9, minutes || 0, 0);

  if (interval === '2_hours') {
    dateObj.setHours(dateObj.getHours() + 2);
  } else if (interval === '2_days') {
    dateObj.setDate(dateObj.getDate() + 2);
  } else if (interval === '3_days') {
    dateObj.setDate(dateObj.getDate() + 3);
  }

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const formattedTime = `${hh}:${min}`;

  return { date: formattedDate, startTime: formattedTime };
};

function Appointments() {
  const { selectedSalonId, selectedSalonInfo } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, selectedStatusFilter, selectedSalonId]);

  // Modal & Option States
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [discountsList, setDiscountsList] = useState([]);
  const [selectedPromoCode, setSelectedPromoCode] = useState('');
  const [walkInSelectedPromoCode, setWalkInSelectedPromoCode] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [walkInSelectedServices, setWalkInSelectedServices] = useState([]);

  // Search filter states for modals
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [walkInCustomerSearch, setWalkInCustomerSearch] = useState('');
  const [walkInServiceSearch, setWalkInServiceSearch] = useState('');
  const [walkInPackageSearch, setWalkInPackageSearch] = useState('');
  const [walkInStaffSearch, setWalkInStaffSearch] = useState('');

  // Recurring Appointment states
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [recurringStep, setRecurringStep] = useState('question'); // 'question' | 'options'
  const [selectedRecurringIntervals, setSelectedRecurringIntervals] = useState([]); // ['2_hours', '2_days', '3_days']

  // Form states
  const [formData, setFormData] = useState({
    customerId: '',
    staffId: '',
    serviceId: '',
    packageId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    totalAmount: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [filterDate, selectedSalonId]);

  useEffect(() => {
    fetchOptions();
  }, [selectedSalonId]);

  const fetchOptions = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const [staffRes, custRes, servRes, pkgRes, discRes] = await Promise.all([
        axios.get(`/api/staff/all${salonParam}`, { withCredentials: true }),
        axios.get(`/api/customer${salonParam}`, { withCredentials: true }),
        axios.get(`/api/service/all${salonParam}`, { withCredentials: true }),
        axios.get(`/api/package${salonParam}`, { withCredentials: true }),
        axios.get(`/api/discount${salonParam}`, { withCredentials: true })
      ]);
      setStaffList(staffRes.data.data || []);
      setCustomerList(custRes.data.data || []);
      const activeServices = (servRes.data.data || []).filter(s => s.isActive !== false && s.status !== 'Unavailable' && s.isAvailable !== false);
      setServiceList(activeServices);
      setPackagesList(pkgRes.data.data || []);
      setDiscountsList((discRes.data?.data || []).filter(d => d.isActive));
    } catch (err) {
      console.error("Failed to load select options", err);
    }
  };

  const applyPromoToAmount = (baseAmount, promoCode) => {
    if (!promoCode || !baseAmount || isNaN(baseAmount)) return baseAmount;
    const disc = discountsList.find(d => d.promoCode === promoCode);
    if (!disc) return baseAmount;
    const now = new Date();
    if (disc.startDate && now < new Date(disc.startDate)) return baseAmount;
    if (disc.endDate && now > new Date(disc.endDate)) return baseAmount;
    const limit = disc.usageLimit;
    const used = Number(disc.usedCount || 0);
    if (limit !== null && limit !== undefined && limit !== '' && used >= Number(limit)) return baseAmount;
    if (disc.minOrderAmount && baseAmount < disc.minOrderAmount) return baseAmount;
    let discAmt = 0;
    if (disc.discountType === 'Percentage') {
      discAmt = (baseAmount * disc.discountValue) / 100;
      if (disc.maxDiscountAmount && discAmt > disc.maxDiscountAmount) {
        discAmt = disc.maxDiscountAmount;
      }
    } else {
      discAmt = disc.discountValue;
    }
    return Math.max(0, baseAmount - discAmt);
  };

  const calculateTotalWithPromo = (servicesList, packageId, promoCode) => {
    let base = (servicesList || []).reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    if (packageId) {
      const pkg = packagesList.find(p => p._id === packageId);
      if (pkg) {
        base += Number(pkg.packagePrice || pkg.price || 0);
      }
    }
    return applyPromoToAmount(base, promoCode);
  };

  const handleAddService = (serviceId) => {
    if (!serviceId) return;
    const service = serviceList.find(s => s._id === serviceId);
    if (!service) return;
    if (selectedServices.some(s => s._id === serviceId)) return;

    const next = [...selectedServices, service];
    setSelectedServices(next);
    setFormData(prev => ({
      ...prev,
      totalAmount: calculateTotalWithPromo(next, prev.packageId, selectedPromoCode)
    }));

    const cat = (service.category || '').toLowerCase();
    const nameLower = (service.serviceName || '').toLowerCase();
    if (cat === 'hair treatment' || cat.includes('hair treatment') || nameLower.includes('hair treatment')) {
      setRecurringStep('question');
      setSelectedRecurringIntervals([]);
      setShowRecurringDialog(true);
    }
  };

  const handleRemoveService = (serviceId) => {
    const next = selectedServices.filter(s => s._id !== serviceId);
    setSelectedServices(next);
    setFormData(prev => ({
      ...prev,
      totalAmount: calculateTotalWithPromo(next, prev.packageId, selectedPromoCode)
    }));

    const hasHairTreatment = next.some(s => {
      const cat = (s.category || '').toLowerCase();
      const nameLower = (s.serviceName || '').toLowerCase();
      return cat === 'hair treatment' || cat.includes('hair treatment') || nameLower.includes('hair treatment');
    });
    if (!hasHairTreatment) {
      setSelectedRecurringIntervals([]);
    }
  };

  const handleWalkInAddService = (serviceId) => {
    if (!serviceId) return;
    const service = serviceList.find(s => s._id === serviceId);
    if (!service) return;
    if (walkInSelectedServices.some(s => s._id === serviceId)) return;

    const next = [...walkInSelectedServices, service];
    setWalkInSelectedServices(next);
    setWalkInFormData(prev => ({
      ...prev,
      totalAmount: calculateTotalWithPromo(next, prev.packageId, walkInSelectedPromoCode)
    }));

    const cat = (service.category || '').toLowerCase();
    const nameLower = (service.serviceName || '').toLowerCase();
    if (cat === 'hair treatment' || cat.includes('hair treatment') || nameLower.includes('hair treatment')) {
      setRecurringStep('question');
      setSelectedRecurringIntervals([]);
      setShowRecurringDialog(true);
    }
  };

  const handleWalkInRemoveService = (serviceId) => {
    const next = walkInSelectedServices.filter(s => s._id !== serviceId);
    setWalkInSelectedServices(next);
    setWalkInFormData(prev => ({
      ...prev,
      totalAmount: calculateTotalWithPromo(next, prev.packageId, walkInSelectedPromoCode)
    }));

    const hasHairTreatment = next.some(s => {
      const cat = (s.category || '').toLowerCase();
      const nameLower = (s.serviceName || '').toLowerCase();
      return cat === 'hair treatment' || cat.includes('hair treatment') || nameLower.includes('hair treatment');
    });
    if (!hasHairTreatment) {
      setSelectedRecurringIntervals([]);
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
    let updatedData = { ...formData, [name]: value };

    if (name === 'packageId') {
      updatedData.packageId = value;
      updatedData.totalAmount = calculateTotalWithPromo(selectedServices, value, selectedPromoCode);
    }
    setFormData(updatedData);
  };

  // Walk-in Modal states
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInFormData, setWalkInFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    serviceId: '',
    packageId: '',
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
    setWalkInCustomerSearch('');
    setWalkInServiceSearch('');
    setWalkInPackageSearch('');
    setWalkInStaffSearch('');
    setWalkInSelectedPromoCode('');
    setWalkInSelectedServices([]);
    setSelectedRecurringIntervals([]);
    const today = new Date().toISOString().split('T')[0];
    setWalkInDate(today);
    setAvailableSlots([]);
    setWalkInFormData({
      customerId: '',
      customerName: '',
      customerPhone: '',
      serviceId: '',
      packageId: '',
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

    if (name === 'packageId') {
      updatedWalkIn.packageId = value;
      updatedWalkIn.totalAmount = calculateTotalWithPromo(walkInSelectedServices, value, walkInSelectedPromoCode);
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

    if (walkInSelectedServices.length === 0 && !walkInFormData.packageId) {
      setWalkInError('Please select at least one Service or Package.');
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

      // 3. Resolve Services / Package
      let targetServiceIds = walkInSelectedServices.map(s => s._id);
      let noteParts = [];
      if (walkInSelectedServices.length > 0) {
        noteParts.push(`[Services: ${walkInSelectedServices.map(s => s.serviceName).join(', ')}]`);
      }

      if (walkInFormData.packageId) {
        const pkg = packagesList.find(p => p._id === walkInFormData.packageId);
        if (pkg) {
          noteParts.push(`[Package: ${pkg.packageName}]`);
          const pkgServices = (pkg.services || [])
            .map(s => (typeof s === 'object' ? (s.serviceId?._id || s.serviceId || s._id) : s))
            .filter(Boolean);
          pkgServices.forEach(pid => {
            const pidStr = pid.toString();
            if (!targetServiceIds.includes(pidStr)) {
              targetServiceIds.push(pidStr);
            }
          });
        }
      }

      const serviceNoteText = noteParts.join(' ');

      if (!targetStaffId || targetServiceIds.length === 0) {
        throw new Error("Salon requires at least one staff and service/package record in database.");
      }

      const payload = {
        customerId: targetCustomerId,
        staffId: targetStaffId,
        services: targetServiceIds,
        packageId: walkInFormData.packageId || null,
        promoCode: walkInSelectedPromoCode || null,
        date: walkInDate || new Date().toISOString().split('T')[0],
        timeSlot: { start: walkInFormData.startTime || 'TBD', end: "TBD" },
        totalAmount: Number(walkInFormData.totalAmount) || 0,
        notes: walkInFormData.notes ? `${serviceNoteText} ${walkInFormData.notes}` : serviceNoteText,
        ...(selectedSalonId && { salonId: selectedSalonId })
      };

      const createdRes = await axios.post('/api/appointment/create', payload, { withCredentials: true });
      const createdApt = createdRes.data?.data;

      // Create recurring appointments if selected
      if (selectedRecurringIntervals.length > 0) {
        for (const interval of selectedRecurringIntervals) {
          const { date: recDate, startTime: recTime } = calculateRecurringDateTime(
            payload.date,
            payload.timeSlot?.start,
            interval
          );
          const recPayload = {
            ...payload,
            date: recDate,
            timeSlot: { start: recTime, end: 'TBD' },
            notes: payload.notes ? `[Recurring: ${interval.replace('_', ' ')}] ${payload.notes}` : `[Recurring: ${interval.replace('_', ' ')}]`
          };
          try {
            await axios.post('/api/appointment/create', recPayload, { withCredentials: true });
          } catch (err) {
            console.error(`Error creating recurring appointment (${interval}):`, err);
          }
        }
      }

      fetchAppointments();
      fetchOptions();
      setShowWalkInModal(false);
      setWalkInSelectedServices([]);
      setSelectedRecurringIntervals([]);

      // Bill will be generated automatically when status is changed to Completed
    } catch (error) {
      setWalkInError(error.response?.data?.message || error.message || 'Failed to create walk-in booking');
    } finally {
      setWalkInLoading(false);
    }
  };

  const openModal = (appointment = null) => {
    fetchOptions();
    setErrorMsg('');
    setCustomerSearch('');
    setServiceSearch('');
    setPackageSearch('');
    setStaffSearch('');
    setSelectedPromoCode('');
    setSelectedRecurringIntervals([]);
    const today = new Date().toISOString().split('T')[0];
    if (appointment) {
      setEditingAppointment(appointment);
      const initialServices = (appointment.serviceDetails || []).map(s => ({
        _id: s._id,
        serviceName: s.serviceName,
        price: s.price,
        category: s.category
      }));
      setSelectedServices(initialServices);
      setFormData({
        customerId: appointment.customerId?._id || appointment.customerId || '',
        staffId: appointment.staffId?._id || appointment.staffId || '',
        serviceId: '',
        packageId: appointment.packageId || '',
        date: appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : (filterDate >= today ? filterDate : today),
        startTime: appointment.timeSlot?.start ? format24Hour(appointment.timeSlot.start) : '',
        totalAmount: appointment.totalAmount || '',
        notes: appointment.notes || ''
      });
    } else {
      setEditingAppointment(null);
      setSelectedServices([]);
      setFormData({
        customerId: '', staffId: '', serviceId: '', packageId: '',
        date: filterDate >= today ? filterDate : today, startTime: '', totalAmount: '', notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAppointment(null);
    setSelectedServices([]);
    setSelectedRecurringIntervals([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    if (!formData.customerId) {
      setErrorMsg('Please select a customer.');
      setFormLoading(false);
      return;
    }
    if (!formData.staffId) {
      setErrorMsg('Please select a staff member.');
      setFormLoading(false);
      return;
    }
    if (selectedServices.length === 0 && !formData.packageId) {
      setErrorMsg('Please select at least one Service or Package.');
      setFormLoading(false);
      return;
    }
    if (!formData.startTime) {
      setErrorMsg('Please select a time slot.');
      setFormLoading(false);
      return;
    }

    try {
      let targetServiceIds = selectedServices.map(s => s._id);
      let noteParts = [];
      if (selectedServices.length > 0) {
        noteParts.push(`[Services: ${selectedServices.map(s => s.serviceName).join(', ')}]`);
      }

      if (formData.packageId) {
        const pkg = packagesList.find(p => p._id === formData.packageId);
        if (pkg) {
          noteParts.push(`[Package: ${pkg.packageName}]`);
          const pkgServices = (pkg.services || [])
            .map(s => (typeof s === 'object' ? (s.serviceId?._id || s.serviceId || s._id) : s))
            .filter(Boolean);
          pkgServices.forEach(pid => {
            const pidStr = pid.toString();
            if (!targetServiceIds.includes(pidStr)) {
              targetServiceIds.push(pidStr);
            }
          });
        }
      }

      const serviceNoteText = noteParts.join(' ');

      const payload = {
        customerId: formData.customerId,
        staffId: formData.staffId,
        services: targetServiceIds,
        packageId: formData.packageId || null,
        promoCode: selectedPromoCode || null,
        date: formData.date,
        timeSlot: { start: formData.startTime, end: "TBD" },
        totalAmount: Number(formData.totalAmount) || 0,
        notes: formData.notes ? `${serviceNoteText} ${formData.notes}` : serviceNoteText,
        ...(selectedSalonId && { salonId: selectedSalonId })
      };

      if (editingAppointment) {
        alert("Full edit not supported by current API routes. Use status toggles.");
        setFormLoading(false);
        return;
      } else {
        const createdRes = await axios.post('/api/appointment/create', payload, { withCredentials: true });
        const createdApt = createdRes.data?.data;

        // Create recurring appointments if selected
        if (selectedRecurringIntervals.length > 0) {
          for (const interval of selectedRecurringIntervals) {
            const { date: recDate, startTime: recTime } = calculateRecurringDateTime(
              payload.date,
              payload.timeSlot?.start,
              interval
            );
            const recPayload = {
              ...payload,
              date: recDate,
              timeSlot: { start: recTime, end: 'TBD' },
              notes: payload.notes ? `[Recurring: ${interval.replace('_', ' ')}] ${payload.notes}` : `[Recurring: ${interval.replace('_', ' ')}]`
            };
            try {
              await axios.post('/api/appointment/create', recPayload, { withCredentials: true });
            } catch (err) {
              console.error(`Error creating recurring appointment (${interval}):`, err);
            }
          }
        }

        fetchAppointments();
        closeModal();
        setSelectedServices([]);
        setSelectedRecurringIntervals([]);

        // Bill will be generated automatically when status is changed to Completed
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to create booking');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateBillForExistingAppointment = async (apt) => {
    if (apt.hasBill || apt.paymentStatus === 'Paid') {
      alert(`Bill already generated for this appointment (Invoice: ${apt.billDetails?.[0]?.invoiceNumber || 'Paid'}). Duplicate bill generation is blocked.`);
      return;
    }

    const custName = apt.customerDetails?.name || 'Customer';
    const totalAmt = Number(apt.totalAmount) || 0;
    const confirmed = await confirm({
      title: 'Generate Bill Confirmation',
      message: `Are you sure you want to generate the bill of ₹${totalAmt} for ${custName}?`,
      confirmText: 'Generate Bill',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!confirmed) return;

    let billServiceDetails = (apt.serviceDetails || []).map(s => ({
      serviceId: s._id || null,
      serviceName: s.serviceName || 'Service',
      price: Number(s.price) || totalAmt || 0,
      quantity: 1
    }));
    if (!billServiceDetails.length) {
      billServiceDetails = [{ serviceId: null, serviceName: 'Appointment Service', price: totalAmt, quantity: 1 }];
    }

    const result = await generateBillForAppointment({
      customerId: apt.customerId?._id || apt.customerId,
      appointmentId: apt._id,
      staffId: apt.staffId?._id || apt.staffId,
      services: billServiceDetails,
      totalAmount: totalAmt,
      salonId: selectedSalonId || user?.salonId,
      paymentMethod: 'Cash'
    });

    if (result) {
      alert(`✅ Bill generated successfully! Invoice No: ${result.invoiceNumber || 'Generated'}`);
      fetchAppointments();
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
    const currentNormStatus = normalizeStatus(apt?.status, apt?.hasBill, apt?.paymentStatus);

    // Once Completed, status is permanently locked — no changes allowed
    if (currentNormStatus === 'Completed') {
      return;
    }
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

      // When service is marked Completed → ask to open Billing page
      // Exception: Skip for Hair Treatment recurring appointments (only main appointment gets billed)
      if (newStatus === 'Completed' && apt) {
        const isRecurringHairTreatment = apt.notes && apt.notes.includes('[Recurring:');
        if (!isRecurringHairTreatment && !apt.hasBill && apt.paymentStatus !== 'Paid') {
          const totalAmt = Number(apt.totalAmount) || 0;
          const custName = apt.customerDetails?.name || 'Customer';

          const openBilling = await confirm({
            title: '✅ Service Completed!',
            message: `Service completed for ${custName} (₹${totalAmt}). Open Billing page to generate the bill?`,
            confirmText: 'Generate Bill',
            cancelText: 'Later',
            type: 'info'
          });

          if (openBilling) {
            // Build pre-filled service items from appointment
            let prefilledItems = (apt.serviceDetails || []).map(s => ({
              id: s._id || ('pre_' + Date.now() + Math.random()),
              serviceId: s._id || null,
              name: s.serviceName || 'Service',
              price: Number(s.price) || totalAmt || 0,
              quantity: 1,
              type: 'service'
            }));

            // Fallback: if no serviceDetails, create one item from totalAmount
            if (!prefilledItems.length) {
              prefilledItems = [{
                id: 'pre_apt_' + apt._id,
                serviceId: null,
                name: 'Appointment Service',
                price: totalAmt,
                quantity: 1,
                type: 'custom'
              }];
            }

            // Resolve IDs from appointment data
            const resolvedCustomerId =
              apt.customerDetails?._id ||
              apt.customerId?._id ||
              (typeof apt.customerId === 'string' ? apt.customerId : null);

            const resolvedStaffId =
              apt.staffDetails?._id ||
              apt.staffId?._id ||
              (typeof apt.staffId === 'string' ? apt.staffId : null);

            let formattedSlot = '';
            if (typeof apt.timeSlot === 'string') {
              formattedSlot = apt.timeSlot;
            } else if (apt.timeSlot && typeof apt.timeSlot === 'object') {
              if (apt.timeSlot.start && apt.timeSlot.end && apt.timeSlot.end !== 'TBD') {
                formattedSlot = `${apt.timeSlot.start} - ${apt.timeSlot.end}`;
              } else if (apt.timeSlot.start) {
                formattedSlot = apt.timeSlot.start;
              }
            }

            // Navigate to Billing page with pre-filled data via route state
            navigate('/dashboard/billing', {
              state: {
                fromAppointment: true,
                appointmentId: apt._id,
                customerId: resolvedCustomerId,
                customerName: apt.customerDetails?.name || 'Customer',
                customerPhone: apt.customerDetails?.phone || '',
                staffId: resolvedStaffId,
                billItems: prefilledItems,
                promoCode: apt.promoCode || null,
                packageId: apt.packageId || null,
                timeSlot: formattedSlot || null,
                date: apt.date || null
              }
            });
          }
        }
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = (id) => {
    const apt = appointments.find(a => a._id === id);
    if (apt) {
      if (normalizeStatus(apt.status, apt.hasBill, apt.paymentStatus) === 'Completed') {
        alert('A completed service appointment cannot be cancelled.');
        return;
      }
      openCancelModal(apt);
    }
  };

  const getStatusColor = (status) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'Pending': return 'warning';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      case 'Reschedule': return 'info';
      default: return 'inactive';
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedStatusFilter === 'All') return true;
    return normalizeStatus(apt.status, apt.hasBill, apt.paymentStatus).toLowerCase() === selectedStatusFilter.toLowerCase();
  });

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage) || 1;
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            max="2099-12-31"
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
          <>
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
                {paginatedAppointments.length > 0 ? (
                  paginatedAppointments.map((apt) => {
                    const currentNormStatus = normalizeStatus(apt.status, apt.hasBill, apt.paymentStatus);
                    const isLocked = currentNormStatus === 'Cancelled' || currentNormStatus === 'Completed';
                    return (
                      <tr key={apt._id}>
                        <td>
                          <div className="time-cell">
                            <Clock size={16} /> {format24Hour(apt.timeSlot?.start)}
                          </div>
                        </td>
                        <td>
                          <div className="user-combo" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14} /> {apt.customerDetails?.name || apt.customerId || 'Walk-in'}</span>
                            {apt.customerDetails?.phone && <span style={{ fontSize: '0.75rem', color: '#a1a1aa', paddingLeft: '18px' }}>{apt.customerDetails.phone}</span>}
                          </div>
                        </td>
                        <td>
                          <div className="service-combo" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {apt.notes && apt.notes.includes('[Package:') && (
                              <span style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 500 }} title={apt.notes}>
                                📦 {apt.notes.match(/\[Package:\s*([^\]]+)\]/)?.[1] || 'Package'}
                              </span>
                            )}
                            {apt.serviceDetails && apt.serviceDetails.length > 0 ? (
                              apt.serviceDetails.length === 1 ? (
                                <span style={{ color: '#f4f4f5' }}>{apt.serviceDetails[0].serviceName}</span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {apt.serviceDetails.map((s, idx) => (
                                    <span
                                      key={s._id || idx}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        color: '#e4e4e7'
                                      }}
                                    >
                                      {s.serviceName}
                                    </span>
                                  ))}
                                </div>
                              )
                            ) : (
                              <span>{apt.notes && apt.notes.includes('[Package:') ? '' : 'Service N/A'}</span>
                            )}
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
                            className={`status-badge border-0 ${getStatusColor(currentNormStatus)}`}
                            value={currentNormStatus}
                            onChange={(e) => handleStatusChange(apt._id, e.target.value)}
                            disabled={isLocked}
                            title={currentNormStatus === 'Completed' ? 'Completed appointments cannot be changed' : currentNormStatus === 'Cancelled' ? 'Cancelled appointments cannot be changed' : ''}
                            style={isLocked ? { opacity: 0.75, cursor: 'not-allowed', pointerEvents: 'none' } : { cursor: 'pointer' }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {currentNormStatus !== 'Cancelled' && (
                              <>
                                <button
                                  className="icon-btn edit"
                                  style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#a78bfa' }}
                                  onClick={() => openRescheduleModal(apt)}
                                  title="Reschedule Appointment"
                                >
                                  <CalendarIcon size={16} />
                                </button>
                                <button
                                  className="icon-btn delete"
                                  onClick={() => handleCancel(apt._id)}
                                  disabled={currentNormStatus === 'Completed'}
                                  style={currentNormStatus === 'Completed' ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                                  title={currentNormStatus === 'Completed' ? "Completed service cannot be cancelled" : "Cancel Booking"}
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })

                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state">No appointments found for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {filteredAppointments.length > 0 && (
              <div className="table-pagination">
                <div className="pagination-info">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length} entries
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <span className="pagination-page-indicator">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
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
                    placeholder="Enter customer name"
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
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Select Services {walkInSelectedServices.length > 0 && <span style={{ color: '#c59d5f', fontSize: '0.85rem' }}>({walkInSelectedServices.length} selected)</span>}</span>
                    {walkInSelectedServices.length > 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Subtotal: ₹{walkInSelectedServices.reduce((a, b) => a + Number(b.price || 0), 0)}</span>
                    )}
                  </label>
                  <SearchableSelect
                    value=""
                    onChange={(e) => handleWalkInAddService(e.target.value)}
                    placeholder={walkInSelectedServices.length === 0 ? "-- Choose Service to Add --" : "+ Add another service..."}
                    options={serviceList.map(s => {
                      const isSelected = walkInSelectedServices.some(item => item._id === s._id);
                      return {
                        value: s._id,
                        label: isSelected ? `✓ ${s.serviceName} - ₹${s.price} (Added)` : `${s.serviceName} - ₹${s.price}`,
                        sublabel: s.category || '',
                        searchTerms: `${s.serviceName} ${s.category || ''}`,
                        disabled: isSelected
                      };
                    })}
                  />
                  {/* Selected Services Chips / List */}
                  {walkInSelectedServices.length > 0 && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                      {walkInSelectedServices.map(s => (
                        <div
                          key={s._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Scissors size={14} style={{ color: '#c59d5f' }} />
                            <span style={{ color: '#fff', fontWeight: 500 }}>{s.serviceName}</span>
                            {s.category && <span style={{ fontSize: '0.75rem', color: '#a1a1aa', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>{s.category}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#c59d5f', fontWeight: 600 }}>₹{s.price}</span>
                            <button
                              type="button"
                              onClick={() => handleWalkInRemoveService(s._id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '3px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Remove service"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedRecurringIntervals.length > 0 && walkInSelectedServices.length > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔄 Recurring set: {selectedRecurringIntervals.map(i => i.replace('_', ' ')).join(', ')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRecurringStep('options');
                          setShowRecurringDialog(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem', padding: 0 }}
                      >
                        (Change)
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Select Package (Optional)</label>
                  <SearchableSelect
                    name="packageId"
                    value={walkInFormData.packageId}
                    onChange={handleWalkInChange}
                    placeholder="-- Select Package --"
                    options={packagesList.map(p => ({
                      value: p._id,
                      label: `📦 ${p.packageName} - ₹${p.packagePrice || p.price}`,
                      searchTerms: p.packageName
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Apply Offer / Promo Code (Optional)</label>
                <select
                  value={walkInSelectedPromoCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    let basePrice = walkInSelectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
                    if (walkInFormData.packageId) {
                      const p = packagesList.find(item => item._id === walkInFormData.packageId);
                      if (p) basePrice += Number(p.packagePrice || p.price || 0);
                    }

                    const disc = discountsList.find(d => d.promoCode === code);
                    const currentWalkInCust = walkInFormData.customerId
                      ? customerList.find(c => c._id === walkInFormData.customerId)
                      : customerList.find(c => (walkInFormData.customerPhone && c.phone === walkInFormData.customerPhone) || (walkInFormData.customerName && c.name?.toLowerCase() === walkInFormData.customerName?.toLowerCase()));

                    if (currentWalkInCust?._id && disc && Array.isArray(disc.usedBy) && disc.usedBy.some(id => String(id?._id || id) === String(currentWalkInCust._id))) {
                      setWalkInError(`Promo code ${disc.promoCode} has already been used by this customer. A customer can only apply this promo code once.`);
                      setWalkInSelectedPromoCode('');
                      setWalkInFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }

                    const now = new Date();
                    if (disc && disc.startDate && now < new Date(disc.startDate)) {
                      setWalkInError(`Promo code ${disc.promoCode} is not valid yet (Valid from ${new Date(disc.startDate).toLocaleDateString()}).`);
                      setWalkInSelectedPromoCode('');
                      setWalkInFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }
                    if (disc && disc.endDate && now > new Date(disc.endDate)) {
                      setWalkInError(`Promo code ${disc.promoCode} has expired on ${new Date(disc.endDate).toLocaleDateString()}.`);
                      setWalkInSelectedPromoCode('');
                      setWalkInFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }
                    if (disc && disc.minOrderAmount && basePrice < disc.minOrderAmount) {
                      setWalkInError(`This promo code is not applicable for this order. Minimum order amount ₹${disc.minOrderAmount} required.`);
                      setWalkInSelectedPromoCode('');
                      setWalkInFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }

                    setWalkInError('');
                    setWalkInSelectedPromoCode(code);
                    setWalkInFormData(prev => ({
                      ...prev,
                      totalAmount: applyPromoToAmount(basePrice, code)
                    }));
                  }}
                >
                  <option value="">-- No Discount / Promo Code --</option>
                  {discountsList
                    .filter(d => {
                      if (!d || d.isActive === false) return false;
                      const now = new Date();
                      if (d.startDate && now < new Date(d.startDate)) return false;
                      if (d.endDate && now > new Date(d.endDate)) return false;
                      if (d.usageLimit !== null && d.usageLimit !== undefined && d.usageLimit !== '' && Number(d.usedCount || 0) >= Number(d.usageLimit)) return false;
                      const currentWalkInCust = walkInFormData.customerId
                        ? customerList.find(c => c._id === walkInFormData.customerId)
                        : customerList.find(c => (walkInFormData.customerPhone && c.phone === walkInFormData.customerPhone) || (walkInFormData.customerName && c.name?.toLowerCase() === walkInFormData.customerName?.toLowerCase()));
                      if (currentWalkInCust?._id && Array.isArray(d.usedBy) && d.usedBy.some(id => String(id?._id || id) === String(currentWalkInCust._id))) return false;
                      return true;
                    })
                    .map(d => (
                      <option key={d._id} value={d.promoCode}>
                        🏷️ {d.promoCode} ({d.discountType === 'Percentage' ? `${d.discountValue}% Off` : `₹${d.discountValue} Off`})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Staff Assigned *</label>
                <SearchableSelect
                  name="staffName"
                  required
                  value={walkInFormData.staffName}
                  onChange={handleWalkInChange}
                  placeholder="-- Select Staff --"
                  options={staffList.map(s => ({
                    value: s.name,
                    label: `${s.name} (${s.role || 'Staff'})`,
                    searchTerms: `${s.name} ${s.role || ''}`
                  }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Booking Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    max="2099-12-31"
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
                <SearchableSelect
                  name="customerId"
                  required
                  value={formData.customerId}
                  onChange={handleInputChange}
                  placeholder="-- Choose Customer --"
                  options={customerList.map(c => ({
                    value: c._id,
                    label: `${c.name} (${c.phone})`,
                    searchTerms: `${c.name} ${c.phone}`
                  }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Select Services {selectedServices.length > 0 && <span style={{ color: '#c59d5f', fontSize: '0.85rem' }}>({selectedServices.length} selected)</span>}</span>
                    {selectedServices.length > 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Subtotal: ₹{selectedServices.reduce((a, b) => a + Number(b.price || 0), 0)}</span>
                    )}
                  </label>
                  <SearchableSelect
                    value=""
                    onChange={(e) => handleAddService(e.target.value)}
                    placeholder={selectedServices.length === 0 ? "-- Choose Service to Add --" : "+ Add another service..."}
                    options={serviceList.map(s => {
                      const isSelected = selectedServices.some(item => item._id === s._id);
                      return {
                        value: s._id,
                        label: isSelected ? `✓ ${s.serviceName} - ₹${s.price} (Added)` : `${s.serviceName} - ₹${s.price}`,
                        sublabel: s.category || '',
                        searchTerms: `${s.serviceName} ${s.category || ''}`,
                        disabled: isSelected
                      };
                    })}
                  />
                  {/* Selected Services Chips / List */}
                  {selectedServices.length > 0 && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
                      {selectedServices.map(s => (
                        <div
                          key={s._id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Scissors size={14} style={{ color: '#c59d5f' }} />
                            <span style={{ color: '#fff', fontWeight: 500 }}>{s.serviceName}</span>
                            {s.category && <span style={{ fontSize: '0.75rem', color: '#a1a1aa', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>{s.category}</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: '#c59d5f', fontWeight: 600 }}>₹{s.price}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveService(s._id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '3px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Remove service"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedRecurringIntervals.length > 0 && selectedServices.length > 0 && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔄 Recurring set: {selectedRecurringIntervals.map(i => i.replace('_', ' ')).join(', ')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRecurringStep('options');
                          setShowRecurringDialog(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#db2777', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.82rem', padding: 0 }}
                      >
                        (Change)
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Select Package (Optional)</label>
                  <SearchableSelect
                    name="packageId"
                    value={formData.packageId}
                    onChange={handleInputChange}
                    placeholder="-- Choose Package --"
                    options={packagesList.map(p => ({
                      value: p._id,
                      label: `📦 ${p.packageName} - ₹${p.packagePrice || p.price}`,
                      searchTerms: p.packageName
                    }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Apply Offer / Promo Code (Optional)</label>
                <select
                  value={selectedPromoCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    let basePrice = selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
                    if (formData.packageId) {
                      const p = packagesList.find(item => item._id === formData.packageId);
                      if (p) basePrice += Number(p.packagePrice || p.price || 0);
                    }

                    const disc = discountsList.find(d => d.promoCode === code);
                    if (formData.customerId && disc && Array.isArray(disc.usedBy) && disc.usedBy.some(id => String(id?._id || id) === String(formData.customerId))) {
                      setErrorMsg(`Promo code ${disc.promoCode} has already been used by this customer. A customer can only apply this promo code once.`);
                      setSelectedPromoCode('');
                      setFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }

                    const now = new Date();
                    if (disc && disc.startDate && now < new Date(disc.startDate)) {
                      setErrorMsg(`Promo code ${disc.promoCode} is not valid yet (Valid from ${new Date(disc.startDate).toLocaleDateString()}).`);
                      setSelectedPromoCode('');
                      setFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }
                    if (disc && disc.endDate && now > new Date(disc.endDate)) {
                      setErrorMsg(`Promo code ${disc.promoCode} has expired on ${new Date(disc.endDate).toLocaleDateString()}.`);
                      setSelectedPromoCode('');
                      setFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }
                    if (disc && disc.minOrderAmount && basePrice < disc.minOrderAmount) {
                      setErrorMsg(`This promo code is not applicable for this order. Minimum order amount ₹${disc.minOrderAmount} required.`);
                      setSelectedPromoCode('');
                      setFormData(prev => ({ ...prev, totalAmount: basePrice }));
                      return;
                    }

                    setErrorMsg('');
                    setSelectedPromoCode(code);
                    setFormData(prev => ({
                      ...prev,
                      totalAmount: applyPromoToAmount(basePrice, code)
                    }));
                  }}
                >
                  <option value="">-- No Discount / Promo Code --</option>
                  {discountsList
                    .filter(d => {
                      if (!d || d.isActive === false) return false;
                      const now = new Date();
                      if (d.startDate && now < new Date(d.startDate)) return false;
                      if (d.endDate && now > new Date(d.endDate)) return false;
                      if (d.usageLimit !== null && d.usageLimit !== undefined && d.usageLimit !== '' && Number(d.usedCount || 0) >= Number(d.usageLimit)) return false;
                      if (formData.customerId && Array.isArray(d.usedBy) && d.usedBy.some(id => String(id?._id || id) === String(formData.customerId))) return false;
                      return true;
                    })
                    .map(d => (
                      <option key={d._id} value={d.promoCode}>
                        🏷️ {d.promoCode} ({d.discountType === 'Percentage' ? `${d.discountValue}% Off` : `₹${d.discountValue} Off`})
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assigned Staff *</label>
                <SearchableSelect
                  name="staffId"
                  required
                  value={formData.staffId}
                  onChange={handleInputChange}
                  placeholder="-- Assign To Staff --"
                  options={staffList.map(s => ({
                    value: s._id,
                    label: `${s.name} (${s.role || 'Staff'})`,
                    searchTerms: `${s.name} ${s.role || ''}`
                  }))}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" name="date" required min={new Date().toISOString().split('T')[0]} max="2099-12-31" value={formData.date} onChange={handleInputChange} className="date-picker-input" />
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
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong>Service(s):</strong>{' '}
                  {cancelModalData.appointment?.serviceDetails && cancelModalData.appointment.serviceDetails.length > 0
                    ? cancelModalData.appointment.serviceDetails.map(s => s.serviceName).join(', ')
                    : (cancelModalData.appointment?.notes && cancelModalData.appointment.notes.includes('[Package:')
                      ? (cancelModalData.appointment.notes.match(/\[Package:\s*([^\]]+)\]/)?.[1] || 'Package')
                      : 'Service')}
                </p>
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
                      max="2099-12-31"
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

      {/* Recurring Appointment Dialog Modal */}
      {showRecurringDialog && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>🔄 Recurring Appointment</h2>
              <button className="close-btn" onClick={() => setShowRecurringDialog(false)}><X size={20} /></button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {recurringStep === 'question' ? (
                <div>
                  <p style={{ color: '#f4f4f5', fontSize: '1.05rem', fontWeight: 500, marginBottom: '1.5rem', lineHeight: '1.6', textAlign: 'center' }}>
                    Is there any recurring appointment needed?
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      style={{ flex: 1, padding: '0.75rem' }}
                      onClick={() => {
                        setSelectedRecurringIntervals([]);
                        setShowRecurringDialog(false);
                      }}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #7c3aed, #db2777)', justifyContent: 'center' }}
                      onClick={() => setRecurringStep('options')}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Select recurring appointment interval(s):
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    {[
                      { id: '2_hours', label: '2 Hours' },
                      { id: '2_days', label: '2 Days' },
                      { id: '3_days', label: '3 Days' }
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '0.75rem 1rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: selectedRecurringIntervals.includes(opt.id) ? '1px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.95rem'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecurringIntervals.includes(opt.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecurringIntervals(prev => [...prev, opt.id]);
                            } else {
                              setSelectedRecurringIntervals(prev => prev.filter(i => i !== opt.id));
                            }
                          }}
                          style={{ width: '18px', height: '18px', accentColor: '#7c3aed', cursor: 'pointer' }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setRecurringStep('question')}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
                      onClick={() => setShowRecurringDialog(false)}
                    >
                      Confirm ({selectedRecurringIntervals.length} selected)
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
