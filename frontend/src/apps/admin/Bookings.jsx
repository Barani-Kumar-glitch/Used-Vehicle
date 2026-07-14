import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Modal, Card } from '../../components/common/UI.jsx';
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';

export const Bookings = () => {
  const { showBanner } = useNotificationStore();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const statusColors = {
    approved: 'blue',
    ongoing: 'green',
    extended: 'purple',
    returned: 'gray',
    overdue: 'rose',
  };

  const statusLabels = {
    approved: 'Approved',
    ongoing: 'Ongoing',
    extended: 'Extended',
    returned: 'Completed',
    overdue: 'Overdue',
  };

  // Add booking modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [driverId, setDriverId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [price, setPrice] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');

  // Split date/time states
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTimeInput, setPickupTimeInput] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTimeInput, setReturnTimeInput] = useState('');

  useEffect(() => {
    if (pickupDate && pickupTimeInput) {
      setPickupTime(`${pickupDate}T${pickupTimeInput}`);
    } else {
      setPickupTime('');
    }
  }, [pickupDate, pickupTimeInput]);

  useEffect(() => {
    if (returnDate && returnTimeInput) {
      setReturnTime(`${returnDate}T${returnTimeInput}`);
    } else {
      setReturnTime('');
    }
  }, [returnDate, returnTimeInput]);

  useEffect(() => {
    fetchRentals();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [customersRes, driversRes] = await Promise.all([
        API.get('/admin/customers'),
        API.get('/drivers')
      ]);
      setCustomers(customersRes.data.customers || []);
      setDrivers(driversRes.data.drivers || []);
    } catch (err) {
      console.error('Failed to fetch dropdown lists data:', err);
    }
  };

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const res = await API.get('/orders/rental');
      setRentals(res.data.rentals);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (rentalId) => {
    if (!window.confirm('Mark this driver booking as completed? This will free the driver.')) return;
    try {
      await API.post(`/orders/rental/${rentalId}/return`);
      fetchRentals();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to process completion', 'error');
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedBooking(null);
    setDriverId('');
    setCustomerId('');
    setPickupDate('');
    setPickupTimeInput('');
    setReturnDate('');
    setReturnTimeInput('');
    setPickupTime('');
    setReturnTime('');
    setPrice('');
    setPaymentStatus('unpaid');
    setPaymentMethod('UPI');
    setModalOpen(true);
  };

  const handleOpenEdit = (rental) => {
    setIsEditing(true);
    setSelectedBooking(rental);
    setDriverId(rental.driver_id || '');
    setCustomerId(rental.customer_id || '');
    
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
    
    setPickupDate(parseDatePart(rental.pickup_time));
    setPickupTimeInput(parseTimePart(rental.pickup_time));
    setReturnDate(parseDatePart(rental.expected_return_time));
    setReturnTimeInput(parseTimePart(rental.expected_return_time));
    setPrice(rental.price || '');
    setPaymentStatus(rental.payment_status || 'unpaid');
    setPaymentMethod('UPI');
    setModalOpen(true);
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver booking? All linked payment records will be deleted.')) return;
    try {
      await API.delete(`/orders/rental/${id}`);
      fetchRentals();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete driver booking', 'error');
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!driverId || !customerId || !price) {
      showBanner('Please fill in all required fields (Driver ID is required)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        driver_id: parseInt(driverId, 10),
        customer_id: parseInt(customerId, 10),
        pickup_time: pickupTime,
        return_time: returnTime,
        price: parseFloat(price),
        payment_status: paymentStatus,
        payment_method: paymentStatus === 'paid' ? paymentMethod : undefined,
        vehicle_id: null,
      };

      if (isEditing && selectedBooking) {
        await API.patch(`/orders/rental/${selectedBooking.rental_id}`, payload);
      } else {
        await API.post('/orders/rental', payload);
      }
      
      // Reset form fields
      setDriverId('');
      setCustomerId('');
      setPickupTime('');
      setReturnTime('');
      setPrice('');
      setPaymentStatus('unpaid');
      setIsEditing(false);
      setSelectedBooking(null);
      
      setModalOpen(false);
      fetchRentals();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save driver booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list to show ONLY driver bookings
  const filteredBookings = rentals.filter(rental => rental.driver_id !== null && rental.vehicle_id === null);

  const getBookingStatus = (booking) => {
    if (booking.extension) return 'extended';
    if (booking.actual_return_time) return 'returned';
    if (new Date(booking.expected_return_time) < new Date()) return 'overdue';
    if (new Date(booking.pickup_time) > new Date()) return 'approved';
    return 'ongoing';
  };

  const searchedBookings = filteredBookings.filter(booking => {
    const term = search.toLowerCase();
    return (
      booking.rental_id.toString().includes(term) ||
      (booking.Customer?.name || '').toLowerCase().includes(term) ||
      (booking.Customer?.phone || '').toLowerCase().includes(term) ||
      (booking.Driver?.name || '').toLowerCase().includes(term)
    );
  });

  const displayedBookings = searchedBookings.filter(booking => {
    if (statusFilter === 'all') return true;
    return getBookingStatus(booking) === statusFilter;
  });

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentBookings = displayedBookings.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(displayedBookings.length / recordsPerPage);

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
              placeholder="Search booking ID, customer, driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </div>
        </div>

        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Book Driver</span>
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Hires</span>
            <h4 className="text-xl font-black text-blue-400 mt-1">{filteredBookings.length}</h4>
          </div>
          <Calendar size={20} className="text-slate-600" />
        </Card>

        <Card className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Approved</span>
            <h4 className="text-xl font-black text-sky-400 mt-1">
              {filteredBookings.filter(b => getBookingStatus(b) === 'approved').length}
            </h4>
          </div>
          <CheckCircle size={20} className="text-sky-600" />
        </Card>

        <Card className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ongoing</span>
            <h4 className="text-xl font-black text-emerald-500 mt-1">
              {filteredBookings.filter(b => getBookingStatus(b) === 'ongoing').length}
            </h4>
          </div>
          <Clock size={20} className="text-emerald-600" />
        </Card>

        <Card className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Extended</span>
            <h4 className="text-xl font-black text-purple-500 mt-1">
              {filteredBookings.filter(b => getBookingStatus(b) === 'extended').length}
            </h4>
          </div>
          <Calendar size={20} className="text-purple-600" />
        </Card>

        <Card className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed</span>
            <h4 className="text-xl font-black text-slate-400 mt-1">
              {filteredBookings.filter(b => getBookingStatus(b) === 'returned').length}
            </h4>
          </div>
          <CheckCircle size={20} className="text-slate-500" />
        </Card>

        <Card className="p-4 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Overdue</span>
            <h4 className="text-xl font-black text-rose-500 mt-1">
              {filteredBookings.filter(b => getBookingStatus(b) === 'overdue').length}
            </h4>
          </div>
          <AlertCircle size={20} className="text-rose-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: 'all', label: 'All Hires' },
          { id: 'approved', label: 'Approved / Upcoming' },
          { id: 'ongoing', label: 'Ongoing' },
          { id: 'extended', label: 'Extended' },
          { id: 'returned', label: 'Completed' },
          { id: 'overdue', label: 'Overdue' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? filteredBookings.length 
            : filteredBookings.filter(b => getBookingStatus(b) === tab.id).length;
          
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
        <div className="flex justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <Calendar className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Bookings Found</h4>
          <p className="text-slate-500 text-xs">Try selecting a different filter or record a new booking.</p>
        </div>
      ) : displayedBookings.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <Calendar className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Bookings Found</h4>
          <p className="text-slate-500 text-xs">Try selecting a different filter or record a new booking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table variant="dark" headers={[
            'ID', 
            'Driver Details', 
            'Customer Details', 
            'Pickup Time', 
            'Return Time', 
            'Price', 
            'Hiring Status',
            'Payment Status', 
            'Actions'
          ]}>
            {currentBookings.map((rental) => {
              const bookingStatus = getBookingStatus(rental);
              return (
                <tr key={rental.rental_id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#SV-B-{rental.rental_id}</td>
                  <td className="px-6 py-4">
                    {rental.Driver ? (
                      <span className="font-bold text-slate-200">{rental.Driver.name}</span>
                    ) : (
                      <span className="text-slate-500">Deleted Driver</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {rental.Customer ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{rental.Customer.name}</span>
                        <span className="text-xs text-slate-500">{rental.Customer.phone}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Walk-in Customer</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{new Date(rental.pickup_time).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {rental.extension ? (
                      <div className="flex flex-col space-y-1">
                        <span>Exp: {new Date(rental.expected_return_time).toLocaleString('en-IN')}</span>
                        <div className="bg-emerald-950/20 border border-emerald-900/30 p-1.5 rounded-lg text-[9px] text-emerald-400 max-w-[180px]">
                          <span className="font-bold block uppercase tracking-wider text-[8px] text-emerald-500">✓ Extended Booking</span>
                          <span className="line-clamp-2 italic">"{rental.extension.details}"</span>
                        </div>
                      </div>
                    ) : rental.actual_return_time ? (
                      <div className="flex flex-col">
                        <span className="text-emerald-500">Completed</span>
                        <span className="text-[10px] text-slate-500">{new Date(rental.actual_return_time).toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-1">
                        <span>Exp: {new Date(rental.expected_return_time).toLocaleString('en-IN')}</span>
                        {new Date(rental.expected_return_time) < new Date() && (
                          <span className="text-rose-500 text-[10px] font-bold animate-pulse">Overdue</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">₹{parseFloat(rental.price).toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <Badge color={statusColors[bookingStatus]}>
                      {statusLabels[bookingStatus]}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={rental.payment_status === 'paid' ? 'green' : rental.payment_status === 'partial' ? 'amber' : 'rose'}>
                      {rental.payment_status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {!rental.actual_return_time && (
                        <Button variant="secondary" size="sm" onClick={() => handleReturn(rental.rental_id)}>
                          Mark Completed
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(rental)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteBooking(rental.rental_id)}>
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
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, displayedBookings.length)} of {displayedBookings.length} records
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

      {/* Book Driver modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Driver Booking' : 'Record Driver Booking'}
      >
        <form onSubmit={handleCreateBooking} className="space-y-4 text-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Driver *</label>
              <select
                required
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="">-- Select Driver --</option>
                {drivers
                  .filter((d) => d.status === 'available' || d.driver_id == driverId)
                  .map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      #{d.driver_id} - {d.name} ({d.status})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer *</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Booking Price (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              placeholder="e.g. 1200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pickup Date *</label>
              <input
                type="date"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pickup Time *</label>
              <input
                type="time"
                required
                value={pickupTimeInput}
                onChange={(e) => setPickupTimeInput(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expected Return Date *</label>
              <input
                type="date"
                required
                min={pickupDate}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expected Return Time *</label>
              <input
                type="time"
                required
                value={returnTimeInput}
                onChange={(e) => setReturnTimeInput(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Status *</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
            >
              <option value="unpaid" selected>Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
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

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Book Driver'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Bookings;
