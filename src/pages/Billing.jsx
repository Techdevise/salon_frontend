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
  const [staffList, setStaffList] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');

  const [billItems, setBillItems] = useState([]);
  const [selectedService, setSelectedService] = useState('');

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchCustomers();
    fetchServices();
    fetchStaff();
  }, [selectedSalonId]);

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
      const res = await axios.get('/api/service/all', { withCredentials: true });
      if (res.data?.data) {
        setServices(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load services", err);
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

  const handleAddService = () => {
    if (!selectedService) return;

    const serviceObj = services.find(s => s._id === selectedService);
    if (!serviceObj) return;

    // Check if already in bill
    const existing = billItems.find(item => item.serviceId === serviceObj._id);
    if (existing) {
      setBillItems(billItems.map(item =>
        item.serviceId === serviceObj._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setBillItems([...billItems, {
        serviceId: serviceObj._id,
        name: serviceObj.serviceName,
        price: serviceObj.price,
        quantity: 1,
      }]);
    }

    setSelectedService('');
  };

  const handleRemoveItem = (id) => {
    setBillItems(billItems.filter(item => item.serviceId !== id));
  };

  const handleQuantityChange = (id, newQty) => {
    if (newQty < 1) return;
    setBillItems(billItems.map(item =>
      item.serviceId === id ? { ...item, quantity: newQty } : item
    ));
  };

  const subtotal = billItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.18; // 18% GST example
  const grandTotal = Math.max(0, subtotal + tax - discount);

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
      setMessage({ text: 'Please add at least one service', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = {
        customerId: selectedCustomer._id,
        staffId: selectedStaffId,
        services: billItems.map(i => ({
          serviceId: i.serviceId,
          price: i.price * i.quantity,
          quantity: i.quantity
        })),
        tax: 18,
        discountAmount: Number(discount),
        paidAmount: grandTotal,
        paymentMethod
      };

      const res = await axios.post('/api/billing/generate', payload, { withCredentials: true });

      setMessage({ text: 'Bill generated successfully!', type: 'success' });

      // Reset form
      setBillItems([]);
      setSelectedCustomer(null);
      setSearchCustomer('');
      setDiscount(0);
      setPaymentMethod('Cash');

      // Re-trigger auto-selection of logged in user
      if (user) {
        const matchedStaff = staffList.find(
          s => s.email?.toLowerCase() === user.email?.toLowerCase() || s.name?.toLowerCase() === user.name?.toLowerCase()
        );
        if (matchedStaff) {
          setSelectedStaffId(matchedStaff._id);
        } else {
          setSelectedStaffId('');
        }
      } else {
        setSelectedStaffId('');
      }

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

  const selectedStaff = staffList.find(s => s._id === selectedStaffId);

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h1>Billing & Payment</h1>
        <button
          className="btn-secondary"
          disabled={!message.text || message.type === 'error'}
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

          {/* Service Selection */}
          <div className="billing-card">
            <h3>2. Add Services</h3>
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
                onClick={handleAddService}
                disabled={!selectedService}
              >
                <Plus size={18} /> Add
              </button>
            </div>
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
                      <tr key={item.serviceId}>
                        <td>{item.name}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.serviceId, parseInt(e.target.value) || 1)}
                            className="qty-input"
                          />
                          <span className="print-only" style={{ display: 'none' }}>{item.quantity}</span>
                        </td>
                        <td>₹{item.price}</td>
                        <td>₹{item.price * item.quantity}</td>
                        <td>
                          <button className="btn-icon danger" onClick={() => handleRemoveItem(item.serviceId)}>
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
              <div className="summary-row discount-row">
                <span>Discount (₹)</span>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
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
    </div>
  );
}

export default Billing;
