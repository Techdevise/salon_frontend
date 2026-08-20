import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Scissors, Plus, Search, Edit2, Trash2, Clock, IndianRupee, X } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useConfirm } from '../components/ConfirmModal';

function Services() {
  const confirm = useConfirm();
  const { selectedSalonId, selectedSalonInfo } = useSelector((state) => state.salon);

  const DEFAULT_CATEGORIES = ['Hair', 'Hair Treatment', 'Skin', 'Nails', 'Spa', 'Makeup', 'Other'];
  const [salonCategories, setSalonCategories] = useState(DEFAULT_CATEGORIES);

  // Synchronize categories dynamically whenever selected salon or salon info changes
  useEffect(() => {
    let cats = DEFAULT_CATEGORIES;
    if (selectedSalonInfo?.category && selectedSalonInfo.category.length > 0) {
      cats = selectedSalonInfo.category;
    } else if (selectedSalonId) {
      const fetchSalonCategories = async () => {
        try {
          const res = await axios.get(`/api/salon/${selectedSalonId}`, { withCredentials: true });
          const fetched = res.data?.data?.category;
          if (fetched && fetched.length > 0) {
            setSalonCategories(fetched.filter(c => c && String(c).trim() !== ''));
          } else {
            setSalonCategories(DEFAULT_CATEGORIES);
          }
        } catch {
          setSalonCategories(DEFAULT_CATEGORIES);
        }
      };
      fetchSalonCategories();
      return;
    }
    setSalonCategories(cats.filter(c => c && String(c).trim() !== ''));
  }, [selectedSalonId, selectedSalonInfo]);

  const validCategories = useMemo(() => {
    const list = salonCategories.filter(c => c && String(c).trim() !== '');
    return list.length > 0 ? list : DEFAULT_CATEGORIES;
  }, [salonCategories]);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [fetchError, setFetchError] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    serviceName: '',
    description: '',
    price: '',
    duration: '',
    category: 'Hair'
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchServices();
  }, [selectedSalonId]);

  const fetchServices = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axios.get(`/api/service/all${salonParam}`, { withCredentials: true });
      setServices(res.data.data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      if (error.response?.status === 403) {
        setFetchError(error.response?.data?.message || 'Subscription validation failed.');
      }
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'serviceName') {
      value = value.replace(/[0-9]/g, '');
    }
    setFormData({ ...formData, [name]: value });
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

    if (/\d/.test(formData.serviceName)) {
      setErrorMsg('Service Name cannot contain numbers.');
      setFormLoading(false);
      return;
    }

    try {
      if (editingService) {
        // Update
        await axios.put(`/api/service/update/${editingService._id}`, formData, { withCredentials: true });
      } else {
        // Create
        const payload = {
          ...formData,
          ...(selectedSalonId && { salonId: selectedSalonId })
        };
        await axios.post('/api/service/create', payload, { withCredentials: true });
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
    const service = services.find(s => s._id === id);
    const serviceName = service?.serviceName || 'this service';
    const confirmed = await confirm({
      title: 'Delete Service',
      message: `Are you sure you want to delete the service "${serviceName}"? This action is permanent.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (confirmed) {
      try {
        await axios.delete(`/api/service/delete/${id}`, { withCredentials: true });
        fetchServices();
      } catch (error) {
        console.error('Failed to delete service:', error);
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

  const filteredServices = services.filter(s => {
    const matchesSearch = !searchTerm ||
      s.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategoryFilter === 'All' ||
      (s.category && s.category.toLowerCase() === selectedCategoryFilter.toLowerCase());

    return matchesSearch && matchesCategory;
  });

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

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 mb-6 text-sm flex items-center justify-between">
          <span>{fetchError}</span>
          <a href="/dashboard/subscription" className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg no-underline text-xs transition-colors">
            Subscribe Now
          </a>
        </div>
      )}

      <div className="table-controls" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '0.75rem',
            background: 'var(--bg-card, #1e1e2d)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            color: 'var(--text-primary, #fff)',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
        >
          <option value="All">All Categories</option>
          {validCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
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
                        <div className="service-icon-box"><Scissors size={16} /></div>
                        <div className="service-details">
                          <span className="service-name">{service.serviceName}</span>
                          <span className="service-desc">{service.description?.substring(0, 30)}{service.description?.length > 30 ? '...' : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="category-badge">{service.category || 'General'}</span></td>
                    <td>
                      <div className="duration-cell">
                        <Clock size={14} /> {service.duration} mins
                      </div>
                    </td>
                    <td>
                      <div className="price-cell">
                        <IndianRupee size={14} /> {service.price}
                      </div>
                    </td>
                    <td>
                      <button
                        className={`status-badge border-0 cursor-pointer ${service.isActive !== false ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(service._id)}
                        title="Click to toggle status"
                      >
                        {service.isActive !== false ? 'Available' : 'Unavailable'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => openModal(service)}><Edit2 size={16} /></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(service._id)}><Trash2 size={16} /></button>
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
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {errorMsg && <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>{errorMsg}</div>}

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
                <select name="category" value={formData.category || validCategories[0] || 'Hair'} onChange={handleInputChange}>
                  {validCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
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
