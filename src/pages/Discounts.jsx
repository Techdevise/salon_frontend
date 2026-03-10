import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import '../styles/DashboardPages.css';
import '../styles/Discounts.css';

function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    promoCode: '',
    description: '',
    discountType: 'Percentage',
    discountValue: '',
    minOrderValue: '',
    maxDiscountAmount: '',
    validFrom: '',
    validUntil: '',
    usageLimit: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const res = await axios.get('/api/discount', { withCredentials: true });
      if (res.data?.data) {
        setDiscounts(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching discounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (discount = null) => {
    setErrorMsg('');
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        title: discount.title || discount.promoCode,
        promoCode: discount.promoCode,
        description: discount.description || '',
        discountType: discount.discountType || 'Percentage',
        discountValue: discount.discountValue,
        minOrderAmount: discount.minOrderAmount || '',
        maxDiscountAmount: discount.maxDiscountAmount || '',
        startDate: discount.startDate ? new Date(discount.startDate).toISOString().split('T')[0] : '',
        endDate: discount.endDate ? new Date(discount.endDate).toISOString().split('T')[0] : '',
        usageLimit: discount.usageLimit || ''
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        title: '', promoCode: '', description: '', discountType: 'Percentage', discountValue: '',
        minOrderAmount: '', maxDiscountAmount: '', startDate: '', endDate: '', usageLimit: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg('');

    try {
      const payload = { ...formData };
      
      // Auto-fill title if missing
      if (!payload.title) payload.title = `${payload.discountValue}${payload.discountType === 'Percentage' ? '%' : ' Rs'} off`;
      
      // Clean up empty strings to undefined/null for backend numbers
      if (!payload.minOrderAmount) delete payload.minOrderAmount;
      if (!payload.maxDiscountAmount) delete payload.maxDiscountAmount;
      if (!payload.usageLimit) delete payload.usageLimit;

      if (editingDiscount) {
        await axios.put(`/api/discount/update/${editingDiscount._id}`, payload, { withCredentials: true });
      } else {
        await axios.post('/api/discount/create', payload, { withCredentials: true });
      }
      fetchDiscounts();
      closeModal();
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to save discount code');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this promo code?")) {
      try {
        await axios.delete(`/api/discount/delete/${id}`, { withCredentials: true });
        fetchDiscounts();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to delete');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/discount/toggle/${id}`, {}, { withCredentials: true });
      fetchDiscounts();
    } catch (error) {
        alert(error.response?.data?.message || 'Failed to toggle status');
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.promoCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Discounts & Offers</h1>
          <p className="page-subtitle">Manage promotional codes and discounts for your customers</p>
        </div>
        <button className="primary-btn" onClick={() => openModal()}>
          <Plus size={18} /> Add Promo Code
        </button>
      </div>

      <div className="table-controls">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search promo codes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading discounts...</div>
        ) : (
          <table className="data-table discounts-table">
            <thead>
              <tr>
                <th>Promo Code</th>
                <th>Type / Value</th>
                <th>Validity</th>
                <th>Usage Rules</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiscounts.length > 0 ? (
                filteredDiscounts.map((discount) => (
                  <tr key={discount._id}>
                    <td>
                      <div className="promo-cell">
                        <Tag size={16} className="promo-icon" />
                        <span className="promo-code-text">{discount.promoCode}</span>
                      </div>
                    </td>
                    <td>
                      <div className="discount-value">
                        {discount.discountType === 'Percentage' ? `${discount.discountValue}% Off` : `₹${discount.discountValue} Off`}
                      </div>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span className="date-block">From: {new Date(discount.startDate).toLocaleDateString()}</span>
                        <span className="date-block">To: {new Date(discount.endDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="rules-cell">
                        {discount.minOrderAmount && <span className="rule-badge">Min ₹{discount.minOrderAmount}</span>}
                        <span className="rule-badge neutral">
                          Used: {discount.usedCount || 0} {discount.usageLimit ? `/ ${discount.usageLimit}` : '(No limit)'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button 
                         className={`status-badge border-0 cursor-pointer ${discount.isActive ? 'active' : 'inactive'}`}
                         onClick={() => handleToggleStatus(discount._id)}
                         title="Click to toggle status"
                      >
                        {discount.isActive ? 'Active' : 'Expired'}
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="icon-btn edit" onClick={() => openModal(discount)}><Edit2 size={16}/></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(discount._id)}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-state">No active discount codes found</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal / Create Update Form */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h2>{editingDiscount ? 'Edit Promo Code' : 'Create Promo Code'}</h2>
              <button className="close-btn" onClick={closeModal}><X size={20}/></button>
            </div>
            
            {errorMsg && <div className="error-banner" style={{margin: '0 1.5rem 1rem'}}>{errorMsg}</div>}
            
            <form onSubmit={handleSubmit} className="modal-form">
              
              <div className="form-row">
                <div className="form-group">
                  <label>Promo Code (e.g. SUMMER20) *</label>
                  <input type="text" name="promoCode" required value={formData.promoCode} onChange={handleInputChange} style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" name="description" value={formData.description} onChange={handleInputChange} placeholder="e.g. 20% off all haircuts" />
                </div>
              </div>

              <div className="form-row">
                  <div className="form-group">
                    <label>Discount Type *</label>
                    <select name="discountType" value={formData.discountType} onChange={handleInputChange}>
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Discount Value *</label>
                    <input type="number" name="discountValue" required min="1" value={formData.discountValue} onChange={handleInputChange} />
                  </div>
              </div>

              <div className="form-row">
                  <div className="form-group">
                    <label>Valid From *</label>
                    <input type="date" name="startDate" required value={formData.startDate} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Valid Until *</label>
                    <input type="date" name="endDate" required value={formData.endDate} onChange={handleInputChange} />
                  </div>
              </div>

              <h4 className="section-divider">Usage Limits Optional</h4>

              <div className="form-row">
                  <div className="form-group">
                    <label>Min Order Value (₹)</label>
                    <input type="number" name="minOrderAmount" min="0" value={formData.minOrderAmount} onChange={handleInputChange} placeholder="e.g. 1000" />
                  </div>
                  {formData.discountType === 'Percentage' && (
                    <div className="form-group">
                      <label>Max Discount Amount (₹)</label>
                      <input type="number" name="maxDiscountAmount" min="0" value={formData.maxDiscountAmount} onChange={handleInputChange} placeholder="e.g. 500" />
                    </div>
                  )}
              </div>

              <div className="form-group">
                <label>Total Usage Limit (Overall)</label>
                <input type="number" name="usageLimit" min="1" value={formData.usageLimit} onChange={handleInputChange} placeholder="e.g. 100 uses only" />
              </div>

              <div className="modal-actions mt-20">
                <button type="button" className="btn-cancel" onClick={closeModal}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save Promo Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Discounts;
