import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Tag, Plus, Search, Edit2, Trash2, IndianRupee, Layers, X, Scissors } from 'lucide-react';
import '../styles/DashboardPages.css';
import { useConfirm } from '../components/ConfirmModal';

function ServicePackages() {
  const confirm = useConfirm();
  const { selectedSalonId } = useSelector((state) => state.salon);
  const [packagesList, setPackagesList] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState('');

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
  const [removedServices, setRemovedServices] = useState([]);
  const [addServiceTab, setAddServiceTab] = useState('dropdown'); // 'dropdown' | 'manual'
  const [manualService, setManualService] = useState({ name: '', price: '' });
  // Manually added services (not from DB) stored locally for display in chips
  const [manualServicesList, setManualServicesList] = useState([]);

  useEffect(() => {
    fetchData();
  }, [selectedSalonId]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      // Parallel fetch packages & services
      const [pkgsRes, svcsRes] = await Promise.all([
        axios.get(`/api/package${salonParam}`, { withCredentials: true }),
        axios.get(`/api/service/all${salonParam}`, { withCredentials: true })
      ]);

      setPackagesList(pkgsRes.data?.data || []);
      setAvailableServices(svcsRes.data?.data || []);
    } catch (error) {
      console.error("Error fetching packages data:", error);
      if (error.response?.status === 403) {
        setFetchError(error.response?.data?.message || 'Subscription validation failed.');
      }
      setPackagesList([]);
      setAvailableServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (name === 'packageName') {
      value = value.replace(/[0-9]/g, '');
    }
    setFormData({ ...formData, [name]: value });
  };

  const toggleServiceSelection = (serviceId) => {
    if (!serviceId) return;
    const sId = String(serviceId);
    setFormData(prev => {
      const isSelected = prev.selectedServices.some(id => id && String(id) === sId);
      if (isSelected) {
        return { ...prev, selectedServices: prev.selectedServices.filter(id => id && String(id) !== sId) };
      } else {
        return { ...prev, selectedServices: [...prev.selectedServices.filter(Boolean), sId] };
      }
    });
  };

  const removeSelectedService = (e, serviceId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!serviceId) return;
    const sId = String(serviceId);
    // Remove from selected AND hide from available
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.filter(id => id && String(id) !== sId)
    }));
    setRemovedServices(prev => [...prev, sId]);
  };

  const openModal = (pkg = null) => {
    setErrorMsg('');
    if (pkg && pkg._id) {
      setEditingPackage(pkg);
      const extractedServiceIds = pkg.services
        ? pkg.services
            .map(s => (typeof s === 'object' ? (s.serviceId?._id || s.serviceId || s._id) : s))
            .filter(Boolean)
            .map(id => String(id))
        : [];
      setFormData({
        packageName: pkg.packageName || '',
        description: pkg.description || '',
        packagePrice: pkg.packagePrice || '',
        selectedServices: extractedServiceIds
      });
    } else {
      setEditingPackage(null);
      setFormData({
        packageName: '',
        description: '',
        packagePrice: '',
        selectedServices: []
      });
    }
    setRemovedServices([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPackage(null);
    setFormData({ packageName: '', description: '', packagePrice: '', selectedServices: [] });
    setRemovedServices([]);
    setManualServicesList([]);
    setManualService({ name: '', price: '' });
    setAddServiceTab('dropdown');
    setErrorMsg('');
  };

  const handleAddManualService = (e) => {
    e.preventDefault();
    if (!manualService.name.trim()) return;
    const tempId = `manual_${Date.now()}`;
    const newSvc = { _id: tempId, serviceName: manualService.name.trim(), price: Number(manualService.price) || 0, isManual: true };
    setManualServicesList(prev => [...prev, newSvc]);
    setFormData(prev => ({ ...prev, selectedServices: [...prev.selectedServices, tempId] }));
    setManualService({ name: '', price: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (/\d/.test(formData.packageName)) {
      setErrorMsg('Package Name cannot contain numbers.');
      return;
    }


    setFormLoading(true);
    setErrorMsg('');

    // Transform `selectedServices` array of IDs back into the array of objects the backend expects
    const payload = {
      packageName: formData.packageName,
      description: formData.description,
      packagePrice: Number(formData.packagePrice),
      services: formData.selectedServices.map(id => ({ serviceId: id })),
      ...(selectedSalonId && { salonId: selectedSalonId })
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
    const pkg = packagesList.find(p => p._id === id);
    const packageName = pkg?.packageName || 'this package';
    const confirmed = await confirm({
      title: 'Delete Service Package',
      message: `Are you sure you want to delete the package "${packageName}"? This action is permanent.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (confirmed) {
      try {
        await axios.delete(`/api/package/delete/${id}`, { withCredentials: true });
        fetchData();
      } catch (error) {
        console.error('Failed to delete package:', error);
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
    (formData.selectedServices || []).filter(Boolean).forEach(id => {
      const targetId = String(id);
      const d = availableServices.find(s => s._id && String(s._id) === targetId);
      if (d) originalTotal += Number(d.price || 0);
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

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 mb-6 text-sm flex items-center justify-between">
          <span>{fetchError}</span>
          <a href="/dashboard/subscription" className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg no-underline text-xs transition-colors">
            Subscribe Now
          </a>
        </div>
      )}

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
                        <div className="service-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}><Layers size={16} /></div>
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
                      <div className="text-muted" style={{ textDecoration: 'line-through' }}>
                        ₹ {pkg.totalOriginalPrice}
                      </div>
                    </td>
                    <td>
                      <div className="price-cell">
                        <IndianRupee size={14} /> {pkg.packagePrice}
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
                        <button className="icon-btn edit" onClick={() => openModal(pkg)}><Edit2 size={16} /></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(pkg._id)}><Trash2 size={16} /></button>
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
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingPackage ? 'Edit Package' : 'Create New Package'}</h2>
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {errorMsg && <div className="error-banner" style={{ margin: '0 1.5rem 1rem' }}>{errorMsg}</div>}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Package Name *</label>
                <input type="text" name="packageName" required value={formData.packageName} onChange={handleInputChange} placeholder="e.g. Bridal Glow Package" />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                  Selected Included Services ({formData.selectedServices.length}) *
                </label>

                {/* Selected Services Chips */}
                {formData.selectedServices.length > 0 ? (
                  <div className="selected-services-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.25)', marginBottom: '1rem' }}>
                    {formData.selectedServices.map(id => {
                      // resolve from DB services OR manual list
                      const svc = availableServices.find(s => s._id && String(s._id) === String(id))
                             || manualServicesList.find(s => s._id && String(s._id) === String(id));
                      if (!svc) return null;
                      return (
                        <div
                          key={svc._id}
                          className="selected-chip"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: svc.isManual ? '#1a2e1a' : '#1e1b4b', border: `1px solid ${svc.isManual ? '#22c55e' : '#6366f1'}`, color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem' }}
                        >
                          <span><Scissors size={13} style={{ display: 'inline', marginRight: '4px' }} />{svc.serviceName} (₹{svc.price}){svc.isManual && <span style={{ fontSize: '0.7rem', color: '#86efac', marginLeft: '4px' }}>[custom]</span>}</span>
                          <button
                            type="button"
                            title="Remove from package"
                            onClick={(e) => removeSelectedService(e, svc._id)}
                            style={{ background: 'rgba(239, 68, 68, 0.3)', border: '1px solid rgba(239, 68, 68, 0.6)', color: '#f87171', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#9ca3af', fontStyle: 'italic', marginBottom: '1rem' }}>
                    No services selected yet. Add from dropdown or enter manually below.
                  </div>
                )}

                {/* Tabs: Dropdown vs Manual */}
                <div style={{ display: 'flex', gap: '0', marginBottom: '0.6rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <button
                    type="button"
                    onClick={() => setAddServiceTab('dropdown')}
                    style={{ flex: 1, padding: '7px 0', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: addServiceTab === 'dropdown' ? 'rgba(99,102,241,0.25)' : 'transparent', color: addServiceTab === 'dropdown' ? '#a5b4fc' : '#71717a', transition: 'all 0.2s' }}
                  >
                    📋 From Dropdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddServiceTab('manual')}
                    style={{ flex: 1, padding: '7px 0', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: 'none', borderLeft: '1px solid rgba(99,102,241,0.3)', background: addServiceTab === 'manual' ? 'rgba(34,197,94,0.15)' : 'transparent', color: addServiceTab === 'manual' ? '#86efac' : '#71717a', transition: 'all 0.2s' }}
                  >
                    ✏️ Add Manually
                  </button>
                </div>

                {/* Dropdown Tab */}
                {addServiceTab === 'dropdown' && (
                  <div className="services-selection-list">
                    {availableServices.filter(svc =>
                      svc._id &&
                      !formData.selectedServices.some(id => String(id) === String(svc._id)) &&
                      !removedServices.includes(String(svc._id))
                    ).length > 0 ? (
                      availableServices
                        .filter(svc =>
                          svc._id &&
                          !formData.selectedServices.some(id => String(id) === String(svc._id)) &&
                          !removedServices.includes(String(svc._id))
                        )
                        .map(svc => (
                          <div
                            key={svc._id}
                            className="service-picker-card"
                            onClick={() => toggleServiceSelection(svc._id)}
                            style={{ position: 'relative', cursor: 'pointer' }}
                          >
                            <div className="sp-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Scissors size={14} /> <span>{svc.serviceName}</span>
                              </div>
                              <Plus size={14} style={{ color: '#a855f7' }} />
                            </div>
                            <div className="sp-price">₹{svc.price}</div>
                          </div>
                        ))
                    ) : (
                      <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                        {availableServices.length === 0 ? 'No services found in database.' : 'All available services have been added!'}
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Entry Tab */}
                {addServiceTab === 'manual' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', padding: '10px', background: 'rgba(34,197,94,0.06)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: '4px', display: 'block' }}>Service Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Deep Conditioning"
                        value={manualService.name}
                        onChange={e => setManualService(prev => ({ ...prev, name: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', background: '#0f1a0f', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: '#86efac', marginBottom: '4px', display: 'block' }}>Price (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={manualService.price}
                        onChange={e => setManualService(prev => ({ ...prev, price: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)', background: '#0f1a0f', color: '#fff', fontSize: '0.85rem' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddManualService}
                      disabled={!manualService.name.trim()}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: manualService.name.trim() ? '#22c55e' : '#374151', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: manualService.name.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                    >
                      + Add
                    </button>
                  </div>
                )}
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
