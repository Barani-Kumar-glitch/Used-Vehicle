import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Card, Modal } from '../../components/common/UI.jsx';
import { IndianRupee, FileText, Tag, Calendar, Plus, Search } from 'lucide-react';

export const Payments = () => {
  const { showBanner } = useNotificationStore();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Record Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [saleOrderId, setSaleOrderId] = useState('');
  const [rentalId, setRentalId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentStatus, setPaymentStatus] = useState('completed');
  const [paidAt, setPaidAt] = useState('');
  const [sales, setSales] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Split date/time states
  const [paidDate, setPaidDate] = useState('');
  const [paidTime, setPaidTime] = useState('');

  useEffect(() => {
    if (paidDate && paidTime) {
      setPaidAt(`${paidDate}T${paidTime}`);
    } else {
      setPaidAt('');
    }
  }, [paidDate, paidTime]);

  useEffect(() => {
    fetchPayments();
    fetchSalesAndRentals();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/payments');
      setPayments(res.data.payments);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesAndRentals = async () => {
    try {
      const [salesRes, rentalsRes] = await Promise.all([
        API.get('/orders/sale'),
        API.get('/orders/rental')
      ]);
      setSales(salesRes.data.orders || []);
      setRentals(rentalsRes.data.rentals || []);
    } catch (err) {
      console.error('Failed to fetch sales/rentals:', err);
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedPayment(null);
    setSaleOrderId('');
    setRentalId('');
    setAmount('');
    setPaymentMethod('UPI');
    setPaymentStatus('completed');
    setPaidDate('');
    setPaidTime('');
    setPaidAt('');
    setModalOpen(true);
  };

  const handleOpenEdit = (payment) => {
    setIsEditing(true);
    setSelectedPayment(payment);
    setSaleOrderId(payment.sale_order_id || '');
    setRentalId(payment.rental_id || '');
    setAmount(payment.amount || '');
    setPaymentMethod(payment.payment_method || 'UPI');
    setPaymentStatus(payment.payment_status || 'completed');
    
    const parseDatePart = (dtStr) => {
      if (!dtStr) return '';
      const d = new Date(dtStr);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const parseTimePart = (dtStr) => {
      if (!dtStr) return '';
      const d = new Date(dtStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    
    setPaidDate(parseDatePart(payment.paid_at));
    setPaidTime(parseTimePart(payment.paid_at));
    setModalOpen(true);
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This will revert the order payment status calculations.')) return;
    try {
      await API.delete(`/admin/payments/${id}`);
      fetchPayments();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete payment', 'error');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      showBanner('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        sale_order_id: saleOrderId ? parseInt(saleOrderId, 10) : null,
        rental_id: rentalId ? parseInt(rentalId, 10) : null,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        paid_at: paidAt || undefined,
      };

      if (isEditing && selectedPayment) {
        await API.patch(`/admin/payments/${selectedPayment.payment_id}`, payload);
      } else {
        await API.post('/admin/payments', payload);
      }

      setModalOpen(false);
      fetchPayments();
      // Reset form
      setSaleOrderId('');
      setRentalId('');
      setAmount('');
      setPaymentMethod('UPI');
      setPaymentStatus('completed');
      setPaidAt('');
      setIsEditing(false);
      setSelectedPayment(null);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save payment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const searchedPayments = payments.filter(p => {
    const term = search.toLowerCase();
    const details = p.sale_order_id ? p.SaleOrder : p.RentalBooking;
    const customer = details?.Customer;
    const referenceId = p.sale_order_id ? `Sale #SV-S-${p.sale_order_id}` : `Rental #SV-R-${p.rental_id}`;
    return (
      p.payment_id.toString().includes(term) ||
      referenceId.toLowerCase().includes(term) ||
      (customer?.name || '').toLowerCase().includes(term) ||
      (p.payment_method || '').toLowerCase().includes(term) ||
      p.amount.toString().includes(term)
    );
  });

  const filteredPayments = statusFilter === 'all'
    ? searchedPayments
    : searchedPayments.filter(p => p.payment_status === statusFilter);

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredPayments.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header section with add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search payment ID, reference, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </div>
        </div>

        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Record Payment</span>
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Transactions</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{payments.length}</h4>
          </div>
          <FileText size={24} className="text-slate-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Volume</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">
              ₹{payments.reduce((acc, p) => acc + (p.payment_status === 'completed' ? parseFloat(p.amount) : 0), 0).toLocaleString('en-IN')}
            </h4>
          </div>
          <IndianRupee size={24} className="text-emerald-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Purchase Payments</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">
              {payments.filter(p => p.sale_order_id !== null).length}
            </h4>
          </div>
          <Tag size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rental Payments</span>
            <h4 className="text-2xl font-black text-purple-500 mt-1">
              {payments.filter(p => p.rental_id !== null).length}
            </h4>
          </div>
          <Calendar size={24} className="text-purple-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-855 pb-4">
        {[
          { id: 'all', label: 'All Payments' },
          { id: 'completed', label: 'Completed' },
          { id: 'pending', label: 'Pending' },
          { id: 'failed', label: 'Failed' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? payments.length 
            : payments.filter(p => p.payment_status === tab.id).length;
          
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <IndianRupee className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Payments Received</h4>
          <p className="text-slate-500 text-xs">Financial logs will appear when payments are recorded against orders.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table variant="dark" headers={['Payment ID', 'Reference ID', 'Customer details', 'Vehicle details', 'Payment Method', 'Amount', 'Transaction Time', 'Status', 'Actions']}>
            {currentPayments.map((payment) => {
              // Find appropriate order/booking reference
              const referenceId = payment.sale_order_id
                ? `Sale #SV-S-${payment.sale_order_id}`
                : `Rental #SV-R-${payment.rental_id}`;
                
              const details = payment.sale_order_id
                ? payment.SaleOrder
                : payment.RentalBooking;
                
              const customer = details?.Customer;
              const vehicle = details?.Vehicle;

              return (
                <tr key={payment.payment_id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#SV-P-{payment.payment_id}</td>
                  <td className="px-6 py-4 font-bold text-slate-300 flex items-center space-x-1.5">
                    <FileText size={14} className="text-slate-500" />
                    <span>{referenceId}</span>
                  </td>
                  <td className="px-6 py-4">
                    {customer ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{customer.name}</span>
                        <span className="text-xs text-slate-500">{customer.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">Walk-in</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {vehicle ? (
                      <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
                    ) : (
                      <span className="text-slate-500">N/A (Driver Booking)</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color="blue">{payment.payment_method}</Badge>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{new Date(payment.paid_at).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <Badge color={payment.payment_status === 'completed' ? 'green' : 'amber'}>
                      {payment.payment_status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(payment)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeletePayment(payment.payment_id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, payments.length)} of {payments.length} records
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

      {/* Record modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Payment Record' : 'Record New Payment'}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="UPI" selected>UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Status<br />&nbsp;</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="completed" selected>Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Paid Date (Optional)</label>
              <input
                type="date"
                value={paidDate}
                required
                onChange={(e) => setPaidDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }}
                onFocus={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Paid Time (Optional)</label>
              <input
                type="time"
                value={paidTime}
                onChange={(e) => setPaidTime(e.target.value)}
                onClick={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }}
                onFocus={(e) => {
                  try {
                    e.target.showPicker();
                  } catch (err) {}
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-150 pt-3">
            <span className="text-xs font-bold text-slate-400 block mb-3">Link to Transaction</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sale Order</label>
                <select
                  value={saleOrderId}
                  disabled={!!rentalId}
                  required
                  onChange={(e) => setSaleOrderId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- None --</option>
                  {sales
                    .filter((order) => order.payment_status !== 'paid' || order.sale_order_id == saleOrderId)
                    .map((order) => (
                      <option key={order.sale_order_id} value={order.sale_order_id}>
                        #{order.sale_order_id} - {order.Customer?.name} (₹{parseFloat(order.price).toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rental Booking</label>
                <select
                  value={rentalId}
                  disabled={!!saleOrderId}
                  required
                  onChange={(e) => setRentalId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- None --</option>
                  {rentals
                    .filter((booking) => booking.payment_status !== 'paid' || booking.rental_id == rentalId)
                    .map((booking) => (
                      <option key={booking.rental_id} value={booking.rental_id}>
                        #{booking.rental_id} - {booking.Customer?.name} (₹{parseFloat(booking.price).toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Payments;
