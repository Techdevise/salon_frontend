import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCircle, Plus, Search, Edit2, Trash2, Mail, Phone, Calendar, X } from 'lucide-react';
import '../styles/DashboardPages.css';

function Staff() {
  const [staffList, setStaffList] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Staff',
    services: []
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchServices();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/staff/all', { withCredentials: true });
      setStaffList(res.data.data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
        const res = await axios.get('/api/service/all', { withCredentials: true });
        setAvailableServices(res.data.data || []);
    } catch (error) {
        console.error("Failed to load services for staff selection");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleServiceToggle = (serviceId) => {
      setFormData(prev => {
          const isSelected = prev.services.includes(serviceId);
          if (isSelected) {
              return { ...prev, services: prev.services.filter(id => id !== serviceId) };
          } else {
              return { ...prev, services: [...prev.services, serviceId] };
          }
      });
  };

  const openModal = (staff = null) => {
    setErrorMsg('');
    if (staff) {
      setEditingStaff(staff);
      setFormData({
        name: staff.name,
        email: staff.email || '',
        phone: staff.phone || '',
        password: '', // Kept empty for edit
        role: staff.role || 'Staff',
        services: staff.services?.map(s => s._id) || []
      });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', email: '', phone: '', password: '', role: 'Staff', services: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    try {
      if (editingStaff) {
        // Validation: If editing, password is not mandatory 
        const payload = { ...formData };
        if(!payload.password) delete payload.password;

        await axios.put(`/api/staff/update/${editingStaff._id}`, payload, { withCredentials: true });
      } else {
        await axios.post('/api/staff/add', formData, { withCredentials: true });
      }
      fetchStaff();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to save staff member');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this staff member?")) {
      try {
        await axios.delete(`/api/staff/delete/${id}`, { withCredentials: true });
        fetchStaff();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/staff/toggle/${id}`, {}, { withCredentials: true });
      fetchStaff();
    } catch (error) {
        alert(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">Manage salon employees, attendance, and performance</p>
        </div>
        <button className="primary-btn" onClick={() => openModal()}>
          <Plus size={18} /> Add Staff
        </button>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search staff by name or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading staff members...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length > 0 ? (
                filteredStaff.map((staff) => (
                  <tr key={staff._id}>
                    <td>
                      <div className="user-cell">
                        <img 
                            src={staff.profileImage || `https://ui-avatars.com/api/?name=${staff.name}&background=10b981&color=fff`} 
                            alt={staff.name} 
                            className="table-avatar"
                        />
                        <div className="user-details">
                          <span className="user-name">{staff.name}</span>
                          <span className="user-joined"><Calendar size={12}/> Joined {new Date(staff.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="role-badge">{staff.role || 'Staff'}</span></td>
                    <td>
                      <div className="contact-cell">
                        <span><Phone size={14}/> {staff.phone}</span>
                        {staff.email && <span><Mail size={14}/> {staff.email}</span>}
                      </div>
                    </td>
                    <td>
                      <button 
                         className={`status-badge border-0 cursor-pointer ${staff.isActive ? 'active' : 'inactive'}`}
                         onClick={() => handleToggleStatus(staff._id)}
                         title="Click to toggle status"
                      >
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => openModal(staff)}><Edit2 size={16}/></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(staff._id)}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-state">No staff found</td>
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
              <h2>{editingStaff ? 'Edit Staff Member' : 'Add New Staff'}</h2>
              <button className="close-btn" onClick={closeModal}><X size={20}/></button>
            </div>
            
            {errorMsg && <div className="error-banner" style={{margin: '0 1.5rem 1rem'}}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. Jane Doe" />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" name="phone" required value={formData.phone} onChange={handleInputChange} placeholder="10-digit number" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="jane@example.com" />
                </div>
              </div>

              <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={formData.role} onChange={handleInputChange}>
                      <option value="Staff">Staff</option>
                      <option value="Receptionist">Receptionist</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Password {editingStaff && "(Leave blank to keep current)"}</label>
                    <input type="password" name="password" required={!editingStaff} value={formData.password} onChange={handleInputChange} placeholder="Assign a login password" />
                  </div>
              </div>

              {availableServices.length > 0 && (
                  <div className="form-group">
                    <label>Services Performed</label>
                    <div className="checkbox-grid">
                        {availableServices.map(service => (
                            <label key={service._id} className="checkbox-label">
                                <input 
                                    type="checkbox" 
                                    checked={formData.services.includes(service._id)}
                                    onChange={() => handleServiceToggle(service._id)}
                                />
                                {service.serviceName}
                            </label>
                        ))}
                    </div>
                  </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Staff;
