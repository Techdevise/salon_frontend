import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Edit2, Trash2, Phone, Mail, X } from 'lucide-react';
import '../styles/DashboardPages.css';

function Customers() {
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

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get('/api/customer', { withCredentials: true });
      setCustomers(res.data.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    setFormLoading(true);
    setErrorMsg('');

    try {
      if (editingCustomer) {
        await axios.put(`/api/customer/${editingCustomer._id}`, formData, { withCredentials: true });
      } else {
        await axios.post('/api/customer/create', formData, { withCredentials: true });
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
    if (window.confirm("Are you sure you want to delete this customer record?")) {
      try {
        await axios.delete(`/api/customer/${id}`, { withCredentials: true });
        fetchCustomers();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete');
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
                        <span><Phone size={14}/> {customer.phone}</span>
                        {customer.email && <span><Mail size={14}/> {customer.email}</span>}
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
                        <button className="icon-btn edit" onClick={() => openModal(customer)}><Edit2 size={16}/></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(customer._id)}><Trash2 size={16}/></button>
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
              <button className="close-btn" onClick={closeModal}><X size={20}/></button>
            </div>
            
            {errorMsg && <div className="error-banner" style={{margin: '0 1.5rem 1rem'}}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. John Doe" />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="10-digit number" />
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
                    <input type="date" name="dob" className="date-picker-input" value={formData.dob} onChange={handleInputChange} />
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
