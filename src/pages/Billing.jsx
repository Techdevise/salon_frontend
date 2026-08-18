import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, IndianRupee, Printer } from 'lucide-react';
import '../styles/Billing.css';
import { useSelector } from 'react-redux';

function Billing() {
  const { selectedSalonId } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);

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

  useEffect(() => {
    fetchCustomers();
    fetchServices();
    fetchPackages();
    fetchStaff();
    fetchDiscounts();
  }, [selectedSalonId]);

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
  const tax = subtotal * 0.18; // 18% GST example
  const grandTotal = Math.max(0, subtotal + tax - discount);

  const handlePromoCodeChange = (code) => {
    setSelectedPromoCode(code);
    if (!code) {
      setDiscount(0);
      return;
    }
    const foundDisc = discounts.find(d => d.promoCode === code);
    if (foundDisc) {
      if (foundDisc.minOrderAmount && subtotal < foundDisc.minOrderAmount) {
        setMessage({ text: `Minimum bill amount ₹${foundDisc.minOrderAmount} required for ${foundDisc.promoCode}`, type: 'error' });
        setDiscount(0);
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

  // Re-evaluate discount if subtotal changes and promo code is selected
  useEffect(() => {
    if (selectedPromoCode) {
      handlePromoCodeChange(selectedPromoCode);
    }
  }, [subtotal]);

  const selectedStaff = staffList.find(s => s._id === selectedStaffId);

  const handleGenerateBill = async () => {
    if (!selectedCustomer) {
      setMessage({ text: 'Please select a customer', type: 'error' });
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

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const packageItem = billItems.find(i => i.type === 'package');
      const selectedPkgId = packageItem ? packageItem.packageId : null;

      const payload = {
        customerId: selectedCustomer._id,
        staffId: selectedStaffId,
        services: billItems.map(i => ({
          serviceId: i.serviceId || null,
          serviceName: i.name,
          price: i.price * i.quantity,
          quantity: i.quantity
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
        invoiceNo: res.data?.data?.invoiceNumber || res.data?.data?._id?.substring(0, 8) || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
        date: new Date().toLocaleString(),
        customer: { ...selectedCustomer },
        staff: selectedStaff ? { ...selectedStaff } : { name: 'Staff Member' },
        items: [...billItems],
        subtotal,
        tax,
        discount: Number(discount),
        grandTotal,
        paymentMethod
      };

      setLastBill(generatedBillObj);
      setMessage({ text: 'Bill generated successfully!', type: 'success' });

      // Reset form fields
      setBillItems([]);
      setSelectedCustomer(null);
      setSearchCustomer('');
      setDiscount(0);
      setSelectedPromoCode('');
      setPaymentMethod('Cash');

      // Auto trigger print dialog after small delay so DOM updates
      setTimeout(() => {
        window.print();
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
      <div className="billing-header">
        <h1>Billing & Payment</h1>
        <button
          className="btn-secondary"
          disabled={!lastBill && billItems.length === 0}
          onClick={() => window.print()}
        >
          <Printer size={18} /> Print Last Bill
        </button>
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
                    {discounts.map(d => (
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
        <div className="receipt-header">
          <h2>SALON MANAGEMENT TAX RECEIPT</h2>
          <p>Official Billing & Services Invoice</p>
          <p className="receipt-date">Date: {lastBill?.date || new Date().toLocaleString()}</p>
        </div>

        <div className="receipt-info-grid">
          <div><strong>Invoice No:</strong> {lastBill?.invoiceNo || 'INV-DRAFT'}</div>
          <div><strong>Customer:</strong> {lastBill?.customer?.name || selectedCustomer?.name || 'Walk-in Customer'}</div>
          <div><strong>Phone:</strong> {lastBill?.customer?.phone || selectedCustomer?.phone || 'N/A'}</div>
          <div><strong>Served By:</strong> {lastBill?.staff?.name || selectedStaff?.name || 'Assigned Staff'}</div>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Service / Item</th>
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
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>₹{item.price}</td>
                <td>₹{item.price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <div className="row"><span>Subtotal:</span><span>₹{(lastBill ? lastBill.subtotal : subtotal).toFixed(2)}</span></div>
          <div className="row"><span>GST (18%):</span><span>₹{(lastBill ? lastBill.tax : tax).toFixed(2)}</span></div>
          <div className="row"><span>Discount:</span><span>-₹{lastBill ? lastBill.discount : discount}</span></div>
          <div className="row"><span>Payment Method:</span><span>{lastBill ? lastBill.paymentMethod : paymentMethod}</span></div>
          <div className="row grand"><span>Grand Total:</span><span>₹{(lastBill ? lastBill.grandTotal : grandTotal).toFixed(2)}</span></div>
        </div>

        <div className="receipt-footer">
          <p>Thank you for visiting our Salon!</p>
          <p>Have a wonderful day ahead.</p>
        </div>
      </div>
    </div>
  );
}

export default Billing;
