import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Modal, Card } from '../../components/common/UI.jsx';
import { Plus, MapPin, UserCheck, AlertTriangle, CheckCircle, Clock, Search } from 'lucide-react';

const formatLicenceExpiry = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const [year, month] = parts;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  return monthNames[monthIdx] ? `${monthNames[monthIdx]} ${year}` : `${month}/${year}`;
};

export const Drivers = () => {
  const { showBanner } = useNotificationStore();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Register Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState(null);
  const [status, setStatus] = useState('available');
  const [name, setName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceClass, setLicenceClass] = useState('');
  const [licenceExpiry, setLicenceExpiry] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Assign Location Modal State
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [assignCity, setAssignCity] = useState('');
  const [assignZone, setAssignZone] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await API.get('/drivers');
      setDrivers(res.data.drivers);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedDriverForEdit(null);
    setName('');
    setLicenceNumber('');
    setLicenceClass('');
    setLicenceExpiry('');
    setHomeCity('');
    setCity('');
    setZone('');
    setStatus('available');
    setModalOpen(true);
  };

  const handleOpenEdit = (driver) => {
    setIsEditing(true);
    setSelectedDriverForEdit(driver);
    setName(driver.name);
    setLicenceNumber(driver.licence_number);
    setLicenceClass(driver.licence_class);
    setLicenceExpiry(driver.licence_expiry ? driver.licence_expiry.substring(0, 7) : '');
    setHomeCity(driver.home_city);
    setStatus(driver.status);
    setCity('');
    setZone('');
    setModalOpen(true);
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver? This will remove all their zoning allocations and booking availabilities.')) return;
    try {
      await API.delete(`/drivers/${id}`);
      fetchDrivers();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete driver', 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !licenceNumber || !licenceClass || !licenceExpiry || !homeCity) return;

    setSubmitting(true);
    try {
      const payload = {
        name,
        licence_number: licenceNumber,
        licence_class: licenceClass,
        licence_expiry: licenceExpiry.includes('-') && licenceExpiry.split('-').length === 2 ? `${licenceExpiry}-01` : licenceExpiry,
        home_city: homeCity,
      };
      if (isEditing) {
        payload.status = status;
      } else {
        payload.city = city || homeCity;
        payload.zone = zone || 'default';
      }

      if (isEditing && selectedDriverForEdit) {
        await API.patch(`/drivers/${selectedDriverForEdit.driver_id}`, payload);
      } else {
        await API.post('/drivers', payload);
      }

      setModalOpen(false);
      fetchDrivers();
      
      // Reset form
      setName('');
      setLicenceNumber('');
      setLicenceClass('');
      setLicenceExpiry('');
      setHomeCity('');
      setCity('');
      setZone('');
      setStatus('available');
      setIsEditing(false);
      setSelectedDriverForEdit(null);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save driver', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssign = (driver) => {
    setSelectedDriver(driver);
    setAssignCity(driver.home_city);
    setAssignZone('');
    setLocModalOpen(true);
  };

  const handleAssignLocation = async (e) => {
    e.preventDefault();
    if (!selectedDriver) return;

    setAssigning(true);
    try {
      await API.post(`/drivers/${selectedDriver.driver_id}/location`, {
        city: assignCity,
        zone: assignZone || 'default',
      });
      setLocModalOpen(false);
      fetchDrivers();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to assign location', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const searchedDrivers = drivers.filter(d => {
    const term = search.toLowerCase();
    return (
      d.driver_id.toString().includes(term) ||
      d.name.toLowerCase().includes(term) ||
      (d.licence_number || '').toLowerCase().includes(term) ||
      (d.home_city || '').toLowerCase().includes(term) ||
      d.status.toLowerCase().includes(term)
    );
  });

  const filteredDrivers = statusFilter === 'all'
    ? searchedDrivers
    : searchedDrivers.filter(d => d.status === statusFilter);

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentDrivers = filteredDrivers.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredDrivers.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
         
          <div className="relative">
            <input
              type="text"
              placeholder="Search driver ID, name, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </div>
        </div>
        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Register New Driver</span>
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Drivers</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{drivers.length}</h4>
          </div>
          <UserCheck size={24} className="text-slate-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Available</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">
              {drivers.filter(d => d.status === 'available').length}
            </h4>
          </div>
          <CheckCircle size={24} className="text-emerald-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Hires</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">
              {drivers.filter(d => d.status === 'booked').length}
            </h4>
          </div>
          <Clock size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expired Licences</span>
            <h4 className="text-2xl font-black text-rose-500 mt-1">
              {drivers.filter(d => new Date(d.licence_expiry) < new Date()).length}
            </h4>
          </div>
          <AlertTriangle size={24} className="text-rose-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: 'all', label: 'All Drivers' },
          { id: 'available', label: 'Available' },
          { id: 'assigned', label: 'Assigned' },
          { id: 'offline', label: 'Offline' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? drivers.length 
            : drivers.filter(d => d.status === tab.id).length;
          
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
      ) : drivers.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <UserCheck className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Drivers Registered</h4>
          <p className="text-slate-500 text-xs">Drivers added will appear in this registry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table variant="dark" headers={['Driver ID', 'Name', 'Licence details', 'Licence Expiry', 'Home City', 'Locations/Zones', 'Status', 'Actions']}>
            {currentDrivers.map((driver) => {
              const hasExpired = new Date(driver.licence_expiry) < new Date();
              
              return (
                <tr key={driver.driver_id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#SV-D-{driver.driver_id}</td>
                  <td className="px-6 py-4 font-bold text-slate-200">{driver.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-300">{driver.licence_number}</span>
                      <span className="text-xs text-slate-500">Class: {driver.licence_class}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <span>{formatLicenceExpiry(driver.licence_expiry)}</span>
                      {hasExpired && (
                        <Badge color="rose" className="flex items-center space-x-1 py-0 px-1.5">
                          <AlertTriangle size={10} />
                          <span>Expired</span>
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{driver.home_city}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {driver.locations && driver.locations.length > 0 ? (
                      driver.locations.map((loc) => (
                        <span key={loc.location_id} className="block">
                          {loc.city} ({loc.zone})
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-600">None assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={driver.status === 'available' ? 'green' : 'amber'}>
                      {driver.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenAssign(driver)}>
                        Assign Location
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(driver)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteDriver(driver.driver_id)}>
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
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, drivers.length)} of {drivers.length} records
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

      {/* Register modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Driver Profile' : 'Register New Driver Profile'}
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Licence Number</label>
              <input
                type="text"
                required
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="DL-XXXXXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Licence Class</label>
              <select
                required
                value={licenceClass}
                onChange={(e) => setLicenceClass(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="" disabled>Select Licence Class</option>
                <option value="LMV">LMV (Light Motor Vehicle)</option>
                <option value="HMV">HMV (Heavy Motor Vehicle)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Licence Expiry</label>
              <input
                type="month"
                required
                value={licenceExpiry}
                onChange={(e) => setLicenceExpiry(e.target.value)}
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Home City</label>
              <input
                type="text"
                required
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. Chennai"
              />
            </div>
          </div>

          {isEditing ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Driver Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          ) : (
            <div className="border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-400 block mb-3">Zoning Assignment (Optional)</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Operating City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                    placeholder="e.g. Chennai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Zone/Area</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                    placeholder="e.g. South Zone"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Driver'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign location modal */}
      <Modal
        isOpen={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        title={selectedDriver ? `Assign Location: ${selectedDriver.name}` : 'Assign Location'}
      >
        <form onSubmit={handleAssignLocation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Operating City</label>
            <input
              type="text"
              required
              value={assignCity}
              onChange={(e) => setAssignCity(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Operating Zone/Area</label>
            <input
              type="text"
              required
              value={assignZone}
              onChange={(e) => setAssignZone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              placeholder="e.g. West Zone"
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setLocModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={assigning}>
              {assigning ? 'Assigning...' : 'Assign Location'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default Drivers;
