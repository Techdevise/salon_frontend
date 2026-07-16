import { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, Sparkles, AlertCircle, Info, Trash2, Award } from 'lucide-react';
import { useSelector } from 'react-redux';
import axiosLib from 'axios';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic Plan',
    description: 'Perfect for small single-location salons starting out',
    maxBranches: 1,
    maxStaff: 5,
    features: [
      { name: '1 Salon Branch Limit', enabled: true },
      { name: 'Up to 5 Staff Members', enabled: true },
      { name: 'Multi-Branch Support', enabled: false },
      { name: 'Advanced Dashboard Reports', enabled: false },
      { name: 'SMS & Email Notifications', enabled: false },
      { name: 'Custom Branding Options', enabled: false },
    ],
    pricing: {
      monthly: 999,
      quarterly: 2699,
      yearly: 9599
    }
  },
  {
    id: 'professional',
    name: 'Professional Plan',
    description: 'Ideal for growing salons with multiple staff and branches',
    maxBranches: 3,
    maxStaff: 20,
    features: [
      { name: 'Up to 3 Salon Branches', enabled: true },
      { name: 'Up to 20 Staff Members', enabled: true },
      { name: 'Multi-Branch Support', enabled: true },
      { name: 'Advanced Dashboard Reports', enabled: true },
      { name: 'SMS & Email Notifications', enabled: true },
      { name: 'Custom Branding Options', enabled: false },
    ],
    pricing: {
      monthly: 2499,
      quarterly: 6747,
      yearly: 23990
    },
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plan',
    description: 'Full featured package for large salon chains and franchises',
    maxBranches: 'Unlimited',
    maxStaff: 'Unlimited',
    features: [
      { name: 'Unlimited Salon Branches', enabled: true },
      { name: 'Unlimited Staff Members', enabled: true },
      { name: 'Multi-Branch Support', enabled: true },
      { name: 'Advanced Dashboard Reports', enabled: true },
      { name: 'SMS & Email Notifications', enabled: true },
      { name: 'Custom Branding Options', enabled: true },
    ],
    pricing: {
      monthly: 4999,
      quarterly: 13497,
      yearly: 47990
    }
  }
];

import { useConfirm } from '../components/ConfirmModal';

