import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Card, Modal } from '../../components/common/UI.jsx';
import { Share2, Phone, Mail, Award, CheckCircle, IndianRupee, Plus, Search } from 'lucide-react';

export const Referrals = () => {
  const { showBanner } = useNotificationStore();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [referrerCustomerId, setReferrerCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [referredCustomerId, setReferredCustomerId] = useState('');
  const [status, setStatus] = useState('generated');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [commissionStatus, setCommissionStatus] = useState('not_applicable');
  const [referralCode, setReferralCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReferrals();
    fetchCustomersAndVehicles();
  }, []);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await API.get('/referrals/admin');
      setReferrals(res.data.referrals);
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersAndVehicles = async () => {
    try {
      const [custRes, vehRes] = await Promise.all([
        API.get('/admin/customers'),
        API.get('/vehicles', { params: { status: 'all' } })
      ]);
      setCustomers(custRes.data.customers || []);
      setVehicles(vehRes.data.vehicles || []);
    } catch (err) {
      console.error('Failed to fetch customers/vehicles:', err);
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedReferral(null);
    setReferrerCustomerId('');
    setVehicleId('');
    setReferredCustomerId('');
    setStatus('generated');
    setCommissionAmount('');
    setCommissionStatus('not_applicable');
    setReferralCode('');
    setExpiresAt('');
    setModalOpen(true);
  };

  const handleOpenEdit = (ref) => {
    setIsEditing(true);
    setSelectedReferral(ref);
    setReferrerCustomerId(ref.referrer_customer_id || '');
    setVehicleId(ref.vehicle_id || '');
    setReferredCustomerId(ref.referred_customer_id || '');
    setStatus(ref.status || 'generated');
    setCommissionAmount(ref.commission_amount || '');
    setCommissionStatus(ref.commission_status || 'not_applicable');
    setReferralCode(ref.referral_code || '');
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setExpiresAt(formatDate(ref.expires_at));
    setModalOpen(true);
  };

  const handleDeleteReferral = async (id) => {
    if (!window.confirm('Are you sure you want to delete this referral record? This cannot be undone.')) return;
    try {
      await API.delete(`/referrals/admin/${id}`);
      fetchReferrals();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete referral', 'error');
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!referrerCustomerId || !vehicleId) {
      showBanner('Referrer Customer and Vehicle are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        referrer_customer_id: parseInt(referrerCustomerId, 10),
        vehicle_id: parseInt(vehicleId, 10),
        referred_customer_id: referredCustomerId ? parseInt(referredCustomerId, 10) : null,
        status,
        commission_amount: commissionAmount ? parseFloat(commissionAmount) : null,
        commission_status: commissionStatus,
        referral_code: referralCode || undefined,
        expires_at: expiresAt || undefined,
      };

      if (isEditing && selectedReferral) {
        await API.patch(`/referrals/admin/${selectedReferral.referral_id}`, payload);
      } else {
        await API.post('/referrals/admin', payload);
      }

      setModalOpen(false);
      fetchReferrals();
      
      // Reset form
      setReferrerCustomerId('');
      setVehicleId('');
      setReferredCustomerId('');
      setStatus('generated');
      setCommissionAmount('');
      setCommissionStatus('not_applicable');
      setReferralCode('');
      setExpiresAt('');
      setIsEditing(false);
      setSelectedReferral(null);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save referral', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    if (!window.confirm(`Mark this referral commission as ${status}?`)) return;
    try {
      await API.patch(`/referrals/admin/${id}/commission`, { commission_status: status });
      fetchReferrals();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to update commission status', 'error');
    }
  };

  // KPI Calculations
  const totalReferrals = referrals.length;
  const totalConversions = referrals.filter(r => r.status === 'converted' || r.status === 'commission_paid').length;
  
  const pendingCommission = referrals
    .filter(r => r.commission_status === 'approved' || r.commission_status === 'pending')
    .reduce((sum, r) => sum + parseFloat(r.commission_amount || '0'), 0);

  const paidCommission = referrals
    .filter(r => r.commission_status === 'paid')
    .reduce((sum, r) => sum + parseFloat(r.commission_amount || '0'), 0);

  const statusColors = {
    generated: 'gray',
    visited: 'blue',
    converted: 'purple',
    commission_paid: 'green',
    expired: 'rose',
  };

  const commColors = {
    not_applicable: 'gray',
    pending: 'amber',
    approved: 'purple',
    paid: 'green',
  };

  const searchedReferrals = referrals.filter(r => {
    const term = search.toLowerCase();
    return (
      r.referral_id.toString().includes(term) ||
      (r.referral_code || '').toLowerCase().includes(term) ||
      (r.Referrer?.name || '').toLowerCase().includes(term) ||
      (r.Referred?.name || '').toLowerCase().includes(term) ||
      (r.Vehicle?.make || '').toLowerCase().includes(term) ||
      (r.Vehicle?.model || '').toLowerCase().includes(term)
    );
  });

  const filteredReferrals = statusFilter === 'all'
    ? searchedReferrals
    : searchedReferrals.filter(r => r.status === statusFilter);

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentReferrals = filteredReferrals.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredReferrals.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search referral ID, code, referrer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </div>
        </div>
        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Create New Referral</span>
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Shares</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{totalReferrals}</h4>
          </div>
          <Share2 size={24} className="text-slate-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Conversions</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{totalConversions}</h4>
          </div>
          <Award size={24} className="text-purple-500" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Payouts</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">₹{pendingCommission.toLocaleString('en-IN')}</h4>
          </div>
          <IndianRupee size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Commissions Paid</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">₹{paidCommission.toLocaleString('en-IN')}</h4>
          </div>
          <CheckCircle size={24} className="text-emerald-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: 'all', label: 'All Referrals' },
          { id: 'generated', label: 'Generated' },
          { id: 'visited', label: 'Visited' },
          { id: 'converted', label: 'Converted' },
          { id: 'commission_paid', label: 'Commission Paid' },
          { id: 'expired', label: 'Expired' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? referrals.length 
            : referrals.filter(r => r.status === tab.id).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                statusFilter === tab.id
                  ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                  : 'bg-slate-955 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Referrals list */}
      <div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
            <Share2 className="mx-auto text-slate-700 mb-4" size={40} />
            <h4 className="font-bold text-slate-300 mb-1">No Referral Activity Logged</h4>
            <p className="text-slate-500 text-xs">Generated links and visitor status will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table variant="dark" headers={['Code', 'Referrer Details', 'Vehicle', 'Referred Customer', 'Status', 'Commission', 'Commission Status', 'Actions']}>
              {currentReferrals.map((ref) => {
                const isExpanded = expandedId === ref.referral_id;
                
                return (
                  <React.Fragment key={ref.referral_id}>
                    <tr 
                      onClick={() => setExpandedId(isExpanded ? null : ref.referral_id)}
                      className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60 cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono text-xs font-bold text-brand-400">#{ref.referral_code}</td>
                      <td className="px-6 py-4">
                        {ref.Referrer ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{ref.Referrer.name}</span>
                            <span className="text-xs text-slate-500">{ref.Referrer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Deleted Account</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ref.Vehicle ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{ref.Vehicle.make} {ref.Vehicle.model}</span>
                            <span className="text-xs text-slate-500">{ref.Vehicle.year}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Any (General code)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {ref.ReferredCustomer ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-200">{ref.ReferredCustomer.name}</span>
                            <span className="text-xs text-slate-500">{ref.ReferredCustomer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Pending Signup</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={statusColors[ref.status]}>{ref.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-350 font-bold">
                        {ref.commission_amount ? `₹${parseFloat(ref.commission_amount).toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge color={commColors[ref.commission_status]}>{ref.commission_status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="text-brand-400 hover:text-white p-0" onClick={() => setExpandedId(isExpanded ? null : ref.referral_id)}>
                            {isExpanded ? 'Hide Card' : 'View Contact'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenEdit(ref); }}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteReferral(ref.referral_id); }}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded row (Referrer contact card for payout) */}
                    {isExpanded && (
                      <tr className="bg-slate-950/60 border-b border-slate-800">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 max-w-4xl">
                            <div className="space-y-2">
                              <div className="text-xs font-bold uppercase tracking-wider text-brand-400">Referrer Contact Details</div>
                              <div className="flex items-center space-x-4 text-sm text-slate-300">
                                <span className="flex items-center space-x-1.5">
                                  <Phone size={14} className="text-slate-500" />
                                  <a href={`tel:${ref.Referrer?.phone}`} className="hover:underline font-bold text-white">
                                    {ref.Referrer?.phone}
                                  </a>
                                </span>
                                <span className="flex items-center space-x-1.5">
                                  <Mail size={14} className="text-slate-500" />
                                  <span>{ref.Referrer?.email}</span>
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                Preferred Payout Mode: Bank Transfer / UPI.
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              {ref.commission_status === 'pending' && (
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(ref.referral_id, 'approved');
                                  }}
                                >
                                  Approve Commission
                                </Button>
                              )}
                              {ref.commission_status === 'approved' && (
                                <Button 
                                  variant="accent" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateStatus(ref.referral_id, 'paid');
                                  }}
                                >
                                  Mark as Paid
                                </Button>
                              )}
                              {ref.commission_status === 'paid' && (
                                <span className="text-xs text-emerald-500 font-bold flex items-center space-x-1">
                                  <CheckCircle size={14} />
                                  <span>Paid Out</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                <span className="text-xs text-slate-400">
                  Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, referrals.length)} of {referrals.length} records
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-300 font-bold px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create referral modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Referral Link' : 'Create New Referral Link'}
      >
        <form onSubmit={handleCreateReferral} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Referrer Customer</label>
              <select
                required
                value={referrerCustomerId}
                onChange={(e) => setReferrerCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">-- Select Referrer --</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Vehicle</label>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">-- Select Vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id}>
                    {v.make} {v.model} ({v.year}) - ₹{parseFloat(v.price).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Referred Customer (Optional)</label>
              <select
                value={referredCustomerId}
                onChange={(e) => setReferredCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">-- None --</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status<br />&nbsp;</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="generated" selected>Generated</option>
                <option value="visited">Visited</option>
                <option value="converted">Converted</option>
                <option value="commission_paid">Commission Paid</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Commission Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. 1000"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Commission Status</label>
              <select
                value={commissionStatus}
                onChange={(e) => setCommissionStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="not_applicable" selected>Not Applicable</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Custom Code (Optional)</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                maxLength={12}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expiry Date (Optional)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Referral'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Referrals;
