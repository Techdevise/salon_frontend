import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, Phone, Mail, X } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useConfirm } from '../components/ConfirmModal';
import { useSelector } from 'react-redux';

function Customers() {
  const confirm = useConfirm();
  const { selectedSalonId } = useSelector((state) => state.salon);
  const { user } = useSelector((state) => state.auth);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Other',
    dob: '',
    address: '',
    notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [subscriptionError, setSubscriptionError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [selectedSalonId]);

  const fetchCustomers = async () => {
    try {
      setSubscriptionError('');
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/customer${salonParam}`, { withCredentials: true });
      setCustomers(res.data.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      if (error.response?.status === 403) {
        setSubscriptionError(error.response.data?.message || 'No active subscription found. Please purchase a subscription plan to access this feature.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      // Restrict phone to digits only, max 10 digits
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'name') {
      // Block numerical characters in Name field
      value = value.replace(/[0-9]/g, '');
    }
    setFormData({ ...formData, [name]: value });
  };

  const openModal = (customer = null) => {
    setErrorMsg('');
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        gender: customer.gender || 'Other',
        dob: customer.dob ? new Date(customer.dob).toISOString().split('T')[0] : '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', gender: 'Other', dob: '', address: '', notes: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Mandatory Field Check
    if (!formData.name.trim() || !formData.phone.trim()) {
      setErrorMsg('Full Name and Phone Number are required mandatory fields.');
      return;
    }

    // Name Validation
    if (/\d/.test(formData.name)) {
      setErrorMsg('Customer Name cannot contain numbers.');
      return;
    }

    // Phone Boundary Validation (Exactly 10 digits)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setErrorMsg('Phone number must be exactly 10 digits.');
      return;
    }

    // DOB Validation (Between 1960 and Today)
    if (formData.dob) {
      const selectedDob = new Date(formData.dob);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const minDate = new Date('1960-01-01T00:00:00');
      
      if (selectedDob > today) {
        setErrorMsg('Date of birth cannot be in the future.');
        return;
      }
      if (selectedDob < minDate) {
        setErrorMsg('Date of birth cannot be earlier than 1960.');
        return;
      }
    }

    setFormLoading(true);

    try {
      if (editingCustomer) {
        await axios.put(`/api/customer/${editingCustomer._id}`, formData, { withCredentials: true });
      } else {
        // Add customer to the selected salon
        const payload = {
          ...formData,
          ...(selectedSalonId && { salonId: selectedSalonId })
        };
        await axios.post('/api/customer/create', payload, { withCredentials: true });
      }
      fetchCustomers();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to save customer');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const customer = customers.find(c => c._id === id);
    const customerName = customer?.name || 'this customer';
    const confirmed = await confirm({
      title: 'Delete Customer Record',
      message: `Are you sure you want to delete the record for "${customerName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (confirmed) {
      try {
        await axios.delete(`/api/customer/${id}`, { withCredentials: true });
        fetchCustomers();
      } catch (error) {
        console.error('Failed to delete customer:', error);
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/customer/${id}/toggle`, {}, { withCredentials: true });
      fetchCustomers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to toggle status');
    }
  };


  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">Manage your salon's client base</p>
        </div>
        <button className="primary-btn" onClick={() => openModal()}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Subscription error banner */}
      {subscriptionError && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '16px',
          color: '#f87171',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>{subscriptionError}</span>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading customers...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Total Visits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{customer.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                        <span>{customer.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span><Phone size={14} /> {customer.phone}</span>
                        {customer.email && <span><Mail size={14} /> {customer.email}</span>}
                      </div>
                    </td>
                    <td>{customer.totalVisits || 0} visits</td>
                    <td>
                      <button
                        className={`status-badge border-0 cursor-pointer ${customer.isActive ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(customer._id)}
                        title="Click to toggle status"
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => openModal(customer)}><Edit2 size={16} /></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(customer._id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state">No customers found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal / Create Update Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {errorMsg && <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. John Doe" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="e.g. 9876543210" maxLength={10} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input 
                    type="date" 
                    name="dob" 
                    className="date-picker-input" 
                    value={formData.dob} 
                    onChange={handleInputChange} 
                    min="1960-01-01"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} placeholder="Customer's address"></textarea>
              </div>

              <div className="form-group">
                <label>Special Notes</label>
                <textarea name="notes" rows="2" value={formData.notes} onChange={handleInputChange} placeholder="Any allergies, preferences, etc."></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Customers;
