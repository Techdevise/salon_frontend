import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, Plus, Search, Edit2, Trash2, Clock, User, Scissors, IndianRupee, X, Store, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useSelector } from 'react-redux';
import { useConfirm } from '../components/ConfirmModal';

// Helper: generate bill after appointment creation
const generateBillForAppointment = async ({ customerId, staffId, services, totalAmount, salonId, paymentMethod = 'Cash' }) => {
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
      staffId,
      services: billServices,
      tax: 18,
      discountAmount: 0,
      paidAmount: Number(totalAmount) || 0,
      paymentMethod
    };
    const res = await axios.post('/api/billing/generate', payload, { withCredentials: true });
    return res.data?.data;
  } catch (err) {
    console.error('Bill generation failed:', err.response?.data?.message || err.message);
    return null;
  }
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
                    onChange({ target: { name, value: opt.value } });
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '0.65rem 0.9rem',
                    cursor: 'pointer',
                    color: String(value) === String(opt.value) ? '#c59d5f' : '#fff',
                    background: String(value) === String(opt.value) ? 'rgba(197, 157, 95, 0.15)' : 'transparent',
                    fontSize: '0.88rem',
                    transition: 'background 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  onMouseEnter={(e) => {
                    if (String(value) !== String(opt.value)) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (String(value) !== String(opt.value)) {
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

function Appointments() {
  const { selectedSalonId, selectedSalonInfo } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);
  const confirm = useConfirm();
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

  // Search filter states for modals
  const [customerSearch, setCustomerSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [packageSearch, setPackageSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [walkInCustomerSearch, setWalkInCustomerSearch] = useState('');
  const [walkInServiceSearch, setWalkInServiceSearch] = useState('');
  const [walkInPackageSearch, setWalkInPackageSearch] = useState('');
  const [walkInStaffSearch, setWalkInStaffSearch] = useState('');

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

    if (name === 'serviceId') {
      if (value) {
        updatedData.packageId = '';
        const selectedService = serviceList.find(s => s._id === value);
        if (selectedService) {
          updatedData.totalAmount = applyPromoToAmount(selectedService.price, selectedPromoCode);
        }
      } else if (!updatedData.packageId) {
        updatedData.totalAmount = '';
      }
    } else if (name === 'packageId') {
      if (value) {
        updatedData.serviceId = '';
        const selectedPkg = packagesList.find(p => p._id === value);
        if (selectedPkg) {
          const pkgPrice = selectedPkg.packagePrice || selectedPkg.price || 0;
          updatedData.totalAmount = applyPromoToAmount(pkgPrice, selectedPromoCode);
        }
      } else if (!updatedData.serviceId) {
        updatedData.totalAmount = '';
      }
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

    if (name === 'serviceId') {
      if (value) {
        updatedWalkIn.packageId = '';
        const selectedService = serviceList.find(s => s._id === value);
        if (selectedService) {
          updatedWalkIn.totalAmount = applyPromoToAmount(selectedService.price, walkInSelectedPromoCode);
        }
      } else if (!updatedWalkIn.packageId) {
        updatedWalkIn.totalAmount = '';
      }
    } else if (name === 'packageId') {
      if (value) {
        updatedWalkIn.serviceId = '';
        const selectedPkg = packagesList.find(p => p._id === value);
        if (selectedPkg) {
          const pkgPrice = selectedPkg.packagePrice || selectedPkg.price || 0;
          updatedWalkIn.totalAmount = applyPromoToAmount(pkgPrice, walkInSelectedPromoCode);
        }
      } else if (!updatedWalkIn.serviceId) {
        updatedWalkIn.totalAmount = '';
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

      if (!walkInFormData.serviceId && !walkInFormData.packageId) {
        setWalkInError('Please select either a Service or a Package.');
        setWalkInLoading(false);
        return;
      }

      // 3. Resolve Services / Package
      let targetServiceIds = [];
      let serviceNoteText = '';
      let billServiceDetails = [];

      if (walkInFormData.packageId) {
        const pkg = packagesList.find(p => p._id === walkInFormData.packageId);
        if (pkg) {
          serviceNoteText = `[Package: ${pkg.packageName}]`;
          billServiceDetails = [{ serviceId: null, serviceName: `Package: ${pkg.packageName}`, price: Number(walkInFormData.totalAmount) || 0 }];
          const pkgServices = (pkg.services || [])
            .map(s => (typeof s === 'object' ? (s.serviceId?._id || s.serviceId || s._id) : s))
            .filter(Boolean);
          targetServiceIds = pkgServices.length > 0 ? pkgServices : [serviceList[0]?._id].filter(Boolean);
        }
      } else if (walkInFormData.serviceId) {
        const s = serviceList.find(item => item._id === walkInFormData.serviceId);
        if (s) {
          serviceNoteText = `[Service: ${s.serviceName}]`;
          billServiceDetails = [{ serviceId: s._id, serviceName: s.serviceName, price: Number(walkInFormData.totalAmount) || Number(s.price) || 0 }];
        }
        targetServiceIds = [walkInFormData.serviceId];
      }

      if (!targetStaffId || targetServiceIds.length === 0) {
        throw new Error("Salon requires at least one staff and service/package record in database.");
      }

      const payload = {
        customerId: targetCustomerId,
        staffId: targetStaffId,
        services: targetServiceIds,
        date: walkInDate || new Date().toISOString().split('T')[0],
        timeSlot: { start: walkInFormData.startTime || 'TBD', end: "TBD" },
        totalAmount: Number(walkInFormData.totalAmount) || 0,
        notes: walkInFormData.notes ? `${serviceNoteText} ${walkInFormData.notes}` : serviceNoteText,
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

  // Standalone bill generation for walk-in
  const [walkInBillLoading, setWalkInBillLoading] = useState(false);
  const [walkInBillMsg, setWalkInBillMsg] = useState('');

  const handleGenerateWalkInBill = async () => {
    setWalkInBillMsg('');
    if (!walkInFormData.customerName.trim() || !walkInFormData.customerPhone.trim()) {
      setWalkInBillMsg('❌ Please fill Customer Name and Phone first.');
      return;
    }
    if (!walkInFormData.serviceId && !walkInFormData.packageId) {
      setWalkInBillMsg('❌ Please select a Service or Package first.');
      return;
    }
    setWalkInBillLoading(true);
    try {
      // Resolve customer
      let targetCustomerId = walkInFormData.customerId;
      if (!targetCustomerId) {
        const existingCust = customerList.find(
          c => c.phone === walkInFormData.customerPhone ||
            c.name.toLowerCase() === walkInFormData.customerName.toLowerCase()
        );
        if (existingCust) {
          targetCustomerId = existingCust._id;
        } else {
          const custRes = await axios.post('/api/customer/create', {
            name: walkInFormData.customerName,
            phone: walkInFormData.customerPhone,
            ...(selectedSalonId && { salonId: selectedSalonId })
          }, { withCredentials: true });
          targetCustomerId = custRes.data?.data?._id;
        }
      }
      const matchedStaff = staffList.find(s => s.name.toLowerCase().includes(walkInFormData.staffName.toLowerCase()));
      const targetStaffId = matchedStaff?._id || staffList[0]?._id;

      let billServiceDetails = [];
      if (walkInFormData.packageId) {
        const pkg = packagesList.find(p => p._id === walkInFormData.packageId);
        if (pkg) billServiceDetails = [{ serviceId: null, serviceName: `Package: ${pkg.packageName}`, price: Number(walkInFormData.totalAmount) || 0 }];
      } else if (walkInFormData.serviceId) {
        const s = serviceList.find(item => item._id === walkInFormData.serviceId);
        if (s) billServiceDetails = [{ serviceId: s._id, serviceName: s.serviceName, price: Number(walkInFormData.totalAmount) || Number(s.price) || 0 }];
      }

      const result = await generateBillForAppointment({
        customerId: targetCustomerId,
        staffId: targetStaffId,
        services: billServiceDetails,
        totalAmount: Number(walkInFormData.totalAmount) || 0,
        salonId: selectedSalonId || user?.salonId,
        paymentMethod: 'Cash'
      });
      if (result) {
        setWalkInBillMsg('✅ Bill generated successfully!');
      } else {
        setWalkInBillMsg('❌ Bill generation failed. Please try again.');
      }
    } catch (err) {
      setWalkInBillMsg('❌ ' + (err.response?.data?.message || err.message || 'Bill generation failed.'));
    } finally {
      setWalkInBillLoading(false);
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
    const today = new Date().toISOString().split('T')[0];
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        customerId: appointment.customerId || '',
        staffId: appointment.staffId || '',
        serviceId: appointment.services?.[0] || '',
        date: appointment.date ? new Date(appointment.date).toISOString().split('T')[0] : (filterDate >= today ? filterDate : today),
        startTime: appointment.timeSlot?.start ? format24Hour(appointment.timeSlot.start) : '',
        totalAmount: appointment.totalAmount || '',
        notes: appointment.notes || ''
      });
    } else {
      setEditingAppointment(null);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date < todayStr) {
      setErrorMsg('Booking date cannot be in the past. Please select today or a future date.');
      setFormLoading(false);
      return;
    }

    const apptYr = new Date(formData.date).getFullYear();
    if (isNaN(apptYr) || apptYr > 2099) {
      setErrorMsg('Invalid year. Please enter a valid 4-digit year (max 2099).');
      setFormLoading(false);
      return;
    }

    if (!formData.serviceId && !formData.packageId) {
      setErrorMsg('Please select either a Service or a Package.');
      setFormLoading(false);
      return;
    }

    try {
      let targetServiceIds = [];
      let serviceNoteText = '';
      let billServiceDetails = [];

      if (formData.packageId) {
        const pkg = packagesList.find(p => p._id === formData.packageId);
        if (pkg) {
          serviceNoteText = `[Package: ${pkg.packageName}]`;
          billServiceDetails = [{ serviceId: null, serviceName: `Package: ${pkg.packageName}`, price: Number(formData.totalAmount) || 0 }];
          const pkgServices = (pkg.services || [])
            .map(s => (typeof s === 'object' ? (s.serviceId?._id || s.serviceId || s._id) : s))
            .filter(Boolean);
          targetServiceIds = pkgServices.length > 0 ? pkgServices : [serviceList[0]?._id].filter(Boolean);
        }
      } else if (formData.serviceId) {
        const s = serviceList.find(item => item._id === formData.serviceId);
        if (s) {
          serviceNoteText = `[Service: ${s.serviceName}]`;
          billServiceDetails = [{ serviceId: s._id, serviceName: s.serviceName, price: Number(formData.totalAmount) || Number(s.price) || 0 }];
        }
        targetServiceIds = [formData.serviceId];
      }

      const payload = {
        customerId: formData.customerId,
        staffId: formData.staffId,
        services: targetServiceIds,
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

  // Standalone bill generation for new booking
  const [newBillLoading, setNewBillLoading] = useState(false);
  const [newBillMsg, setNewBillMsg] = useState('');

  const handleGenerateNewBookingBill = async () => {
    setNewBillMsg('');
    if (!formData.customerId) {
      setNewBillMsg('❌ Please select a customer first.');
      return;
    }
    if (!formData.staffId) {
      setNewBillMsg('❌ Please select a staff member first.');
      return;
    }
    if (!formData.serviceId && !formData.packageId) {
      setNewBillMsg('❌ Please select a Service or Package first.');
      return;
    }
    setNewBillLoading(true);
    try {
      let billServiceDetails = [];
      if (formData.packageId) {
        const pkg = packagesList.find(p => p._id === formData.packageId);
        if (pkg) billServiceDetails = [{ serviceId: null, serviceName: `Package: ${pkg.packageName}`, price: Number(formData.totalAmount) || 0 }];
      } else if (formData.serviceId) {
        const s = serviceList.find(item => item._id === formData.serviceId);
        if (s) billServiceDetails = [{ serviceId: s._id, serviceName: s.serviceName, price: Number(formData.totalAmount) || Number(s.price) || 0 }];
      }
      const result = await generateBillForAppointment({
        customerId: formData.customerId,
        staffId: formData.staffId,
        services: billServiceDetails,
        totalAmount: Number(formData.totalAmount) || 0,
        salonId: selectedSalonId || user?.salonId,
        paymentMethod: 'Cash'
      });
      if (result) {
        setNewBillMsg('✅ Bill generated successfully!');
      } else {
        setNewBillMsg('❌ Bill generation failed. Please try again.');
      }
    } catch (err) {
      setNewBillMsg('❌ ' + (err.response?.data?.message || err.message || 'Bill generation failed.'));
    } finally {
      setNewBillLoading(false);
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
    if (apt?.status === 'Completed' && newStatus === 'Cancelled') {
      alert('A completed service appointment cannot be cancelled.');
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
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = (id) => {
    const apt = appointments.find(a => a._id === id);
    if (apt) {
      if (apt.status === 'Completed') {
        alert('A completed service appointment cannot be cancelled.');
        return;
      }
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

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedStatusFilter === 'All') return true;
    return (apt.status || 'Pending').toLowerCase() === selectedStatusFilter.toLowerCase();
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
                  paginatedAppointments.map((apt) => (
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
                        <div className="service-combo">
                          {apt.notes && apt.notes.includes('[Package:') ? (
                            <span title={apt.notes}>📦 {apt.notes.match(/\[Package:\s*([^\]]+)\]/)?.[1] || 'Package'}</span>
                          ) : (
                            <span>{apt.serviceDetails?.[0]?.serviceName || 'Service N/A'}</span>
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
                          <option value="Cancelled" disabled={apt.status === 'Completed'}>Cancelled</option>
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
                              <button
                                className="icon-btn delete"
                                onClick={() => handleCancel(apt._id)}
                                disabled={apt.status === 'Completed'}
                                style={apt.status === 'Completed' ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                                title={apt.status === 'Completed' ? "Completed service cannot be cancelled" : "Cancel Booking"}
                              >
                                <Trash2 size={16} />
                              </button>
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
                  <SearchableSelect
                    name="customerId"
                    value={walkInFormData.customerId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const found = customerList.find(c => c._id === selectedId);
                      if (found) {
                        setWalkInFormData(prev => ({
                          ...prev,
                          customerId: found._id,
                          customerName: found.name || '',
                          customerPhone: found.phone || ''
                        }));
                      }
                    }}
                    placeholder="-- Search or Select Customer --"
                    options={customerList.map(c => ({
                      value: c._id,
                      label: c.name,
                      sublabel: c.phone,
                      searchTerms: `${c.name} ${c.phone}`
                    }))}
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
                  <label>Select Service</label>
                  <SearchableSelect
                    name="serviceId"
                    value={walkInFormData.serviceId}
                    onChange={handleWalkInChange}
                    placeholder="-- Select Service --"
                    options={serviceList.map(s => ({
                      value: s._id,
                      label: `${s.serviceName} - ₹${s.price}`,
                      searchTerms: `${s.serviceName} ${s.category || ''}`
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label>Select Package</label>
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
                    setWalkInSelectedPromoCode(code);
                    let basePrice = 0;
                    if (walkInFormData.serviceId) {
                      const s = serviceList.find(item => item._id === walkInFormData.serviceId);
                      if (s) basePrice = s.price;
                    } else if (walkInFormData.packageId) {
                      const p = packagesList.find(item => item._id === walkInFormData.packageId);
                      if (p) basePrice = p.packagePrice || p.price || 0;
                    }
                    if (basePrice > 0) {
                      setWalkInFormData(prev => ({
                        ...prev,
                        totalAmount: applyPromoToAmount(basePrice, code)
                      }));
                    }
                  }}
                >
                  <option value="">-- No Discount / Promo Code --</option>
                  {discountsList.map(d => (
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

              {walkInBillMsg && (
                <div style={{ margin: '0 1.5rem 0.75rem', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', background: walkInBillMsg.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: walkInBillMsg.startsWith('✅') ? '#10b981' : '#f87171' }}>
                  {walkInBillMsg}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowWalkInModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
                  disabled={walkInBillLoading}
                  onClick={handleGenerateWalkInBill}
                >
                  {walkInBillLoading ? 'Generating...' : '🧾 Generate Bill'}
                </button>
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
                  <label>Select Service</label>
                  <SearchableSelect
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    placeholder="-- Choose Service --"
                    options={serviceList.map(s => ({
                      value: s._id,
                      label: `${s.serviceName} - ₹${s.price}`,
                      searchTerms: `${s.serviceName} ${s.category || ''}`
                    }))}
                  />
                </div>

                <div className="form-group">
                  <label>Select Package</label>
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
                    setSelectedPromoCode(code);
                    let basePrice = 0;
                    if (formData.serviceId) {
                      const s = serviceList.find(item => item._id === formData.serviceId);
                      if (s) basePrice = s.price;
                    } else if (formData.packageId) {
                      const p = packagesList.find(item => item._id === formData.packageId);
                      if (p) basePrice = p.packagePrice || p.price || 0;
                    }
                    if (basePrice > 0) {
                      setFormData(prev => ({
                        ...prev,
                        totalAmount: applyPromoToAmount(basePrice, code)
                      }));
                    }
                  }}
                >
                  <option value="">-- No Discount / Promo Code --</option>
                  {discountsList.map(d => (
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

              {newBillMsg && (
                <div style={{ margin: '0 1.5rem 0.75rem', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', background: newBillMsg.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: newBillMsg.startsWith('✅') ? '#10b981' : '#f87171' }}>
                  {newBillMsg}
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
                  disabled={newBillLoading}
                  onClick={handleGenerateNewBookingBill}
                >
                  {newBillLoading ? 'Generating...' : '🧾 Generate Bill'}
                </button>
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

    </div>
  );
}

export default Appointments;
