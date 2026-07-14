import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Modal, Card } from '../../components/common/UI.jsx';
import { Plus, Search, Tag, Share2, IndianRupee, Clock } from 'lucide-react';

export const SoldVehicles = () => {
  const { showBanner } = useNotificationStore();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create sale modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [vehicleId, setVehicleId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [price, setPrice] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transferDate, setTransferDate] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExchange, setIsExchange] = useState(false);
  const [offeredVehicleId, setOfferedVehicleId] = useState('');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetchSales();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [vehiclesRes, customersRes] = await Promise.all([
        API.get('/vehicles', { params: { status: 'all' } }),
        API.get('/admin/customers')
      ]);
      setVehicles(vehiclesRes.data.vehicles || []);
      setCustomers(customersRes.data.customers || []);
    } catch (err) {
      console.error('Failed to fetch dropdown list data:', err);
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await API.get('/orders/sale');
      setSales(res.data.orders);
    } catch (err) {
      console.error('Failed to fetch sales logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedSale(null);
    setVehicleId('');
    setCustomerId('');
    setPrice('');
    setPaymentStatus('paid');
    setPaymentMethod('UPI');
    setTransferDate('');
    setReferralCode('');
    setIsExchange(false);
    setOfferedVehicleId('');
    setOfferedPrice('');
    setModalOpen(true);
  };

  const handleOpenEdit = (sale) => {
    setIsEditing(true);
    setSelectedSale(sale);
    setVehicleId(sale.vehicle_id || '');
    setCustomerId(sale.customer_id || '');
    setPrice(sale.price || '');
    setPaymentStatus(sale.payment_status || 'paid');
    setPaymentMethod('UPI');
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setTransferDate(formatDate(sale.ownership_transfer_date));
    setReferralCode(sale.referral_code || sale.referral?.referral_code || '');
    setModalOpen(true);
  };

  const handleDeleteSale = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sale order? The vehicle status will be reverted.')) return;
    try {
      await API.delete(`/orders/sale/${id}`);
      fetchSales();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete sale order', 'error');
    }
  };

  const handleCreateSale = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && selectedSale) {
        await API.patch(`/orders/sale/${selectedSale.sale_order_id}`, {
          payment_status: paymentStatus,
          payment_method: paymentStatus === 'paid' ? paymentMethod : undefined,
          transfer_date: transferDate || undefined,
        });
      } else {
        if (!vehicleId || !customerId || !price) return;
        
        if (isExchange) {
          if (!offeredVehicleId || !offeredPrice) {
            showBanner('Offered Vehicle ID and Offered Price are required for Exchange', 'error');
            setSubmitting(false);
            return;
          }
          await API.post('/orders/exchange', {
            customer_id: parseInt(customerId, 10),
            offered_vehicle_id: parseInt(offeredVehicleId, 10),
            taken_vehicle_id: parseInt(vehicleId, 10),
            offered_price: parseFloat(offeredPrice),
            taken_price: parseFloat(price),
            payment_status: paymentStatus,
          });
        } else {
          const payload = {
            vehicle_id: parseInt(vehicleId, 10),
            customer_id: parseInt(customerId, 10),
            price: parseFloat(price),
            payment_status: paymentStatus,
            payment_method: paymentStatus === 'paid' ? paymentMethod : undefined,
          };
          if (transferDate) payload.transfer_date = transferDate;
          if (referralCode) payload.referral_code = referralCode;

          await API.post('/orders/sale', payload);
        }
      }
      
      setModalOpen(false);
      fetchSales();
      
      // Reset form
      setVehicleId('');
      setCustomerId('');
      setPrice('');
      setPaymentStatus('paid');
      setTransferDate('');
      setReferralCode('');
      setIsExchange(false);
      setOfferedVehicleId('');
      setOfferedPrice('');
      setIsEditing(false);
      setSelectedSale(null);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save sale order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const searchedSales = sales.filter(sale => {
    const term = search.toLowerCase();
    return (
      sale.sale_order_id.toString().includes(term) ||
      (sale.Customer?.name || '').toLowerCase().includes(term) ||
      (sale.Vehicle?.make || '').toLowerCase().includes(term) ||
      (sale.Vehicle?.model || '').toLowerCase().includes(term)
    );
  });

  const filteredSales = statusFilter === 'all'
    ? searchedSales
    : searchedSales.filter(sale => sale.payment_status === statusFilter);

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredSales.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <input
            type="text"
            placeholder="Search sale ID, customer, vehicle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 focus:outline-none"
          />
        </div>
        
        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Record New Sale</span>
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Sales</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{sales.length}</h4>
          </div>
          <Tag size={24} className="text-slate-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Revenue</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">
              ₹{sales.reduce((acc, sale) => acc + (sale.payment_status === 'paid' ? parseFloat(sale.price) : 0), 0).toLocaleString('en-IN')}
            </h4>
          </div>
          <IndianRupee size={24} className="text-emerald-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Payments</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">
              {sales.filter(sale => sale.payment_status !== 'paid').length}
            </h4>
          </div>
          <Clock size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Referred Sales</span>
            <h4 className="text-2xl font-black text-purple-500 mt-1">
              {sales.filter(sale => sale.referral_code || sale.referral).length}
            </h4>
          </div>
          <Share2 size={24} className="text-purple-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: 'all', label: 'All Sales' },
          { id: 'paid', label: 'Paid' },
          { id: 'partial', label: 'Partial Payment' },
          { id: 'unpaid', label: 'Unpaid' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? sales.length 
            : sales.filter(s => s.payment_status === tab.id).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                statusFilter === tab.id
                  ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <Tag className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Sale Logs Found</h4>
          <p className="text-slate-500 text-xs">Record sales here or process pending purchase requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table variant="dark" headers={['Sale ID', 'Vehicle Details', 'Customer Details', 'Final Price', 'Payment', 'Referred?', 'Sale Date', 'Actions']}>
            {currentSales.map((sale) => (
              <tr key={sale.sale_order_id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#SV-S-{sale.sale_order_id}</td>
                <td className="px-6 py-4">
                  {sale.Vehicle ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{sale.Vehicle.make} {sale.Vehicle.model}</span>
                      <span className="text-xs text-slate-500">{sale.Vehicle.year} • {sale.Vehicle.fuel_type}</span>
                      {sale.ExchangeOrder?.Vehicle && (
                        <div className="mt-1.5 flex flex-col text-[10px] bg-slate-900 border border-slate-800/80 rounded-lg p-1.5 w-fit max-w-[200px]">
                          <span className="text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            🔄 Exchange
                          </span>
                          <span className="text-slate-400 mt-0.5">
                            Linked: <span className="font-semibold text-slate-200">{sale.ExchangeOrder.Vehicle.make} {sale.ExchangeOrder.Vehicle.model} (#{sale.ExchangeOrder.Vehicle.vehicle_id})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">Deleted Vehicle</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {sale.Customer ? (
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{sale.Customer.name}</span>
                      <span className="text-xs text-slate-500">{sale.Customer.phone}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500">Walk-in Customer</span>
                  )}
                </td>
                <td className="px-6 py-4 font-bold text-white">₹{parseFloat(sale.price).toLocaleString('en-IN')}</td>
                <td className="px-6 py-4">
                  <Badge color={sale.payment_status === 'paid' ? 'green' : 'amber'}>
                    {sale.payment_status}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {sale.referral ? (
                    <Badge color="purple" className="flex items-center space-x-1 w-fit">
                      <Share2 size={10} />
                      <span>Yes ({sale.referral.Referrer?.name || sale.referral.referral_code})</span>
                    </Badge>
                  ) : (
                    <span className="text-xs text-slate-600">No</span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">
                  {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(sale)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteSale(sale.sale_order_id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredSales.length)} of {filteredSales.length} records
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

      {/* Record manual sale modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Sale Order' : 'Record Sale Order (Offline/Direct)'}
      >
        <form onSubmit={handleCreateSale} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Vehicle</label>
              <select
                required
                disabled={isEditing}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                <option value="">-- Select Vehicle --</option>
                {vehicles
                  .filter((v) => (v.status === 'available' && (v.listing_mode === 'sale' || v.listing_mode === 'both')) || v.vehicle_id == vehicleId)
                  .map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      #{v.vehicle_id} - {v.year} {v.make} {v.model} ({v.status})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer</label>
              <select
                required
                disabled={isEditing}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none disabled:opacity-50"
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    #{c.customer_id} - {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Final Sale Price (₹)</label>
            <input
              type="number"
              min="0"
              required
              disabled={isEditing}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none disabled:opacity-50"
              placeholder="e.g. 450000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="paid">Paid (Closed)</option>
                <option value="partial">Partial Payment</option>
                <option value="unpaid">Unpaid / Deferred</option>
              </select>
            </div>
            {paymentStatus === 'paid' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ownership Transfer Date</label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                id="isExchange"
                checked={isExchange}
                onChange={(e) => setIsExchange(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
              />
              <label htmlFor="isExchange" className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Is this an Exchange transaction ?
              </label>
            </div>
          )}

          {isExchange && !isEditing && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Offered Vehicle</label>
                <select
                  required
                  value={offeredVehicleId}
                  onChange={(e) => setOfferedVehicleId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      #{v.vehicle_id} - {v.year} {v.make} {v.model} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Offered Vehicle Value (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none"
                  placeholder="e.g. 200000"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Referral Code (Optional)</label>
            <input
              type="text"
              disabled={isEditing}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none disabled:opacity-50"
              placeholder="e.g. abcd1234efgh"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Sale'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default SoldVehicles;
