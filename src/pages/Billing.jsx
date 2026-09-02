import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Trash2, IndianRupee, Printer, Clock, X, Eye, FileText } from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import '../styles/Billing.css';
import { useSelector } from 'react-redux';

import { useConfirm } from '../components/ConfirmModal';

function Billing() {
  const confirm = useConfirm();
  const location = useLocation();
  const { selectedSalonId, selectedSalonInfo, salons } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);

  const currentSalon = selectedSalonInfo || (salons || []).find(s => s._id === selectedSalonId) || (user?.salonId && typeof user.salonId === 'object' ? user.salonId : null);
  const currentSalonName = currentSalon?.salonName || currentSalon?.name || (user?.salonName) || 'Salon';

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [discounts, setDiscounts] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  const [billItems, setBillItems] = useState([]);
  const [itemType, setItemType] = useState('service'); // 'service' | 'package' | 'custom'

  const [selectedService, setSelectedService] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');

  const [discount, setDiscount] = useState(0);
  const [selectedPromoCode, setSelectedPromoCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setToast({ show: true, message: text, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleSendWhatsAppBill = async (billId, phone) => {
    if (!billId) {
      showToast('No generated bill found to send on WhatsApp', 'error');
      return;
    }
    if (!phone) {
      showToast('Customer phone number is missing', 'error');
      return;
    }
    try {
      setSendingWhatsAppId(billId);
      const res = await axios.post(`/api/billing/${billId}/send-whatsapp`, {}, { withCredentials: true });
      if (res.data?.success) {
        showToast(res.data.message || 'WhatsApp bill sent successfully!', 'success');
      } else {
        showToast(res.data?.message || 'Failed to send WhatsApp bill', 'error');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to send WhatsApp bill via API. Try using WhatsApp Web.';
      showToast(errMsg, 'error');
    } finally {
      setSendingWhatsAppId(null);
    }
  };

  const openWhatsAppWeb = (phone, billSnapshot) => {
    if (!phone) return;
    const cleanPhone = String(phone).replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    const itemsText = (billSnapshot?.items || billSnapshot?.services || []).map(i => {
      const name = i.name || i.serviceName || 'Service';
      const qty = i.quantity || 1;
      const price = i.price || 0;
      return `• ${name} - ₹${price}${qty > 1 ? ` (x${qty})` : ''}`;
    }).join('%0A');

    const invNo = billSnapshot?.invoiceNo || billSnapshot?.invoiceNumber || 'INV';
    const total = billSnapshot?.grandTotal || billSnapshot?.totalAmount || 0;
    const custName = billSnapshot?.customer?.name || billSnapshot?.customerDetails?.name || 'Customer';

    const text = `🧾 *SALON BILL RECEIPT*%0A--------------------------------%0A*Invoice No:* ${invNo}%0A*Customer:* ${encodeURIComponent(custName)}%0A%0A*Services:*%0A${itemsText}%0A%0A--------------------------------%0A*Grand Total:* ₹${total}%0A%0AThank you for visiting! ✨`;

    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  // For pre-filling from Appointments page
  const [pendingCustomerState, setPendingCustomerState] = useState(null);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState(null);
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState(null);

  useEffect(() => {
    setSelectedCustomer(null);
    fetchCustomers();
    fetchServices();
    fetchPackages();
    fetchStaff();
    fetchDiscounts();
  }, [selectedSalonId]);

  // Pre-fill form when navigated from Appointments page
  useEffect(() => {
    const state = location.state;
    if (!state?.fromAppointment) return;

    // Pre-fill bill items from appointment services
    const itemsToSet = (state.items && state.items.length) ? state.items : (state.billItems && state.billItems.length) ? state.billItems : [];
    if (itemsToSet.length) {
      setBillItems(itemsToSet);
    }

    // Pre-fill staff
    if (state.staffId) {
      setSelectedStaffId(state.staffId);
    }

    // Store customer info and set selected customer immediately
    if (state.customerId || state.customerName) {
      setSelectedCustomer({
        _id: state.customerId || ('temp_' + Date.now()),
        name: state.customerName || 'Customer',
        phone: state.customerPhone || ''
      });
      setPendingCustomerState(state);
    }

    // Store appointmentId for linking bill
    if (state.appointmentId) {
      setLinkedAppointmentId(state.appointmentId);
    }

    // Pre-fill promo code from appointment if applied
    if (state.promoCode) {
      setSelectedPromoCode(state.promoCode);
    }

    // Pre-fill time slot from appointment if available
    if (state.timeSlot) {
      setAppointmentTimeSlot(state.timeSlot);
    }

    // Show a helpful banner
    setMessage({ text: `📋 Appointment services pre-filled for ${state.customerName || 'Customer'}. You can generate the bill now.`, type: 'success' });

    // Clear the navigation state so refreshing doesn't re-trigger
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Auto-select customer when BOTH customers list and pendingCustomerState are ready
  // This solves the timing issue where fetchCustomers runs before location.state is processed
  useEffect(() => {
    if (!pendingCustomerState || customers.length === 0) return;

    const { customerId, customerName, customerPhone } = pendingCustomerState;
    const matched = customers.find(c =>
      (customerId && (c._id === customerId || String(c._id) === String(customerId))) ||
      (customerPhone && c.phone === customerPhone) ||
      (customerName && c.name?.toLowerCase() === customerName?.toLowerCase())
    );

    if (matched) {
      setSelectedCustomer(matched);
    }
  }, [customers, pendingCustomerState]);

  const fetchDiscounts = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/discount${salonParam}`, { withCredentials: true });
      if (res.data?.data) {
        setDiscounts(res.data.data.filter(d => d.isActive));
      }
    } catch (err) {
      console.error("Failed to load discounts", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/customer${salonParam}`, { withCredentials: true });
      if (res.data?.data) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load customers", err);
    }
  };

  const fetchServices = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/service/all${salonParam}`, { withCredentials: true });
      if (res.data?.data) {
        setServices(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load services", err);
    }
  };

  const fetchPackages = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/service-package${salonParam}`, { withCredentials: true });
      if (res.data?.data) {
        setPackages(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load packages", err);
    }
  };

  const fetchStaff = async () => {
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/staff/all${salonParam}`, { withCredentials: true });
      if (res.data?.data) {
        setStaffList(res.data.data);

        // Auto-select staff member matching logged in user
        if (user) {
          const matchedStaff = res.data.data.find(
            s => s.email?.toLowerCase() === user.email?.toLowerCase() || s.name?.toLowerCase() === user.name?.toLowerCase()
          );
          if (matchedStaff) {
            setSelectedStaffId(matchedStaff._id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    c.phone.includes(searchCustomer)
  );

  const handleAddItem = () => {
    if (itemType === 'service') {
      if (!selectedService) return;
      const serviceObj = services.find(s => s._id === selectedService);
      if (!serviceObj) return;

      const existing = billItems.find(item => item.id === serviceObj._id);
      if (existing) {
        setBillItems(billItems.map(item =>
          item.id === serviceObj._id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      } else {
        setBillItems([...billItems, {
          id: serviceObj._id,
          serviceId: serviceObj._id,
          name: serviceObj.serviceName,
          price: serviceObj.price,
          quantity: 1,
          type: 'service'
        }]);
      }
      setSelectedService('');
    } else if (itemType === 'package') {
      if (!selectedPackageId) return;
      const pkgObj = packages.find(p => p._id === selectedPackageId);
      if (!pkgObj) return;

      const existing = billItems.find(item => item.id === pkgObj._id);
      if (existing) {
        setBillItems(billItems.map(item =>
          item.id === pkgObj._id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      } else {
        setBillItems([...billItems, {
          id: pkgObj._id,
          packageId: pkgObj._id,
          name: `📦 ${pkgObj.packageName}`,
          price: pkgObj.packagePrice || pkgObj.price || 0,
          quantity: 1,
          type: 'package'
        }]);
      }
      setSelectedPackageId('');
    } else if (itemType === 'custom') {
      if (!customServiceName.trim() || !customServicePrice) return;
      const customId = 'custom_' + Date.now();
      setBillItems([...billItems, {
        id: customId,
        serviceId: null,
        name: customServiceName.trim(),
        price: Number(customServicePrice),
        quantity: 1,
        type: 'custom'
      }]);
      setCustomServiceName('');
      setCustomServicePrice('');
    }
  };

  const handleRemoveItem = (id) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const handleQuantityChange = (id, newQty) => {
    if (newQty < 1) return;
    setBillItems(billItems.map(item =>
      item.id === id ? { ...item, quantity: newQty } : item
    ));
  };

  const [lastBill, setLastBill] = useState(null);

  const subtotal = billItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = Math.max(0, subtotal - discount) * 0.18; // 18% GST on taxable amount
  const grandTotal = Math.max(0, subtotal + tax - discount);

  const handlePromoCodeChange = (code) => {
    setSelectedPromoCode(code);
    if (!code) {
      setDiscount(0);
      return;
    }
    const foundDisc = discounts.find(d => d.promoCode === code);
    if (foundDisc) {
      // Check if this specific customer has already used this promo code
      if (selectedCustomer?._id && Array.isArray(foundDisc.usedBy)) {
        const isAlreadyUsed = foundDisc.usedBy.some(id => String(id?._id || id) === String(selectedCustomer._id));
        if (isAlreadyUsed) {
          setMessage({
            text: `Promo code ${foundDisc.promoCode} has already been used by ${selectedCustomer.name || 'this customer'}. A customer can only apply this promo code once.`,
            type: 'error'
          });
          setDiscount(0);
          setSelectedPromoCode('');
          return;
        }
      }

      const now = new Date();
      if (foundDisc.startDate && now < new Date(foundDisc.startDate)) {
        setMessage({ text: `Promo code ${foundDisc.promoCode} is not valid yet (Valid from ${new Date(foundDisc.startDate).toLocaleDateString()})`, type: 'error' });
        setDiscount(0);
        setSelectedPromoCode('');
        return;
      }
      if (foundDisc.endDate && now > new Date(foundDisc.endDate)) {
        setMessage({ text: `Promo code ${foundDisc.promoCode} has expired on ${new Date(foundDisc.endDate).toLocaleDateString()}`, type: 'error' });
        setDiscount(0);
        setSelectedPromoCode('');
        return;
      }
      const limit = foundDisc.usageLimit;
      const used = Number(foundDisc.usedCount || 0);
      if (limit !== null && limit !== undefined && limit !== '' && used >= Number(limit)) {
        setMessage({ text: `Promo code ${foundDisc.promoCode} usage limit reached (${limit} max limit)`, type: 'error' });
        setDiscount(0);
        setSelectedPromoCode('');
        return;
      }
      if (foundDisc.minOrderAmount && subtotal < foundDisc.minOrderAmount) {
        setMessage({ text: `This promo code is not applicable for this order. Minimum bill amount ₹${foundDisc.minOrderAmount} required.`, type: 'error' });
        setDiscount(0);
        setSelectedPromoCode('');
        return;
      }
      let discAmt = 0;
      if (foundDisc.discountType === 'Percentage') {
        discAmt = (subtotal * foundDisc.discountValue) / 100;
        if (foundDisc.maxDiscountAmount && discAmt > foundDisc.maxDiscountAmount) {
          discAmt = foundDisc.maxDiscountAmount;
        }
      } else {
        discAmt = foundDisc.discountValue;
      }
      discAmt = Math.min(discAmt, subtotal);
      setDiscount(discAmt);
      setMessage({ text: `Applied ${foundDisc.promoCode} (-₹${discAmt})`, type: 'success' });
    }
  };

  // Re-evaluate discount if subtotal or customer changes
  useEffect(() => {
    if (selectedPromoCode) {
      handlePromoCodeChange(selectedPromoCode);
    }
  }, [subtotal, selectedCustomer]);

  const selectedStaff = staffList.find(s => s._id === selectedStaffId);

  const fetchBillingHistory = async () => {
    try {
      setLoadingHistory(true);
      setShowHistoryModal(true);
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/billing${salonParam}`, { withCredentials: true });
      if (res.data?.data) {
        setHistoryList(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch billing history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const triggerPrint = () => {
    const originalTitle = document.title;
    document.title = ' ';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handlePrintHistoryBill = (bill) => {
    const sTotal = Number(bill.subTotal || bill.totalAmount || 0);
    const dAmount = Number(bill.discountAmount || 0);
    const taxable = Math.max(0, sTotal - dAmount);
    let taxAmt = 0;
    if (bill.taxAmount !== undefined && bill.taxAmount !== null && Number(bill.taxAmount) > 0) {
      taxAmt = Number(bill.taxAmount);
    } else if (bill.tax !== undefined && bill.tax !== null && Number(bill.tax) > 0) {
      const tVal = Number(bill.tax);
      taxAmt = tVal <= 100 ? (taxable * tVal) / 100 : tVal;
    } else {
      taxAmt = taxable * 0.18;
    }

    const snapshot = {
      invoiceNo: bill.invoiceNumber || bill._id?.substring(0, 8) || 'INV',
      date: new Date(bill.createdAt).toLocaleString(),
      salonName: bill.salonId?.salonName || bill.salonId?.name || currentSalonName,
      customer: {
        name: bill.customerDetails?.name || 'Walk-in Customer',
        phone: bill.customerDetails?.phone || 'N/A'
      },
      staff: {
        name: bill.staffDetails?.name || 'Assigned Staff'
      },
      items: (bill.services || []).map(s => ({
        name: s.serviceName || s.serviceId?.serviceName || 'Service',
        quantity: s.quantity || 1,
        price: s.price || 0
      })),
      subtotal: sTotal,
      tax: taxAmt,
      discount: dAmount,
      grandTotal: Number(bill.totalAmount || bill.paidAmount || 0),
      paymentMethod: bill.paymentMethod || 'Cash'
    };
    setLastBill(snapshot);
    setTimeout(() => {
      triggerPrint();
    }, 300);
  };

  const filteredHistory = historyList.filter(bill => {
    const query = historySearch.toLowerCase().trim();
    if (!query) return true;
    const custName = (bill.customerDetails?.name || '').toLowerCase();
    const custPhone = (bill.customerDetails?.phone || '').toLowerCase();
    const staffName = (bill.staffDetails?.name || '').toLowerCase();
    const payMethod = (bill.paymentMethod || '').toLowerCase();
    const invNo = (bill.invoiceNumber || bill._id || '').toLowerCase();
    return custName.includes(query) || custPhone.includes(query) || staffName.includes(query) || payMethod.includes(query) || invNo.includes(query);
  });

  const handleGenerateBill = async () => {
    if (isSubmitting) return;

    if (!selectedCustomer) {
      setMessage({ text: 'Please select a customer', type: 'error' });
      return;
    }
    const activeSalonId = selectedSalonId || user?.salonId;
    if (selectedCustomer?.salonId && activeSalonId && String(selectedCustomer.salonId) !== String(activeSalonId)) {
      setMessage({ text: 'Selected customer does not belong to this salon. Cannot generate bill.', type: 'error' });
      return;
    }
    if (!selectedStaffId) {
      setMessage({ text: 'Please select a staff member', type: 'error' });
      return;
    }
    if (billItems.length === 0) {
      setMessage({ text: 'Please add at least one service or package', type: 'error' });
      return;
    }

    const confirmed = await confirm({
      title: 'Generate Bill Confirmation',
      message: `Are you sure you want to generate the bill for ₹${grandTotal.toFixed(2)}?`,
      confirmText: 'Generate Bill',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const packageItem = billItems.find(i => i.type === 'package');
      const selectedPkgId = packageItem ? packageItem.packageId : null;

      const payload = {
        salonId: selectedSalonId || user?.salonId,
        customerId: selectedCustomer._id,
        appointmentId: linkedAppointmentId || null,
        staffId: selectedStaffId,
        services: billItems.map(i => ({
          serviceId: i.serviceId && !String(i.serviceId).startsWith('custom_') ? i.serviceId : null,
          serviceName: i.name,
          price: Number(i.price) || 0,
          quantity: Number(i.quantity) || 1
        })),
        packageId: selectedPkgId,
        promoCode: selectedPromoCode || null,
        tax: 18,
        discountAmount: Number(discount),
        paidAmount: grandTotal,
        paymentMethod
      };

      const res = await axios.post('/api/billing/generate', payload, { withCredentials: true });

      // Save complete last bill snapshot before resetting form
      const generatedBillObj = {
        _id: res.data?.data?._id,
        invoiceNo: res.data?.data?.invoiceNumber || res.data?.data?._id?.substring(0, 8) || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleString(),
        salonName: currentSalonName,
        customer: { ...selectedCustomer },
        staff: selectedStaff ? { ...selectedStaff } : { name: 'Staff Member' },
        timeSlot: appointmentTimeSlot,
        items: [...billItems],
        subtotal,
        tax,
        discount: Number(discount),
        grandTotal,
        paymentMethod
      };

      setLastBill(generatedBillObj);
      setMessage({ text: '📱 Bill generated & sent to customer WhatsApp successfully!', type: 'success' });

      // Reset form fields
      setBillItems([]);
      setSelectedCustomer(null);
      setSearchCustomer('');
      setDiscount(0);
      setSelectedPromoCode('');
      setPaymentMethod('Cash');
      setLinkedAppointmentId(null);
      setAppointmentTimeSlot(null);

      fetchDiscounts();

      // Auto trigger print dialog after small delay so DOM updates
      setTimeout(() => {
        triggerPrint();
      }, 300);

    } catch (err) {
      console.error(err);
      setMessage({
        text: err.response?.data?.message || 'Failed to generate bill',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="billing-container">
      {toast.show && (
        <div className={`billing-toast ${toast.type}`}>
          {toast.type === 'success' ? '✅ ' : '⚠️ '}
          {toast.message}
        </div>
      )}
      <div className="billing-header">
        <h1>Billing & Payment</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={fetchBillingHistory}
          >
            <Clock size={18} /> All History
          </button>
          {/* <button
            className="btn-secondary"
            disabled={!lastBill && billItems.length === 0}
            onClick={triggerPrint}
          >
            <Printer size={18} /> Print Last Bill
          </button> */}
          {lastBill && (
            <>
              <button
                className="btn-secondary"
                style={{ background: '#25D366', color: '#fff', border: 'none', fontWeight: 600 }}
                disabled={sendingWhatsAppId === (lastBill._id || 'last')}
                onClick={() => handleSendWhatsAppBill(lastBill._id, lastBill.customer?.phone)}
              >
                <WhatsAppIcon size={18} /> {sendingWhatsAppId === (lastBill._id || 'last') ? 'Sending...' : 'Send WhatsApp'}
              </button>
              <button
                className="btn-secondary"
                style={{ background: 'rgba(37, 211, 102, 0.15)', color: '#4ade80', border: '1px solid rgba(37, 211, 102, 0.4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => openWhatsAppWeb(lastBill.customer?.phone, lastBill)}
              >
                <WhatsAppIcon size={16} /> WhatsApp Web
              </button>
            </>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="billing-grid">
        {/* Left Side - Selection */}
        <div className="billing-left">

          {/* Customer Selection */}
          <div className="billing-card">
            <h3>1. Select Customer</h3>
            {!selectedCustomer ? (
              <div className="customer-search">
                <div className="search-input-wrapper">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                  />
                </div>

                {searchCustomer && (
                  <div className="search-results">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(c => (
                        <div
                          key={c._id}
                          className="search-item"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setSearchCustomer('');
                          }}
                        >
                          <div className="c-name">{c.name}</div>
                          <div className="c-phone">{c.phone}</div>
                        </div>
                      ))
                    ) : (
                      <div className="no-results">No customers found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="selected-customer">
                <div>
                  <strong>{selectedCustomer.name}</strong>
                  <p>{selectedCustomer.phone}</p>
                </div>
                <button className="btn-text" onClick={() => setSelectedCustomer(null)}>Change</button>
              </div>
            )}
          </div>

          {/* Service & Package Selection */}
          <div className="billing-card">
            <h3>2. Add Services & Packages</h3>

            {/* Mode selection tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn-secondary ${itemType === 'service' ? 'active' : ''}`}
                onClick={() => setItemType('service')}
                style={{
                  background: itemType === 'service' ? '#7c3aed' : '#1e293b',
                  color: '#fff',
                  border: itemType === 'service' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                Catalog Service
              </button>
              <button
                type="button"
                className={`btn-secondary ${itemType === 'package' ? 'active' : ''}`}
                onClick={() => setItemType('package')}
                style={{
                  background: itemType === 'package' ? '#7c3aed' : '#1e293b',
                  color: '#fff',
                  border: itemType === 'package' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                📦 Add Package
              </button>
              <button
                type="button"
                className={`btn-secondary ${itemType === 'custom' ? 'active' : ''}`}
                onClick={() => setItemType('custom')}
                style={{
                  background: itemType === 'custom' ? '#7c3aed' : '#1e293b',
                  color: '#fff',
                  border: itemType === 'custom' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                ✨ Custom Service
              </button>
            </div>

            {/* Catalog Service Dropdown */}
            {itemType === 'service' && (
              <div className="service-add-row">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="service-select"
                >
                  <option value="">-- Select a Service --</option>
                  {services.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.serviceName} - ₹{s.price}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={handleAddItem}
                  disabled={!selectedService}
                >
                  <Plus size={18} /> Add
                </button>
              </div>
            )}

            {/* Package Selection Dropdown */}
            {itemType === 'package' && (
              <div className="service-add-row">
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="service-select"
                >
                  <option value="">-- Select a Service Package --</option>
                  {packages.map(p => (
                    <option key={p._id} value={p._id}>
                      📦 {p.packageName} - ₹{p.packagePrice || p.price}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-primary"
                  onClick={handleAddItem}
                  disabled={!selectedPackageId}
                >
                  <Plus size={18} /> Add Package
                </button>
              </div>
            )}

            {/* Custom Service Inputs */}
            {itemType === 'custom' && (
              <div className="service-add-row" style={{ flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Enter Custom Service Name"
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  className="service-select"
                  style={{ minWidth: '180px', flex: 2 }}
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={customServicePrice}
                  onChange={(e) => setCustomServicePrice(e.target.value)}
                  className="service-select"
                  style={{ width: '110px', flex: 1 }}
                />
                <button
                  className="btn-primary"
                  onClick={handleAddItem}
                  disabled={!customServiceName.trim() || !customServicePrice}
                >
                  <Plus size={18} /> Add Custom
                </button>
              </div>
            )}
          </div>

          {/* Staff Selection */}
          <div className="billing-card">
            <h3>3. Select Staff Member</h3>
            <div className="service-add-row">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="service-select"
              >
                <option value="">-- Select Staff Member --</option>
                {staffList.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Right Side - Invoice Details */}
        <div className="billing-right">
          <div className="invoice-card">
            <div className="invoice-header-info">
              <h3>Invoice Details</h3>
              <div className="invoice-meta">
                <span className="invoice-date">Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Print Friendly Customer & Staff Details */}
            <div className="invoice-details-section">
              <div className="invoice-details-row">
                <span className="label">Customer:</span>
                <span className="value">{selectedCustomer ? selectedCustomer.name : 'Not Selected'}</span>
              </div>
              {selectedCustomer?.phone && (
                <div className="invoice-details-row">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedCustomer.phone}</span>
                </div>
              )}
              <div className="invoice-details-row">
                <span className="label">Served By:</span>
                <span className="value">{selectedStaff ? selectedStaff.name : 'Not Selected'}</span>
              </div>
              {appointmentTimeSlot && (
                <div className="invoice-details-row">
                  <span className="label">Time Slot:</span>
                  <span className="value">{appointmentTimeSlot}</span>
                </div>
              )}
            </div>

            <div className="invoice-items">
              {billItems.length === 0 ? (
                <div className="empty-invoice">No services added yet</div>
              ) : (
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                            className="qty-input"
                          />
                          <span className="print-only" style={{ display: 'none' }}>{item.quantity}</span>
                        </td>
                        <td>₹{item.price}</td>
                        <td>₹{item.price * item.quantity}</td>
                        <td>
                          <button className="btn-icon danger" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="invoice-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Tax (18%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>

              <div className="payment-method-row" style={{ marginBottom: '8px' }}>
                <span>Apply Offer / Discount</span>
                <div>
                  <select
                    value={selectedPromoCode}
                    onChange={(e) => handlePromoCodeChange(e.target.value)}
                    className="payment-select"
                  >
                    <option value="">-- Select Offer --</option>
                    {discounts
                      .filter(d => {
                        if (!d || d.isActive === false) return false;
                        const now = new Date();
                        if (d.startDate && now < new Date(d.startDate)) return false;
                        if (d.endDate && now > new Date(d.endDate)) return false;
                        if (d.usageLimit !== null && d.usageLimit !== undefined && d.usageLimit !== '' && Number(d.usedCount || 0) >= Number(d.usageLimit)) return false;
                        if (selectedCustomer?._id && Array.isArray(d.usedBy) && d.usedBy.some(id => String(id?._id || id) === String(selectedCustomer._id))) return false;
                        return true;
                      })
                      .map(d => (
                        <option key={d._id} value={d.promoCode}>
                          🏷️ {d.promoCode} ({d.discountType === 'Percentage' ? `${d.discountValue}% Off` : `₹${d.discountValue} Off`})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="summary-row discount-row">
                <span>Discount (₹)</span>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => {
                      setSelectedPromoCode('');
                      setDiscount(Number(e.target.value) || 0);
                    }}
                    className="discount-input"
                  />
                  <span className="print-only" style={{ display: 'none' }}>₹{discount}</span>
                </div>
              </div>

              <div className="payment-method-row">
                <span>Payment Method</span>
                <div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="payment-select"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                  </select>
                  <span className="print-only" style={{ display: 'none' }}>{paymentMethod}</span>
                </div>
              </div>

              <div className="summary-row grand-total">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              className="btn-generate-bill"
              onClick={handleGenerateBill}
              disabled={isSubmitting || billItems.length === 0 || !selectedCustomer || !selectedStaffId}
            >
              {isSubmitting ? 'Processing...' : 'Generate Bill'}
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Printable Thermal Receipt Layout */}
      <div className="printable-receipt-container">
        <div className="receipt-top-bar">
          <span>{new Date().toLocaleString()}</span>
        </div>
        <div className="receipt-header">
          <h2>{`${(lastBill?.salonName || currentSalonName || 'Salon').toUpperCase()} TAX RECEIPT`}</h2>
          <p>Official Billing & Services Invoice</p>
          <p className="receipt-date">Date: {lastBill?.date || new Date().toLocaleString()}</p>
        </div>

        <div className="receipt-info-grid">
          <div><strong>Invoice No:</strong> {lastBill?.invoiceNo || 'INV-DRAFT'}</div>
          <div><strong>Customer Name:</strong> <span style={{ textTransform: 'capitalize' }}>{lastBill?.customer?.name || selectedCustomer?.name || 'Walk-in Customer'}</span></div>
          <div><strong>Phone:</strong> {lastBill?.customer?.phone || selectedCustomer?.phone || 'N/A'}</div>
          <div><strong>Served By:</strong> <span style={{ textTransform: 'capitalize' }}>{lastBill?.staff?.name || selectedStaff?.name || 'Assigned Staff'}</span></div>
          {(lastBill?.timeSlot || appointmentTimeSlot) && (
            <div><strong>Time Slot:</strong> {lastBill?.timeSlot || appointmentTimeSlot}</div>
          )}
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {((lastBill ? lastBill.items : billItems).length > 0
              ? (lastBill ? lastBill.items : billItems)
              : [{ name: 'N/A', quantity: 1, price: 0 }]
            ).map((item, idx) => (
              <tr key={idx}>
                <td style={{ textTransform: 'capitalize' }}>{item.name}</td>
                <td>{item.quantity}</td>
                <td>₹{item.price}</td>
                <td>₹{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <div className="row"><span>Subtotal:</span><span>₹{(lastBill ? lastBill.subtotal : subtotal).toFixed(2)}</span></div>
          <div className="row"><span>GST (18%):</span><span>₹{Number(lastBill ? lastBill.tax : tax).toFixed(2)}</span></div>
          <div className="row"><span>Discount:</span><span>-₹{Number(lastBill ? lastBill.discount : discount).toFixed(2)}</span></div>
          <div className="row"><span>Payment Method:</span><span>{lastBill ? lastBill.paymentMethod : paymentMethod}</span></div>
          <div className="row grand"><span>Grand Total:</span><span>₹{(lastBill ? lastBill.grandTotal : grandTotal).toFixed(2)}</span></div>
        </div>

        <div className="receipt-footer">
          <p>Thank you for visiting {lastBill?.salonName || currentSalonName || 'our Salon'}!</p>
          <p>Have a wonderful day ahead.</p>
        </div>

        <div className="receipt-bottom-bar">
          <span>{window.location.host + window.location.pathname}</span>
          <span>1/1</span>
        </div>
      </div>
      {/* All Billing & Payments History Modal */}
      {showHistoryModal && (
        <div
          className="history-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="history-modal-content"
            style={{
              background: '#181825',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1050px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#12121c'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'rgba(192, 132, 252, 0.15)',
                    color: '#c084fc'
                  }}
                >
                  <FileText size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: 600 }}>
                    Billing & Payments History
                  </h2>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Showing all past bills and payment transactions ({filteredHistory.length} total)
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#a1a1aa',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div style={{ padding: '16px 24px', background: '#181825', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search history by Customer, Staff, Phone, Invoice No, or Payment Method..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    background: '#0f0f17',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* History Table Body */}
            <div style={{ padding: '0 24px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  Loading billing history...
                </div>
              ) : filteredHistory.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                  No billing history found matching your search.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Date & Time</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Invoice #</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Customer</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Served By</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Service</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Total Amount</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>Method</th>
                      <th style={{ padding: '10px 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((b) => (
                      <tr key={b._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '13px', color: '#e2e8f0' }}>
                        <td style={{ padding: '12px 8px', whiteSpace: 'nowrap', color: '#a1a1aa' }}>
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 500, color: '#c084fc' }}>
                          {b.invoiceNumber || b._id?.substring(0, 8) || 'INV'}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 500, color: '#fff' }}>{b.customerDetails?.name || 'Walk-in Customer'}</div>
                          {b.customerDetails?.phone && <div style={{ fontSize: '11px', color: '#71717a' }}>{b.customerDetails.phone}</div>}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#cbd5e1' }}>
                          {b.staffDetails?.name || 'Staff'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#94a3b8', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                          {(b.services || []).map(s => s.serviceName || s.serviceId?.serviceName || 'Service').join(', ') || 'Service'}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 600, color: '#10b981' }}>
                          ₹{b.totalAmount || b.paidAmount || 0}
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1'
                            }}
                          >
                            {b.paymentMethod || 'Cash'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handlePrintHistoryBill(b)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                background: 'rgba(192, 132, 252, 0.15)',
                                border: '1px solid rgba(192, 132, 252, 0.3)',
                                color: '#c084fc',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              title="Print Receipt"
                            >
                              <Printer size={14} /> Receipt
                            </button>
                            <button
                              onClick={() => handleSendWhatsAppBill(b._id, b.customerDetails?.phone)}
                              disabled={sendingWhatsAppId === b._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                background: '#25D366',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500,
                                opacity: sendingWhatsAppId === b._id ? 0.7 : 1
                              }}
                              title="Send WhatsApp Bill via Meta Cloud API"
                            >
                              <WhatsAppIcon /> 
                              {/* {sendingWhatsAppId === b._id ? 'Sending...' : 'WhatsApp'} */}
                            </button>
                            <button
                              onClick={() => openWhatsAppWeb(b.customerDetails?.phone, b)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                background: 'rgba(37, 211, 102, 0.15)',
                                border: '1px solid rgba(37, 211, 102, 0.4)',
                                color: '#4ade80',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              title="Open Direct Chat on WhatsApp Web"
                            >
                              Web WA
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Billing;
