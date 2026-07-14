import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { Spinner, Table, Badge, Card } from '../../components/common/UI.jsx';
import { Share2, IndianRupee, Eye, CheckCircle, Gift } from 'lucide-react';

export const MyReferrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyReferrals();
  }, []);

  const fetchMyReferrals = async () => {
    setLoading(true);
    try {
      const res = await API.get('/referrals/my');
      setReferrals(res.data.referrals);
    } catch (err) {
      console.error('Failed to load my referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregates
  const totalEarned = referrals
    .filter(r => r.commission_status === 'paid')
    .reduce((sum, r) => sum + parseFloat(r.commission_amount || '0'), 0);

  const pendingEarned = referrals
    .filter(r => r.commission_status === 'approved')
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800">My Referral Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Track links you've shared, visitor activity, and cash commissions earned.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-brand-700 to-brand-850 text-white border-none flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-brand-200 font-bold uppercase tracking-wider">Total Commission Paid</span>
            <h4 className="text-3xl font-black">₹{totalEarned.toLocaleString('en-IN')}</h4>
          </div>
          <Gift size={36} className="text-brand-300 opacity-60" />
        </Card>

        <Card className="p-6 bg-white border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending Approved Payout</span>
            <h4 className="text-3xl font-black text-slate-800">₹{pendingEarned.toLocaleString('en-IN')}</h4>
          </div>
          <IndianRupee size={36} className="text-brand-600 opacity-50" />
        </Card>

        <Card className="p-6 bg-white border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Links Shared</span>
            <h4 className="text-3xl font-black text-slate-800">{referrals.length}</h4>
          </div>
          <Share2 size={36} className="text-accent-600 opacity-50" />
        </Card>
      </div>

      {/* Referrals table */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-4">My Referral Links Activity</h3>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Spinner size="md" />
            <span className="text-slate-400 text-sm">Loading referral statistics...</span>
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl">
            <Share2 className="mx-auto text-slate-300 mb-4" size={40} />
            <h4 className="font-bold text-slate-700 mb-1">No Referrals Yet</h4>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              Go to any vehicle listing page and tap "Refer & Earn" to generate a shareable commission link!
            </p>
          </div>
        ) : (
          <Table headers={['Referral Code', 'Vehicle Details', 'Visitor Status', 'Commission Amount', 'Payout Status', 'Date Created']}>
            {referrals.map((ref) => (
              <tr key={ref.referral_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold">{ref.referral_code}</td>
                <td className="px-6 py-4">
                  {ref.Vehicle ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{ref.Vehicle.make} {ref.Vehicle.model}</span>
                      <span className="text-xs text-slate-400">{ref.Vehicle.year} • {ref.Vehicle.location}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400">Deleted Vehicle</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge color={statusColors[ref.status]}>{ref.status}</Badge>
                </td>
                <td className="px-6 py-4 font-bold">
                  {ref.commission_amount ? `₹${parseFloat(ref.commission_amount).toLocaleString('en-IN')}` : '-'}
                </td>
                <td className="px-6 py-4">
                  <Badge color={commColors[ref.commission_status]}>{ref.commission_status}</Badge>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {new Date(ref.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
};
export default MyReferrals;