function Subscription() {
  const { user } = useSelector((state) => state.auth);
  const { selectedSalonId } = useSelector((state) => state.salon);
  const isAdmin = user?.role === 'Admin';
  const confirm = useConfirm();

  const [activeSubscription, setActiveSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertMsg, setAlertMsg] = useState(null);

  useEffect(() => {
    fetchActiveSubscription();
  }, [selectedSalonId]);

  const fetchActiveSubscription = async () => {
    setLoading(true);
    try {
      const salonParam = selectedSalonId ? `?salonId=${selectedSalonId}` : '';
      const res = await axiosLib.get(`/api/subscription/active${salonParam}`, { withCredentials: true });
      if (res.data?.success && res.data?.data) {
        setActiveSubscription(res.data.data);
      } else {
        setActiveSubscription(null);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setActiveSubscription(null);
      } else {
        showAlert(err.response?.data?.message || 'Failed to load active subscription', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (text, type = 'success') => {
    setAlertMsg({ text, type });
    setTimeout(() => {
      setAlertMsg(null);
    }, 5000);
  };

  const handleCancelSubscription = async (id) => {
    const confirmed = await confirm({
      title: 'Cancel Subscription',
      message: 'Are you sure you want to cancel your current subscription? This will change status to cancelled.',
      confirmText: 'Cancel Subscription',
      cancelText: 'Keep Plan',
      type: 'danger'
    });
    if (!confirmed) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axiosLib.post(`/api/subscription/cancel/${id}`, {}, { withCredentials: true });
      if (res.data?.success) {
        showAlert("Subscription cancelled successfully!", "success");
        fetchActiveSubscription();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to cancel subscription", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlanSelect = (plan) => {
    if (!isAdmin) {
      showAlert("Only Admin accounts can upgrade or buy a subscription.", "error");
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault();
    if (!paymentId.trim()) {
      showAlert("Please enter the payment transaction ID/UTR.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axiosLib.post('/api/subscription/create', {
        plan: selectedPlan.id,
        billingCycle,
        paymentId: paymentId.trim(),
        ...(selectedSalonId && { salonId: selectedSalonId })
      }, { withCredentials: true });

      if (res.data?.success) {
        showAlert("Subscription activated successfully!", "success");
        setShowPaymentModal(false);
        setPaymentId('');
        setSelectedPlan(null);
        fetchActiveSubscription();
      }
    } catch (err) {
      showAlert(err.response?.data?.message || "Failed to activate subscription. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-zinc-400">
        <div className="w-10 h-10 border-3 border-violet-500/10 rounded-full border-t-violet-500 animate-spin"></div>
        <p>Fetching subscription details...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-br from-white from-30% to-zinc-400 bg-clip-text text-transparent mb-2">
          Subscription & Plan Management
        </h1>
        <p className="text-zinc-400 text-base m-0">
          Manage your salon platform billing, view active plan details, and unlock premium features.
        </p>
      </div>

      {alertMsg && (
        <div className={`p-4 rounded-xl font-medium flex items-center gap-3 mb-6 border ${
          alertMsg.type === 'error' 
            ? 'bg-red-500/10 text-red-400 border-red-500/20' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        }`}>
          {alertMsg.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* Current active subscription details */}
      {activeSubscription ? (
        <div className="bg-gradient-to-br from-violet-600/10 to-pink-600/5 border border-violet-500/20 rounded-2xl p-8 mb-12 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-8 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-4 flex flex-wrap items-center gap-4">
              Current Active Subscription: 
              <span className="uppercase bg-gradient-to-r from-violet-600 to-pink-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider text-white">
                {activeSubscription.plan}
              </span>
            </h2>
            <p className="text-zinc-400 text-sm mb-6">
              Your salon has an active premium package. See transaction and expiry info below:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 mt-6">
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Billing Cycle</span>
                <span className="text-zinc-200 text-lg font-semibold capitalize">{activeSubscription.billingCycle}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Price</span>
                <span className="text-zinc-200 text-lg font-semibold">₹{activeSubscription.price}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Status</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold w-fit capitalize">
                  {activeSubscription.status}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Start Date</span>
                <span className="text-zinc-200 text-lg font-semibold">{new Date(activeSubscription.startDate).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Expiry Date</span>
                <span className="text-yellow-500 text-lg font-semibold">
                  {activeSubscription.endDate ? new Date(activeSubscription.endDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              {activeSubscription.paymentId && (
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Transaction ID</span>
                  <span className="text-zinc-200 text-base font-mono truncate" title={activeSubscription.paymentId}>
                    {activeSubscription.paymentId}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            {isAdmin && activeSubscription.status === 'active' && (
              <button 
                className="py-3 px-4 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 bg-transparent border border-red-500/20 text-red-400 hover:bg-red-500/5"
                onClick={() => handleCancelSubscription(activeSubscription._id)}
                disabled={isSubmitting}
              >
                <Trash2 size={16} />
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8 mb-12 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} className="text-red-400" />
            <h2 className="text-2xl font-bold text-red-400">
              No Active Subscription
            </h2>
          </div>
          <p className="text-zinc-400 text-sm m-0">
            {isAdmin 
              ? "Please purchase a package below to prevent interruption of salon services and enable multi-branch or extra staff features."
              : "Your salon does not have an active subscription plan. Please ask your administrator to purchase a plan."}
          </p>
        </div>
      )}

      {/* Plans selector */}
      <div className="flex flex-col items-center mb-12">
        <h3 className="text-xl font-bold mb-4 text-zinc-200">Choose Your Billing Cycle</h3>
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-full gap-1">
          <button 
            className={`bg-transparent border-0 text-zinc-400 px-6 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition-all duration-300 ${
              billingCycle === 'monthly' 
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-[0_4px_12_rgba(124,58,237,0.3)]' 
                : 'hover:text-white'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`bg-transparent border-0 text-zinc-400 px-6 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition-all duration-300 flex items-center ${
              billingCycle === 'quarterly' 
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-[0_4px_12_rgba(124,58,237,0.3)]' 
                : 'hover:text-white'
            }`}
            onClick={() => setBillingCycle('quarterly')}
          >
            Quarterly
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ml-2 border border-emerald-500/30">Save 10%</span>
          </button>
          <button 
            className={`bg-transparent border-0 text-zinc-400 px-6 py-2.5 rounded-full font-semibold text-sm cursor-pointer transition-all duration-300 flex items-center ${
              billingCycle === 'yearly' 
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-[0_4px_12_rgba(124,58,237,0.3)]' 
                : 'hover:text-white'
            }`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ml-2 border border-emerald-500/30">Save 20%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-center items-stretch">
        {PLANS.map((plan) => {
          const price = plan.pricing[billingCycle];
          const isActivePlan = activeSubscription?.plan === plan.id && activeSubscription?.status === 'active';
          
          return (
            <div 
              key={plan.id} 
              className={`bg-white/2 border rounded-[20px] p-8 flex flex-col transition-all duration-300 relative overflow-hidden hover:-translate-y-2 hover:border-white/15 hover:bg-white/4 hover:shadow-2xl ${
                plan.popular 
                  ? 'border-violet-500/40 bg-violet-500/2 hover:border-violet-500/60 hover:bg-violet-500/4 hover:shadow-[0_20px_40px_rgba(124,58,237,0.12)]' 
                  : 'border-white/5'
              }`}
            >
              {plan.popular && (
                <span className="absolute top-4 right-4 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              )}
              <div className="text-2xl font-bold text-white capitalize mb-2">{plan.name}</div>
              <p className="text-zinc-500 text-sm mb-6">{plan.description}</p>
              
              <div className="mb-8 flex items-baseline">
                <span className="text-3xl font-extrabold text-white mr-1">₹</span>
                <span className="text-5xl font-extrabold text-white tracking-tight">{price}</span>
                <span className="text-sm text-zinc-500 ml-1.5">/{billingCycle === 'monthly' ? 'mo' : billingCycle === 'quarterly' ? '3 mos' : 'yr'}</span>
              </div>

              <ul className="list-none p-0 m-0 mb-10 flex flex-col gap-4 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className={`flex items-center gap-3 text-sm ${feature.enabled ? 'text-zinc-200' : 'text-zinc-600'}`}>
                    {feature.enabled ? (
                      <Check size={18} className="text-emerald-400 shrink-0" />
                    ) : (
                      <X size={18} className="text-zinc-600 shrink-0" />
                    )}
                    <span>{feature.name}</span>
                  </li>
                ))}
              </ul>

              {isActivePlan ? (
                <button 
                  className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm cursor-default transition-all duration-200 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                  disabled
                >
                  <Award size={18} /> Current Plan
                </button>
              ) : (
                <button 
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white border-0 hover:-translate-y-0.5 hover:shadow-[0_4px_15_rgba(124,58,237,0.4)]' 
                      : 'bg-white/5 text-zinc-200 border border-white/10 hover:bg-white/8 hover:border-white/20'
                  }`}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={!isAdmin}
                >
                  <Sparkles size={16} />
                  {activeSubscription ? 'Upgrade Plan' : 'Subscribe Now'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-[90%] max-w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h2 className="m-0 text-xl font-bold">Confirm Subscription Activation</h2>
              <button 
                className="bg-transparent border-0 text-zinc-400 cursor-pointer p-2 rounded-full flex hover:bg-white/10 hover:text-white transition-all" 
                onClick={() => { setShowPaymentModal(false); setSelectedPlan(null); setPaymentId(''); }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubscribeSubmit} className="flex flex-col gap-5">
              <div className="bg-white/3 border border-white/6 rounded-xl p-5 flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Selected Plan:</span>
                  <strong className="capitalize">{selectedPlan.name}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Billing Period:</span>
                  <strong className="capitalize">{billingCycle}</strong>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-3">
                  <span>Grand Total:</span>
                  <span className="text-pink-400">₹{selectedPlan.pricing[billingCycle]}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 bg-white/2 border border-dashed border-white/10 rounded-xl p-6">
                <p className="m-0 font-semibold text-sm">Scan QR to Pay via UPI</p>
                <div className="w-40 h-40 bg-white rounded-lg p-2.5 flex items-center justify-center shadow-lg">
                  <img src="/mock_qr_code.png" alt="UPI QR Code" className="w-full height-full object-contain" />
                </div>
                <span className="text-center text-xs text-zinc-400">
                  Pay to: <strong className="text-white">payments@salonpro.com</strong>
                </span>
              </div>

              <div className="p-3 rounded-lg text-sm bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Info size={16} className="inline mr-2 align-middle shrink-0" />
                <span>
                  After scanning and making the payment, please enter your transaction ID or UTR code below to verify the activation.
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="transactionId" className="text-sm text-zinc-400 font-medium">UPI Transaction ID / Ref / UTR Number</label>
                <input 
                  type="text" 
                  id="transactionId" 
                  placeholder="e.g. TXN128392812" 
                  value={paymentId} 
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="bg-white/3 border border-white/10 py-3 px-4 rounded-lg text-white font-sans transition-colors duration-200 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  className="bg-transparent border border-white/20 text-zinc-200 py-3 px-5 rounded-lg font-medium cursor-pointer hover:bg-white/5 transition-all" 
                  onClick={() => { setShowPaymentModal(false); setSelectedPlan(null); setPaymentId(''); }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-violet-600 to-pink-600 text-white border-0 py-3 px-5 rounded-lg font-semibold text-sm cursor-pointer transition-all hover:shadow-[0_4px_15_rgba(124,58,237,0.4)]" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : 'Activate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscription;
