import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Plus, Search, Edit2, Trash2, IndianRupee, Layers, X, Scissors } from 'lucide-react';
import '../styles/DashboardPages.css';

function ServicePackages() {
  const [packagesList, setPackagesList] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    packageName: '',
    description: '',
    packagePrice: '',
    selectedServices: [] // Array of service IDs
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetch packages & services
      const [pkgsRes, svcsRes] = await Promise.all([
        axios.get('/api/package', { withCredentials: true }).catch(err => ({ data: { data: [] } })),
        axios.get('/api/service/all', { withCredentials: true }).catch(err => ({ data: { data: [] } }))
      ]);
      
      setPackagesList(pkgsRes.data?.data || []);
      setAvailableServices(svcsRes.data?.data || []);
    } catch (error) {
        console.error("Error fetching packages data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleServiceSelection = (serviceId) => {
    setFormData(prev => {
        const isSelected = prev.selectedServices.includes(serviceId);
        if (isSelected) {
            return { ...prev, selectedServices: prev.selectedServices.filter(id => id !== serviceId) };
        } else {
            return { ...prev, selectedServices: [...prev.selectedServices, serviceId] };
        }
    });
  };

  const openModal = (pkg = null) => {
    setErrorMsg('');
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        packageName: pkg.packageName,
        description: pkg.description || '',
        packagePrice: pkg.packagePrice,
        selectedServices: pkg.services.map(s => s.serviceId) // Extract IDs back to array
      });
    } else {
      setEditingPackage(null);
      setFormData({ packageName: '', description: '', packagePrice: '', selectedServices: [] });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPackage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.selectedServices.length < 2) {
        setErrorMsg('Please select at least 2 services to form a package.');
        return;
    }

    setFormLoading(true);
    setErrorMsg('');

    // Transform `selectedServices` array of IDs back into the array of objects the backend expects
    const payload = {
        packageName: formData.packageName,
        description: formData.description,
        packagePrice: Number(formData.packagePrice),
        services: formData.selectedServices.map(id => ({ serviceId: id }))
    };

    try {
      if (editingPackage) {
        await axios.put(`/api/package/update/${editingPackage._id}`, payload, { withCredentials: true });
      } else {
        await axios.post('/api/package/create', payload, { withCredentials: true });
      }
      fetchData();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to save package');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this package?")) {
      try {
        await axios.delete(`/api/package/delete/${id}`, { withCredentials: true });
        fetchData();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/package/toggle/${id}`, {}, { withCredentials: true });
      fetchData();
    } catch (error) {
        alert(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  // Calculate dynamic savings in the form based on selected services
  const calculateFormSavings = () => {
     let originalTotal = 0;
     formData.selectedServices.forEach(id => {
         const d = availableServices.find(s => s._id === id);
         if(d) originalTotal += Number(d.price || 0);
     });
     return { originalTotal, savings: originalTotal - Number(formData.packagePrice || 0) };
  };

  const filteredPackages = packagesList.filter(p => 
    p.packageName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Packages</h1>
          <p className="page-subtitle">Bundle services together to offer better value to customers</p>
        </div>
        <button className="primary-btn" onClick={() => openModal()}>
          <Plus size={18} /> Create Package
        </button>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search packages..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading packages...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Package Info</th>
                <th>Included Services</th>
                <th>Total Value</th>
                <th>Package Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackages.length > 0 ? (
                filteredPackages.map((pkg) => (
                  <tr key={pkg._id}>
                    <td>
                      <div className="service-cell">
                        <div className="service-icon-box" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6'}}><Layers size={16}/></div>
                        <div className="service-details">
                            <span className="service-name">{pkg.packageName}</span>
                            <span className="service-desc">{pkg.description?.substring(0, 30)}{pkg.description?.length > 30 ? '...' : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="service-tags">
                          {pkg.services.slice(0, 2).map((s, idx) => (
                              <span key={idx} className="small-tag">{s.serviceName}</span>
                          ))}
                          {pkg.services.length > 2 && (
                              <span className="small-tag more">+{pkg.services.length - 2} more</span>
                          )}
                      </div>
                    </td>
                    <td>
                      <div className="text-muted" style={{textDecoration: 'line-through'}}>
                        ₹ {pkg.totalOriginalPrice}
                      </div>
                    </td>
                    <td>
                      <div className="price-cell">
                        <IndianRupee size={14}/> {pkg.packagePrice}
                      </div>
                      <div className="savings-badge">Save ₹{pkg.savings}</div>
                    </td>
                    <td>
                      <button 
                         className={`status-badge border-0 cursor-pointer ${pkg.isActive ? 'active' : 'inactive'}`}
                         onClick={() => handleToggleStatus(pkg._id)}
                         title="Click to toggle status"
                      >
                        {pkg.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => openModal(pkg)}><Edit2 size={16}/></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(pkg._id)}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No packages found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal / Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h2>{editingPackage ? 'Edit Package' : 'Create New Package'}</h2>
              <button className="close-btn" onClick={closeModal}><X size={20}/></button>
            </div>
            
            {errorMsg && <div className="error-banner" style={{margin: '0 1.5rem 1rem'}}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Package Name *</label>
                <input type="text" name="packageName" required value={formData.packageName} onChange={handleInputChange} placeholder="e.g. Bridal Glow Package" />
              </div>

              <div className="form-group">
                <label>Select Included Services (Select minimum 2) *</label>
                <div className="services-selection-list">
                    {availableServices.length > 0 ? (
                        availableServices.map(svc => (
                            <div 
                               key={svc._id} 
                               className={`service-picker-card ${formData.selectedServices.includes(svc._id) ? 'selected' : ''}`}
                               onClick={() => toggleServiceSelection(svc._id)}
                            >
                                <div className="sp-header">
                                    <Scissors size={14} /> <span>{svc.serviceName}</span>
                                </div>
                                <div className="sp-price">₹{svc.price}</div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted">No services found. Add standalone services first.</div>
                    )}
                </div>
              </div>
              
              <div className="form-row">
                 <div className="form-group">
                     <label>Original Total Value</label>
                     <div className="readonly-box">₹ {calculateFormSavings().originalTotal}</div>
                 </div>
                 <div className="form-group">
                     <label>Final Package Price (₹) *</label>
                     <input type="number" name="packagePrice" required min="0" value={formData.packagePrice} onChange={handleInputChange} placeholder="e.g. 1500" />
                 </div>
              </div>

              {Number(formData.packagePrice) > 0 && (
                  <div className={`savings-indicator ${calculateFormSavings().savings >= 0 ? 'positive' : 'negative'}`}>
                      {calculateFormSavings().savings >= 0 
                         ? `Client saves ₹${calculateFormSavings().savings} on this package 🎉`
                         : `Warning: Package price is ₹${Math.abs(calculateFormSavings().savings)} MORE than standalone services!`
                      }
                  </div>
              )}

              <div className="form-group">
                <label>Package Description</label>
                <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} placeholder="What does this package include?"></textarea>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ServicePackages;
