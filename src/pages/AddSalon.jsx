import { useState } from 'react';
import axios from 'axios';
import { X, Store, User, Mail, Phone, MapPin, Clock, Tag, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import '../styles/AddSalon.css';

const CATEGORIES = ['Hair', 'Skin', 'Nails', 'Spa', 'Makeup', 'Other'];
const WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const initialForm = {
  salonName: '',
  ownerName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  pincode: '',
  openingTime: '09:00',
  closingTime: '21:00',
  category: [],
  workingDays: [],
};

function AddSalon({ onClose, onSalonAdded, editingSalon, onSalonUpdated }) {
  const [form, setForm] = useState(() => {
    if (editingSalon) {
      return {
        salonName: editingSalon.salonName || '',
        ownerName: editingSalon.ownerName || '',
        email: editingSalon.email || '',
        phone: editingSalon.phone || '',
        street: editingSalon.address?.street || '',
        city: editingSalon.address?.city || '',
        state: editingSalon.address?.state || '',
        pincode: editingSalon.address?.pincode || '',
        openingTime: editingSalon.openingTime || '09:00',
        closingTime: editingSalon.closingTime || '21:00',
        category: editingSalon.category || [],
        workingDays: editingSalon.workingDays || [],
      };
    }
    return initialForm;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    } else if (name === 'pincode') {
      value = value.replace(/\D/g, '').slice(0, 6);
    } else if (['salonName', 'ownerName', 'city', 'state'].includes(name)) {
      value = value.replace(/[0-9]/g, '');
    }
    setForm(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const toggleCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      category: prev.category.includes(cat)
        ? prev.category.filter(c => c !== cat)
        : [...prev.category, cat]
    }));
  };

  const toggleDay = (day) => {
    setForm(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.salonName.trim() ||
      !form.ownerName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.street.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim()
    ) {
      setError('All mandatory fields (Salon Name, Owner Name, Email, Phone, Street, City, State, Pincode) are required.');
      return;
    }

    if (/\d/.test(form.salonName) || /\d/.test(form.ownerName)) {
      setError('Salon Name and Owner Name cannot contain numbers.');
      return;
    }

    if (form.city && /\d/.test(form.city)) {
      setError('City name cannot contain numbers.');
      return;
    }

    if (form.state && /\d/.test(form.state)) {
      setError('State name cannot contain numbers.');
      return;
    }

    // Phone Boundary Validation (Exactly 10 digits)
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }

    // Pincode Boundary Validation (Min 4, Max 6 digits)
    if (form.pincode.trim()) {
      const cleanPincode = form.pincode.replace(/\D/g, '');
      if (cleanPincode.length < 4 || cleanPincode.length > 6) {
        setError('Pincode / Postal Code must be between 4 and 6 digits.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        salonName: form.salonName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          pincode: form.pincode
        },
        openingTime: form.openingTime,
        closingTime: form.closingTime,
        category: form.category,
        workingDays: form.workingDays
      };

      if (editingSalon) {
        const res = await axios.put(`/api/salon/${editingSalon._id}`, payload, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          setSuccess(true);
          setTimeout(() => {
            if (onSalonUpdated) onSalonUpdated(res.data.data);
            onClose();
          }, 1800);
        }
      } else {
        const res = await axios.post('/api/salon/add', payload, {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          setSuccess(true);
          setTimeout(() => {
            if (onSalonAdded) onSalonAdded(res.data.data);
            onClose();
          }, 1800);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || (editingSalon ? 'An error occurred while updating the salon' : 'An error occurred while adding the salon'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="salon-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="salon-modal">
        {/* Header */}
        <div className="salon-modal-header">
          <div className="salon-modal-title">
            <div className="modal-title-icon"><Store size={22} /></div>
            <div>
              <h2>{editingSalon ? 'Edit Salon Details' : 'Add New Salon'}</h2>
              <p>{editingSalon ? 'For Admin — modify salon details' : 'For Admin — register a new salon branch'}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="salon-success-state">
            <div className="success-icon-wrap">
              <CheckCircle size={56} />
            </div>
            <h3>{editingSalon ? 'Salon Successfully Updated! 🎉' : 'Salon Successfully Added! 🎉'}</h3>
            <p>{editingSalon ? 'The salon branch details have been updated.' : 'A new salon branch has been created.'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="salon-modal-form">
            {error && (
              <div className="salon-form-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="form-section">
              <h4 className="section-label">Basic Information</h4>
              <div className="form-grid-2">
                <div className="form-field">
                  <label><Store size={14} /> Salon Name *</label>
                  <input
                    type="text"
                    name="salonName"
                    value={form.salonName}
                    onChange={handleChange}
                    placeholder="e.g. Glamour Salon"
                    required
                  />
                </div>
                <div className="form-field">
                  <label><User size={14} /> Owner Name *</label>
                  <input
                    type="text"
                    name="ownerName"
                    value={form.ownerName}
                    onChange={handleChange}
                    placeholder="e.g. John Smith"
                    required
                  />
                </div>
                <div className="form-field">
                  <label><Mail size={14} /> Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="salon@example.com"
                    required
                  />
                </div>
                <div className="form-field">
                  <label><Phone size={14} /> Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="form-section">
              <h4 className="section-label"><MapPin size={14} /> Address *</h4>
              <div className="form-grid-2">
                <div className="form-field full-span">
                  <label>Street *</label>
                  <input
                    type="text"
                    name="street"
                    value={form.street}
                    onChange={handleChange}
                    placeholder="Street / Area"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>City *</label>
                  <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="New York" required />
                </div>
                <div className="form-field">
                  <label>State *</label>
                  <input type="text" name="state" value={form.state} onChange={handleChange} placeholder="NY" required />
                </div>
                <div className="form-field">
                  <label>Pincode / Postal Code *</label>
                  <input type="text" name="pincode" value={form.pincode} onChange={handleChange} placeholder="e.g. 110001" minLength={4} maxLength={6} required />
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="form-section">
              <h4 className="section-label"><Clock size={14} /> Working Hours</h4>
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Opening Time</label>
                  <input type="time" name="openingTime" value={form.openingTime} onChange={handleChange} />
                </div>
                <div className="form-field">
                  <label>Closing Time</label>
                  <input type="time" name="closingTime" value={form.closingTime} onChange={handleChange} />
                </div>
              </div>
            </div>

            {/* Working Days */}
            <div className="form-section">
              <h4 className="section-label">Working Days</h4>
              <div className="chip-group">
                {WORKING_DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    className={`chip ${form.workingDays.includes(day) ? 'chip-active' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>



            {/* Submit */}
            <div className="salon-modal-footer">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-add-salon" disabled={loading}>
                {loading ? (
                  editingSalon ? <><Loader size={16} className="spin-icon" /> Updating...</> : <><Loader size={16} className="spin-icon" /> Adding...</>
                ) : (
                  editingSalon ? <><CheckCircle size={16} /> Update Salon</> : <><Store size={16} /> Add Salon</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddSalon;