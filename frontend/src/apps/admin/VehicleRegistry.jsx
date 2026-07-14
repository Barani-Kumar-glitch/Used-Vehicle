import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Spinner, Table, Badge, Button, Modal, Card } from '../../components/common/UI.jsx';
import { Plus, Search, Car, HelpCircle, ShieldAlert, Tag, Calendar, Clock } from 'lucide-react';

const getPhotoArray = (urlField) => {
  if (!urlField) return [];
  if (urlField.startsWith('[')) {
    try {
      return JSON.parse(urlField);
    } catch (err) {
      return [];
    }
  }
  return [urlField];
};

export const VehicleRegistry = () => {
  const { showBanner } = useNotificationStore();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Registration Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [status, setStatus] = useState('available');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [transmission, setTransmission] = useState('Automatic');
  const [location, setLocation] = useState('');
  const [listingMode, setListingMode] = useState('sale');
  const [photoUrls, setPhotoUrls] = useState([]);
  const [price, setPrice] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [driverHourlyRate, setDriverHourlyRate] = useState('');
  const [driverDailyRate, setDriverDailyRate] = useState('');
  const [kmDriven, setKmDriven] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    const newFiles = files.filter(file => {
      const isImg = file.type.startsWith('image/');
      if (!isImg) {
        showBanner('Please upload image files only', 'error');
      }
      return isImg;
    });

    if (photoUrls.length + newFiles.length > 6) {
      showBanner('You can upload a maximum of 6 photos', 'error');
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = newFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('photo', file);
        const res = await API.post('/vehicles/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data.photoUrl;
      });
      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotoUrls(prev => [...prev, ...uploadedUrls]);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await API.get('/vehicles', {
        params: { status: 'all' }
      });
      setVehicles(res.data.vehicles);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegister = () => {
    setIsEditing(false);
    setSelectedVehicle(null);
    setMake('');
    setModel('');
    setYear('');
    setFuelType('Petrol');
    setTransmission('Automatic');
    setLocation('');
    setListingMode('sale');
    setPhotoUrls([]);
    setPrice('');
    setHourlyRate('');
    setDailyRate('');
    setDriverHourlyRate('');
    setDriverDailyRate('');
    setKmDriven('');
    setStatus('available');
    setModalOpen(true);
  };

  const handleOpenEdit = (car) => {
    setIsEditing(true);
    setSelectedVehicle(car);
    setMake(car.make);
    setModel(car.model);
    setYear(car.year);
    setFuelType(car.fuel_type);
    setTransmission(car.transmission);
    setLocation(car.location);
    setListingMode(car.listing_mode);
    setPhotoUrls(getPhotoArray(car.photo_url));
    setKmDriven(car.km_driven !== undefined && car.km_driven !== null ? car.km_driven.toString() : '');
    setStatus(car.status);
    
    // Pricing
    const activePrice = car.prices && car.prices[0];
    setPrice(activePrice ? activePrice.price || '' : '');
    setHourlyRate(car.rate_per_hour || car.hourly_rate || '');
    setDailyRate(car.rate_per_day || car.daily_rate || '');
    setDriverHourlyRate(activePrice ? activePrice.driver_hourly_rate || '' : '');
    setDriverDailyRate(activePrice ? activePrice.driver_daily_rate || '' : '');
    
    setModalOpen(true);
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle? All linked rental agreements and listings will be deleted.')) return;
    try {
      await API.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete vehicle', 'error');
    }
  };

  const handleRegisterVehicle = async (e) => {
    e.preventDefault();
    if (!make || !model || !year || !location || kmDriven === '') {
      showBanner('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        make,
        model,
        year: parseInt(year, 10),
        fuel_type: fuelType,
        transmission,
        location,
        listing_mode: listingMode,
        photo_url: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null,
        km_driven: parseInt(kmDriven, 10),
      };

      if (listingMode === 'sale' || listingMode === 'both') {
        payload.price = parseFloat(price) || null;
      }
      if (listingMode === 'rental' || listingMode === 'both') {
        payload.hourly_rate = parseFloat(hourlyRate) || null;
        payload.daily_rate = parseFloat(dailyRate) || null;
        payload.driver_hourly_rate = driverHourlyRate ? parseFloat(driverHourlyRate) : null;
        payload.driver_daily_rate = driverDailyRate ? parseFloat(driverDailyRate) : null;
      }
      if (isEditing) {
        payload.status = status;
      }

      if (isEditing && selectedVehicle) {
        await API.patch(`/vehicles/${selectedVehicle.vehicle_id}`, payload);
      } else {
        await API.post('/vehicles', payload);
      }
      
      // Reset form states
      setMake('');
      setModel('');
      setYear('');
      setFuelType('Petrol');
      setTransmission('Automatic');
      setLocation('');
      setListingMode('sale');
      setPhotoUrls([]);
      setPrice('');
      setHourlyRate('');
      setDailyRate('');
      setDriverHourlyRate('');
      setDriverDailyRate('');
      setKmDriven('');
      setStatus('available');
      setIsEditing(false);
      setSelectedVehicle(null);
      
      setModalOpen(false);
      fetchVehicles();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to save vehicle', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const searchedVehicles = vehicles.filter(v => {
    const term = search.toLowerCase();
    return (
      v.vehicle_id.toString().includes(term) ||
      v.make.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.location.toLowerCase().includes(term) ||
      v.status.toLowerCase().includes(term) ||
      v.listing_mode.toLowerCase().includes(term)
    );
  });

  const filteredVehicles = statusFilter === 'all'
    ? searchedVehicles
    : searchedVehicles.filter(v => v.status === statusFilter);

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentVehicles = filteredVehicles.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredVehicles.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'green';
      case 'rented': return 'blue';
      case 'sold': return 'gray';
      case 'delisted': return 'rose';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search make, model, status, mode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          </div>
        </div>
        
        <Button variant="primary" onClick={handleOpenRegister}>
          <Plus size={16} className="mr-1.5" />
          <span>Register Vehicle</span>
        </Button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Fleet</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{vehicles.length}</h4>
          </div>
          <Car size={24} className="text-slate-600" />  
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">For Sale</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">
              {vehicles.filter(v => (v.listing_mode === 'sale' || v.listing_mode === 'both') && v.status === 'available').length}
            </h4>
          </div>
          <Tag size={24} className="text-emerald-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">For Rent</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">
              {vehicles.filter(v => (v.listing_mode === 'rental' || v.listing_mode === 'both') && v.status === 'available').length}
            </h4>
          </div>
          <Calendar size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sold / Rented</span>
            <h4 className="text-2xl font-black text-purple-500 mt-1">
              {vehicles.filter(v => v.status === 'sold' || v.status === 'rented').length}
            </h4>
          </div>
          <Clock size={24} className="text-purple-600" />
        </Card>
      </div>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: 'all', label: 'All Vehicles' },
          { id: 'available', label: 'Available' },
          { id: 'rented', label: 'Rented' },
          { id: 'sold', label: 'Sold' },
          { id: 'maintenance', label: 'Maintenance' }
        ].map(tab => {
          const count = tab.id === 'all' 
            ? vehicles.length 
            : vehicles.filter(v => v.status === tab.id).length;
          
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
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <Car className="mx-auto text-slate-700 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Registered Vehicles Found</h4>
          <p className="text-slate-500 text-xs">Register new vehicles using the button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Table variant="dark" headers={['Vehicle ID', 'Preview', 'Details', 'Location', 'Listing Mode', 'Status', 'Pricing & Rates', 'Actions']}>
            {currentVehicles.map((car) => {
              const activePrice = car.prices && car.prices[0];
              const priceValue = activePrice ? activePrice.price : null;
              
              return (
                <tr key={car.vehicle_id} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/60">
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#VEH-{car.vehicle_id}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      const photos = getPhotoArray(car.photo_url);
                      return photos.length > 0 ? (
                        <img
                          src={photos[0].startsWith('http') ? photos[0] : `http://localhost:5000${photos[0]}`}
                          alt={`${car.make} ${car.model}`}
                          className="w-12 h-10 object-cover rounded-lg border border-slate-800 bg-slate-900"
                        />
                      ) : (
                        <div className="w-12 h-10 flex items-center justify-center bg-slate-900 rounded-lg border border-slate-800 text-slate-600 text-lg">
                          🚗
                        </div>
                      );
                    })()}
                  </td>
                   <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200">{car.make} {car.model}</span>
                      <span className="text-xs text-slate-500">
                        {car.year} • {car.fuel_type} • {car.transmission}
                        {car.km_driven !== undefined && car.km_driven !== null && ` • ${car.km_driven}km`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">{car.location}</td>
                  <td className="px-6 py-4 text-sm font-semibold capitalize text-slate-300">
                    <Badge color={car.listing_mode === 'both' ? 'purple' : car.listing_mode === 'sale' ? 'green' : 'blue'}>
                      {car.listing_mode}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge color={getStatusColor(car.status)}>
                      {car.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    <div className="flex flex-col space-y-1">
                      {(car.listing_mode === 'sale' || car.listing_mode === 'both') && (
                        <span className="text-slate-200">
                          <span className="font-semibold text-slate-500">Sale:</span> ₹{priceValue ? parseFloat(priceValue).toLocaleString('en-IN') : 'N/A'}
                        </span>
                      )}
                      {(car.listing_mode === 'rental' || car.listing_mode === 'both') && (
                        <span className="text-slate-250">
                          <span className="font-semibold text-slate-500">Rent:</span> ₹{car.rate_per_hour}/hr • ₹{car.rate_per_day}/day
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" size="sm" onClick={() => handleOpenEdit(car)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteVehicle(car.vehicle_id)}>
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
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredVehicles.length)} of {filteredVehicles.length} records
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

      {/* Register Vehicle Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
      >
        <form onSubmit={handleRegisterVehicle} className="space-y-4 text-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Make *</label>
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. Toyota"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Model *</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. Camry"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Year *</label>
              <input
                type="number"
                min="0"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. 2023"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fuel Type *</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Transmission *</label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Location (City) *</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. Chennai"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Listing Mode *</label>
              <select
                value={listingMode}
                onChange={(e) => setListingMode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="sale">For Sale Only</option>
                <option value="rental">For Rent Only</option>
                <option value="both">Both (Sale & Rent)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Distance Driven *</label>
              <input
                type="number"
                min="0"
                required
                value={kmDriven}
                onChange={(e) => setKmDriven(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. 35000 kms"
              />
            </div>
          </div>

          {isEditing && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Vehicle Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="sold">Sold</option>
                <option value="delisted">Delisted</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Upload Photos (Max 6, Optional)</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label
                  htmlFor="photo-upload-input"
                  className="flex items-center justify-center px-4 py-2.5 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-sm font-semibold text-slate-700 transition-colors"
                >
                  {uploading ? (
                    <span className="flex items-center space-x-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-transparent"></span>
                      <span>Uploading...</span>
                    </span>
                  ) : (
                    <span>Choose Image Files</span>
                  )}
                </label>
                <input
                  type="file"
                  id="photo-upload-input"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                  multiple
                />
              </div>

              {photoUrls.length > 0 && (
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {photoUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center group shadow-sm">
                      <img
                        src={url.startsWith('http') ? url : `http://localhost:5000${url}`}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotoUrls(photoUrls.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-rose-600 text-xs font-bold shadow-md"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(listingMode === 'sale' || listingMode === 'both') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sale Price (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                placeholder="e.g. 850000"
              />
            </div>
          )}

          {(listingMode === 'rental' || listingMode === 'both') && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <span className="block text-xs font-bold text-slate-705 uppercase tracking-wider">Rental Rate Details *</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hourly Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                    placeholder="e.g. 350"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Daily Rate (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                    placeholder="e.g. 2800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Driver Hourly Rate (₹, Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={driverHourlyRate}
                    onChange={(e) => setDriverHourlyRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                    placeholder="e.g. 150"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Driver Daily Rate (₹, Optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={driverDailyRate}
                    onChange={(e) => setDriverDailyRate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                    placeholder="e.g. 1200"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default VehicleRegistry;
