import { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Plus, Search, Edit2, Trash2, Clock, IndianRupee, X } from 'lucide-react';
import '../styles/DashboardPages.css';

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    price: '',
    duration: '',
    category: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await axios.get('/api/service/all', { withCredentials: true });
      setServices(res.data.data);
    } catch (error) {
      console.error("Error fetching services:", error);
      if(error.response?.status !== 404) {
         // Only log if it's not a expected 404 (no services)
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (service = null) => {
    setErrorMsg('');
    if (service) {
      setEditingService(service);
      setFormData({
        serviceName: service.serviceName,
        description: service.description || '',
        price: service.price,
        duration: service.duration,
        category: service.category || ''
      });
    } else {
      setEditingService(null);
      setFormData({ serviceName: '', description: '', price: '', duration: '', category: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    try {
      if (editingService) {
        // Update
        await axios.put(`/api/service/update/${editingService._id}`, formData, { withCredentials: true });
      } else {
        // Create
        await axios.post('/api/service/create', formData, { withCredentials: true });
      }
      fetchServices();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to save service');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this service?")) {
      try {
        await axios.delete(`/api/service/delete/${id}`, { withCredentials: true });
        fetchServices();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/service/toggle/${id}`, {}, { withCredentials: true });
      fetchServices();
    } catch (error) {
        alert(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredServices = services.filter(s => 
    s.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Services & Pricing</h1>
          <p className="page-subtitle">Manage your salon's service catalog and pricing</p>
        </div>
        <button className="primary-btn" onClick={() => openModal()}>
          <Plus size={18} /> Add Service
        </button>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search services or categories..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading services...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Service Name</th>
                <th>Category</th>
                <th>Duration (mins)</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <tr key={service._id}>
                    <td>
                      <div className="service-cell">
                        <div className="service-icon-box"><Scissors size={16}/></div>
                        <div className="service-details">
                            <span className="service-name">{service.serviceName}</span>
                            <span className="service-desc">{service.description?.substring(0, 30)}{service.description?.length > 30 ? '...' : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="category-badge">{service.category || 'General'}</span></td>
                    <td>
                      <div className="duration-cell">
                        <Clock size={14}/> {service.duration} mins
                      </div>
                    </td>
                    <td>
                      <div className="price-cell">
                        <IndianRupee size={14}/> {service.price}
                      </div>
                    </td>
                    <td>
                      <button 
                         className={`status-badge border-0 cursor-pointer ${service.isActive ? 'active' : 'inactive'}`}
                         onClick={() => handleToggleStatus(service._id)}
                         title="Click to toggle status"
                      >
                        {service.isActive ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => openModal(service)}><Edit2 size={16}/></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(service._id)}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No services found</td>
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
              <h2>{editingService ? 'Edit Service' : 'Add New Service'}</h2>
              <button className="close-btn" onClick={closeModal}><X size={20}/></button>
            </div>
            
            {errorMsg && <div className="error-banner" style={{margin: '0 1.5rem 1rem'}}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Service Name *</label>
                <input type="text" name="serviceName" required value={formData.serviceName} onChange={handleInputChange} placeholder="e.g. Haircut & Wash" />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹) *</label>
                  <input type="number" name="price" required min="0" value={formData.price} onChange={handleInputChange} placeholder="e.g. 500" />
                </div>
                <div className="form-group">
                  <label>Duration (mins) *</label>
                  <input type="number" name="duration" required min="1" value={formData.duration} onChange={handleInputChange} placeholder="e.g. 45" />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange}>
                  <option value="">Select Category...</option>
                  <option value="Hair">Hair</option>
                  <option value="Skin">Skin</option>
                  <option value="Nails">Nails</option>
                  <option value="Massage">Massage</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} placeholder="Brief description of the service"></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Services;
