import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Card, Modal } from '../../components/common/UI.jsx';
import { Users, FileText, CheckCircle, XCircle, Plus, Clock, Search } from 'lucide-react';

export const Customers = () => {
  const { showBanner } = useNotificationStore();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // KPI Calculations
  const totalCustomers = customers.length;
  const verifiedCustomers = customers.filter(c => c.verified).length;
  const pendingOtp = customers.filter(c => !c.verified).length;
  const kycSubmissions = customers.filter(c => c.documents && c.documents.length > 0).length;

  // Registration/Edit Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customerType, setCustomerType] = useState('buyer');
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleRegisterCustomer = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      showBanner('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && selectedCustomer) {
        await API.patch(`/admin/customers/${selectedCustomer.customer_id}`, {
          name,
          email,
          phone,
          customer_type: customerType,
          verified,
        });
      } else {
        await API.post('/admin/customers', {
          name,
          email,
          phone,
          customer_type: customerType,
        });
      }

      // Reset form states
      setName('');
      setEmail('');
      setPhone('');
      setCustomerType('buyer');
      setVerified(false);
      setIsEditing(false);
      setSelectedCustomer(null);
      setModalOpen(false);

      // Refresh list
      setVerified(false);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save customer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setCustomerType('buyer');
    setVerified(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setIsEditing(true);
    setSelectedCustomer(customer);
    setName(customer.name);
    setEmail(customer.email);
    setPhone(customer.phone);
    setCustomerType(customer.customer_type);
    setVerified(customer.verified);
    setModalOpen(true);
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer? All linked documents, referrals, bookings will be deleted.')) return;
    try {
      await API.delete(`/admin/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete customer', 'error');
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/customers');
      setCustomers(res.data.customers);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDoc = async (docId, status) => {
    if (!window.confirm(`Are you sure you want to mark this document as ${status}?`)) return;
    try {
      await API.post(`/admin/customers/verify-document/${docId}`, { status });
      fetchCustomers();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to update document status', 'error');
    }
  };

  const searchedCustomers = customers.filter(c => {
    const term = search.toLowerCase();
    return (
      c.customer_id.toString().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      c.customer_type.toLowerCase().includes(term)
    );
  });

  const filteredCustomers = statusFilter === 'all'
    ? searchedCustomers
    : searchedCustomers.filter(c => c.customer_type === statusFilter);

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredCustomers.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>

          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search customer ID, name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </div>
        </div>
        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Registry</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{totalCustomers}</h4>
          </div>
          <Users size={24} className="text-slate-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Verified Accounts</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">{verifiedCustomers}</h4>
          </div>
          <CheckCircle size={24} className="text-emerald-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending OTP</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">{pendingOtp}</h4>
          </div>
          <Clock size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">KYC Submissions</span>
            <h4 className="text-2xl font-black text-purple-500 mt-1">{kycSubmissions}</h4>
          </div>
          <FileText size={24} className="text-purple-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: 'all', label: 'All Customers' },
          { id: 'buyer', label: 'Buyers' },
          { id: 'lender', label: 'Lenders' },
          { id: 'both', label: 'Both' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? customers.length 
            : customers.filter(c => c.customer_type === tab.id).length;
          
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
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <Users className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Customers Found</h4>
          <p className="text-slate-500 text-xs">Customer profiles appear here upon signup.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table variant="dark" headers={['Customer ID', 'Name / Phone', 'Email', 'User Type', 'KYC Documents status', 'Registry Status', 'Actions']}>
            {currentCustomers.map((customer) => (
              <tr key={customer.customer_id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60">
                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#SV-C-{customer.customer_id}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">{customer.name}</span>
                    <span className="text-xs text-slate-500">{customer.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-300 text-sm">{customer.email}</td>
                <td className="px-6 py-4 capitalize text-slate-350 text-sm">{customer.customer_type}</td>
                <td className="px-6 py-4">
                  {customer.documents && customer.documents.length > 0 ? (
                    <div className="flex flex-col space-y-1.5 max-w-[200px]">
                      {customer.documents.map((doc) => (
                        <div key={doc.doc_id} className="flex justify-between items-center text-[10px] bg-slate-900 border border-slate-850 p-1.5 rounded-lg">
                          <span className="font-bold text-slate-300 truncate mr-2">{doc.doc_type}</span>
                          {doc.status === 'pending' ? (
                            <div className="flex items-center space-x-1">
                              <button onClick={() => handleVerifyDoc(doc.doc_id, 'approved')} className="text-emerald-500 hover:text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-900/40">✓ Approve</button>
                              <button onClick={() => handleVerifyDoc(doc.doc_id, 'rejected')} className="text-rose-500 hover:text-rose-400 font-bold bg-rose-950/20 px-1 py-0.5 rounded border border-rose-900/40">✗ Reject</button>
                            </div>
                          ) : (
                            <Badge color={doc.status === 'approved' ? 'green' : 'rose'} className="text-[10px] py-0">
                              {doc.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">No documents submitted</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge color={customer.verified ? 'green' : 'amber'}>
                    {customer.verified ? 'Verified' : 'Pending OTP'}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(customer)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteCustomer(customer.customer_id)}>
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
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, customers.length)} of {customers.length} records
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

      {/* Register Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Customer Profile' : 'Register New Customer'}
      >
        <form onSubmit={handleRegisterCustomer} className="space-y-4 text-slate-800">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              placeholder="e.g. john@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Phone Number *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              placeholder="e.g. +919876543210"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Customer Type *</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="buyer">Buyer</option>
                <option value="lender">Lender</option>
                <option value="both">Both</option>
              </select>
            </div>
            {isEditing && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Verification Status *</label>
                <select
                  value={verified ? 'true' : 'false'}
                  onChange={(e) => setVerified(e.target.value === 'true')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                >
                  <option value="true">Verified</option>
                  <option value="false">Pending OTP</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Customers;
