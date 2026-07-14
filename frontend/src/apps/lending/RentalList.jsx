import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Spinner, Card, Badge, Button, Modal } from '../../components/common/UI.jsx';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { 
  Calendar, MapPin, Fuel, ArrowRight, ShieldCheck, 
  Clock, Search, Sparkles, AlertTriangle, Play, 
  HelpCircle, User, Info, Check 
} from 'lucide-react';

const VehicleImageSlider = ({ photoUrl, altText }) => {
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

  const photos = getPhotoArray(photoUrl);
  const [currentIdx, setCurrentIdx] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-350 text-4xl bg-gradient-to-br from-slate-100 to-slate-200">
        🚗
      </div>
    );
  }

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full h-full overflow-hidden group">
      {/* Images container for sliding effect */}
      <div
        className="flex w-full h-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIdx * 100}%)` }}
      >
        {photos.map((url, index) => (
          <img
            key={index}
            src={url.startsWith('http') ? url : `http://localhost:5000${url}`}
            alt={`${altText} - ${index + 1}`}
            className="w-full h-full object-cover flex-shrink-0"
          />
        ))}
      </div>

      {/* Navigation Chevrons */}
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-205 focus:outline-none z-20 text-xs font-black shadow-md"
          >
            ❮
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-205 focus:outline-none z-20 text-xs font-black shadow-md"
          >
            ❯
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 z-20">
            {photos.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrentIdx(idx); }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${currentIdx === idx ? 'bg-white w-3' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const RentalList = () => {
  const { showToast } = useNotificationStore();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { customer } = useAuthStore();
  const navigate = useNavigate();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [transmissionFilter, setTransmissionFilter] = useState('');

  // Booking Modal State
  const [bookingModalOpen, setShareModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [driverRequested, setDriverRequested] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Separate date/time inputs for starting and ending
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  // Extension Modal State
  const [activeRentals, setActiveRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [fetchRentalsLoading, setFetchRentalsLoading] = useState(false);
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionTime, setExtensionTime] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionCost, setExtensionCost] = useState(0);
  const [extensionSuccess, setExtensionSuccess] = useState(false);
  const [extensionLoading, setExtensionLoading] = useState(false);

  // Combine separate date/time inputs into combined ISO strings
  useEffect(() => {
    if (startDate && startTimeInput) {
      setStartTime(`${startDate}T${startTimeInput}`);
    } else {
      setStartTime('');
    }
  }, [startDate, startTimeInput]);

  useEffect(() => {
    if (endDate && endTimeInput) {
      setEndTime(`${endDate}T${endTimeInput}`);
    } else {
      setEndTime('');
    }
  }, [endDate, endTimeInput]);

  useEffect(() => {
    fetchRentalVehicles();
  }, [fuelFilter, locationFilter, transmissionFilter]);

  useEffect(() => {
    calculateEstimate();
  }, [startTime, endTime, selectedVehicle, driverRequested]);

  // Active Rental Progress helper
  const getProgressPercent = (pickup, expected) => {
    const start = new Date(pickup).getTime();
    const end = new Date(expected).getTime();
    const now = new Date().getTime();
    if (end <= start) return 0;
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  // Extension cost calculation
  const calculateExtensionEstimate = () => {
    if (!selectedRental || !extensionDate || !extensionTime) {
      setExtensionCost(0);
      return;
    }
    const oldReturn = new Date(selectedRental.expected_return_time);
    const newReturn = new Date(`${extensionDate}T${extensionTime}`);
    if (isNaN(oldReturn) || isNaN(newReturn) || newReturn <= oldReturn) {
      setExtensionCost(0);
      return;
    }

    const vehicle = selectedRental.Vehicle;
    const diffMs = Math.abs(newReturn - oldReturn);
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let cost = 0;
    if (vehicle) {
      const ratePerHour = vehicle.rate_per_hour;
      const ratePerDay = vehicle.rate_per_day;
      if (diffHours < 24 && ratePerHour != null) {
        cost = diffHours * parseFloat(ratePerHour);
      } else if (ratePerDay != null) {
        cost = diffDays * parseFloat(ratePerDay);
      }

      if (selectedRental.driver_id) {
        if (diffHours < 24) {
          cost += diffHours * 150;
        } else {
          cost += diffDays * 1200;
        }
      }
    } else if (selectedRental.driver_id) {
      // Driver only booking
      if (diffHours < 24) {
        cost = diffHours * 150;
      } else {
        cost = diffDays * 1200;
      }
    }

    setExtensionCost(cost);
  };

  useEffect(() => {
    calculateExtensionEstimate();
  }, [selectedRental, extensionDate, extensionTime]);

  const fetchActiveRentals = async () => {
    if (!customer) return;
    setFetchRentalsLoading(true);
    try {
      const res = await API.get('/orders/rental');
      const allRentals = res.data.rentals || [];
      const active = allRentals.filter(r => r.actual_return_time === null);
      const history = allRentals.filter(r => r.actual_return_time !== null);
      setActiveRentals(active);
      setRentalHistory(history);
    } catch (err) {
      console.error('Failed to fetch active rentals:', err);
    } finally {
      setFetchRentalsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRentals();
  }, [customer]);

  const handleExtensionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRental || !extensionDate || !extensionTime || extensionCost <= 0) return;

    setExtensionLoading(true);
    try {
      const newReturnStr = `${extensionDate}T${extensionTime}`;
      const formatLocalISO = (dateInput) => {
        const d = new Date(dateInput);
        if (isNaN(d)) return '';
        const pad = (num) => String(num).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      await API.post('/requests', {
        vehicle_id: selectedRental.vehicle_id,
        driver_id: selectedRental.driver_id || null,
        request_type: 'extension',
        referral_code: selectedRental.rental_id.toString(),
        details: `Rental extension request for Booking #VEH-RENT-${selectedRental.rental_id} to extend from ${formatLocalISO(selectedRental.expected_return_time)} to ${formatLocalISO(newReturnStr)}. Reason: ${extensionReason || 'Not specified'}. Estimated extra cost: ₹${extensionCost}`
      });
      setExtensionSuccess(true);
      setTimeout(() => {
        setExtensionModalOpen(false);
        setExtensionSuccess(false);
        fetchActiveRentals();
      }, 2000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit extension request', 'error');
    } finally {
      setExtensionLoading(false);
    }
  };

  const fetchRentalVehicles = async () => {
    setLoading(true);
    try {
      const params = {
        listing_mode: 'rental',
        status: 'available',
      };
      if (fuelFilter) params.fuel_type = fuelFilter;
      if (locationFilter) params.location = locationFilter;
      if (transmissionFilter) params.transmission = transmissionFilter;
      if (search.trim()) params.search = search;

      const res = await API.get('/vehicles', { params });
      setVehicles(res.data.vehicles);
    } catch (err) {
      console.error('Failed to fetch rental vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRentalVehicles();
  };

  const calculateEstimate = () => {
    if (!startTime || !endTime || !selectedVehicle) {
      setEstimatedCost(0);
      setCalculatedHours(0);
      setCalculatedDays(0);
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start) || isNaN(end) || end <= start) {
      setEstimatedCost(0);
      setCalculatedHours(0);
      setCalculatedDays(0);
      return;
    }

    const ratePerHour = selectedVehicle.rate_per_hour;
    const ratePerDay = selectedVehicle.rate_per_day;
    if (ratePerHour == null && ratePerDay == null) {
      setEstimatedCost(0);
      setCalculatedHours(0);
      setCalculatedDays(0);
      return;
    }

    const diffMs = Math.abs(end - start);
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    setCalculatedHours(diffHours);
    setCalculatedDays(diffDays);

    let cost = 0;
    if (diffHours < 24 && ratePerHour != null) {
      cost = diffHours * parseFloat(ratePerHour);
    } else if (ratePerDay != null) {
      cost = diffDays * parseFloat(ratePerDay);
    }

    // Optional driver charge
    if (driverRequested) {
      if (diffHours < 24) {
        cost += diffHours * 150;
      } else {
        cost += diffDays * 1200;
      }
    }

    setEstimatedCost(cost);
  };

  const handleOpenBooking = (vehicle) => {
    if (!customer) {
      navigate(`/login?redirect=${encodeURIComponent('/rent')}`);
      return;
    }
    setSelectedVehicle(vehicle);
    setStartDate('');
    setStartTimeInput('');
    setEndDate('');
    setEndTimeInput('');
    setStartTime('');
    setEndTime('');
    setEstimatedCost(0);
    setCalculatedHours(0);
    setCalculatedDays(0);
    setShareModalOpen(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime || estimatedCost <= 0) return;

    setBookingLoading(true);
    try {
      await API.post('/requests', {
        vehicle_id: selectedVehicle.vehicle_id,
        request_type: 'rent',
        details: `Lending rental request from ${startTime} to ${endTime}. Includes driver: ${driverRequested ? 'Yes' : 'No'}. Total estimated cost: ₹${estimatedCost}`
      });
      setBookingSuccess(true);
      setShareModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit rental request', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Banner Section */}
      <div className="relative bg-gradient-to-br from-brand-900 via-brand-950 to-slate-900 rounded-3xl p-8 md:p-14 text-white overflow-hidden shadow-xl border border-brand-850">
        <div className="absolute top-0 right-0 w-[45%] h-[60%] bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-3xl">
          <Badge color="blue" className="mb-6 bg-brand-500/20 text-brand-200 border-none px-3.5 py-1.5 text-xs font-bold tracking-wider uppercase">
            Premium Renting & Lending
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-none">
            Premium Vehicles, <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Flexible Rates</span>
          </h1>
          <p className="text-slate-350 text-base md:text-lg mb-8 leading-relaxed max-w-xl">
            Book verified pre-owned vehicles on standard hourly or daily pricing tiers. Secure immediate driver mapping and flexible duration extensions.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-lg focus-within:border-blue-500/50 transition-all duration-300 shadow-lg">
            <div className="relative flex-grow flex items-center">
              <Search className="absolute left-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search rentals by brand, model, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-450 text-sm focus:outline-none"
              />
            </div>
            <Button variant="accent" type="submit" size="md" className="py-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:scale-[1.02] transition-all">
              Search Cars
            </Button>
          </form>
        </div>
      </div>

      {/* Active & Overdue Rentals - Redesigned as Live Timelines */}
      {customer && activeRentals.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2.5">
                <span className="p-1 bg-rose-50 text-rose-500 rounded-lg animate-pulse">🕒</span> My Active & Overdue Rentals
              </h3>
              <p className="text-xs text-slate-400 mt-1">Real-time tracker of vehicles currently lent out to you</p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
              {activeRentals.length} active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeRentals.map((booking) => {
              const isOverdue = new Date(booking.expected_return_time) < new Date();
              const car = booking.Vehicle;
              const driver = booking.Driver;
              const progress = getProgressPercent(booking.pickup_time, booking.expected_return_time);

              return (
                <div
                  key={booking.rental_id}
                  className={`p-5 rounded-2xl border transition-all duration-350 flex flex-col justify-between ${
                    isOverdue
                      ? 'border-red-150 bg-red-50/10 shadow-md ring-1 ring-red-400/15'
                      : 'border-slate-150 bg-slate-50/10'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-inner">
                          🚗
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 truncate max-w-[150px]">
                            {car ? `${car.make} ${car.model}` : 'Rental Car'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">#VEH-RENT-{booking.rental_id}</span>
                        </div>
                      </div>
                      <Badge color={isOverdue ? 'rose' : 'blue'} className="text-[9px] font-black tracking-wider px-2 py-0.5 rounded animate-pulse">
                        {isOverdue ? '⚠️ OVERDUE' : 'ONGOING'}
                      </Badge>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase">
                        <span>Lent time elapsed</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isOverdue ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`} 
                          style={{ width: `${progress}%` }} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-650 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold uppercase text-[9px]">Lent Start</span>
                        <span className="font-bold text-slate-700">{new Date(booking.pickup_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold uppercase text-[9px]">Return Scheduled</span>
                        <span className={`font-bold ${isOverdue ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                          {new Date(booking.expected_return_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      {driver && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-semibold uppercase text-[9px]">Mapped Driver</span>
                          <span className="font-bold text-slate-700">{driver.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Lent Charge</span>
                      <div className="text-sm font-black text-slate-800">₹{parseFloat(booking.price).toLocaleString('en-IN')}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={isOverdue ? 'danger' : 'secondary'}
                      className="text-xs font-bold py-2 rounded-xl"
                      onClick={() => {
                        setSelectedRental(booking);
                        setExtensionDate('');
                        setExtensionTime('');
                        setExtensionReason('');
                        setExtensionCost(0);
                        setExtensionModalOpen(true);
                      }}
                    >
                      Extend Lent Period
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rental Catalog & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Filters */}
        <aside className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Filter Inventory</h3>
              <button 
                onClick={() => {
                  setFuelFilter('');
                  setTransmissionFilter('');
                  setLocationFilter('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Reset
              </button>
            </div>

            {/* Custom Interactive Chips for Fuel Type */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Fuel Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '', label: 'All Fuel' },
                  { value: 'Petrol', label: 'Petrol' },
                  { value: 'Diesel', label: 'Diesel' },
                  { value: 'Electric', label: 'Electric' },
                  { value: 'Hybrid', label: 'Hybrid' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFuelFilter(opt.value)}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-xl border text-center transition-all duration-200 ${
                      fuelFilter === opt.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transmission Chips */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Transmission</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '', label: 'All' },
                  { value: 'Manual', label: 'Manual' },
                  { value: 'Automatic', label: 'Auto' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTransmissionFilter(opt.value)}
                    className={`px-2.5 py-2 text-xs font-semibold rounded-xl border text-center transition-all duration-200 ${
                      transmissionFilter === opt.value
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* City Location filter */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Location (City)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. Chennai"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Listings Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Spinner size="lg" />
              <span className="text-slate-400 text-sm font-semibold">Scanning available rentals...</span>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto space-y-4">
              <Calendar className="mx-auto text-slate-350" size={48} />
              <h3 className="text-xl font-bold text-slate-700">No Rental Listings</h3>
              <p className="text-slate-400 text-sm">We couldn't locate any rental vehicles matching your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((car) => {
                return (
                  <Card key={car.vehicle_id} className="flex flex-col h-full bg-white border border-slate-100 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 rounded-2xl overflow-hidden glow-hover">
                    <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden">
                      <VehicleImageSlider photoUrl={car.photo_url} altText={`${car.year} ${car.make}`} />
                      <Badge color="blue" className="absolute top-3 left-3 bg-blue-600 text-white border-none font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm">
                        Lending Available
                      </Badge>
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                        {car.fuel_type} • {car.transmission}
                      </div>
                      
                      <h4 className="text-lg font-black text-slate-800 line-clamp-1 mb-3">
                        {car.make} {car.model}
                      </h4>

                      <div className="flex items-center space-x-3 text-xs text-slate-500 mb-5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-1">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{car.location}</span>
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Rental Rates</span>
                          <span className="text-xs font-black text-slate-800">
                            ₹{car.rate_per_hour}/hr • ₹{car.rate_per_day}/day
                          </span>
                        </div>
                        <Button variant="primary" size="sm" className="font-bold rounded-xl" onClick={() => handleOpenBooking(car)}>
                          Lend Now
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking Dialog Modal */}
      <Modal
        isOpen={bookingModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={selectedVehicle ? `Rent ${selectedVehicle.make} ${selectedVehicle.model}` : 'Book Vehicle'}
      >
        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pickup Date</label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pickup Time</label>
              <input
                type="time"
                required
                value={startTimeInput}
                onChange={(e) => setStartTimeInput(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expected Return Date</label>
              <input
                type="date"
                required
                min={startDate || new Date().toISOString().split('T')[0]}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Return Time</label>
              <input
                type="time"
                required
                value={endTimeInput}
                onChange={(e) => setEndTimeInput(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {selectedVehicle?.prices?.[0]?.driver_daily_rate && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700">Need a Mapped Driver?</span>
                <span className="text-[10px] text-slate-400">
                  Adds ₹{selectedVehicle.prices[0].driver_hourly_rate}/hr or ₹{selectedVehicle.prices[0].driver_daily_rate}/day
                </span>
              </div>
              <input
                type="checkbox"
                checked={driverRequested}
                onChange={(e) => setDriverRequested(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Interactive Visual Calculator breakdown summary */}
          {estimatedCost > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-blue-900 font-bold text-sm">
                <span>Calculated Lent Duration</span>
                <span>
                  {calculatedHours < 24 ? `${calculatedHours} Hours` : `${calculatedDays} Days`}
                </span>
              </div>
              <div className="text-[10px] text-blue-600 leading-normal border-t border-blue-200/50 pt-2 flex flex-col space-y-1">
                <div className="flex justify-between">
                  <span>Vehicle Rate</span>
                  <span>
                    {calculatedHours < 24 
                      ? `${calculatedHours} hr × ₹${selectedVehicle.rate_per_hour}` 
                      : `${calculatedDays} day × ₹${selectedVehicle.rate_per_day}`}
                  </span>
                </div>
                {driverRequested && (
                  <div className="flex justify-between">
                    <span>Professional Driver Fee</span>
                    <span>
                      {calculatedHours < 24 
                        ? `${calculatedHours} hr × ₹${selectedVehicle.prices[0].driver_hourly_rate}` 
                        : `${calculatedDays} day × ₹${selectedVehicle.prices[0].driver_daily_rate}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-blue-200/50 flex justify-between items-center text-blue-950">
                <span className="text-xs font-bold uppercase">Estimated Lent Total</span>
                <span className="text-xl font-black">₹{estimatedCost.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShareModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={bookingLoading || estimatedCost <= 0}>
              {bookingLoading ? 'Submitting request...' : 'Confirm Rental Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Booking Success Modal */}
      <Modal
        isOpen={bookingSuccess}
        onClose={() => setBookingSuccess(false)}
        title="Rental Request Logged!"
        footer={<Button variant="primary" onClick={() => setBookingSuccess(false)}>Done</Button>}
      >
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Lending Request Logged</h3>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
            Your request to rent the vehicle has been logged. An administrator will verify availability and assign a driver if requested.
          </p>
        </div>
      </Modal>

      {/* Extension Modal */}
      {extensionModalOpen && selectedRental && (
        <Modal
          isOpen={extensionModalOpen}
          onClose={() => setExtensionModalOpen(false)}
          title="Request Rental Extension"
        >
          {extensionSuccess ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce">
                ✓
              </div>
              <h3 className="text-xl font-bold text-slate-800">Extension Request Submitted!</h3>
              <p className="text-sm text-slate-500">
                Your extension request has been logged. Admin will review and approve it shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleExtensionSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Booking Details</div>
                <div className="text-sm font-bold text-slate-800">
                  {selectedRental.Vehicle ? `${selectedRental.Vehicle.year} ${selectedRental.Vehicle.make} ${selectedRental.Vehicle.model}` : 'Driver Only Booking'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                  <div>
                    <span className="font-semibold text-slate-400 block">PICKUP TIME</span>
                    {new Date(selectedRental.pickup_time).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block">EXPECTED RETURN</span>
                    {new Date(selectedRental.expected_return_time).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Return Date *</label>
                  <input
                    type="date"
                    required
                    min={new Date(selectedRental.expected_return_time).toISOString().split('T')[0]}
                    value={extensionDate}
                    onChange={(e) => setExtensionDate(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                    onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Return Time *</label>
                  <input
                    type="time"
                    required
                    value={extensionTime}
                    onChange={(e) => setExtensionTime(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                    onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reason for Extension (Optional)</label>
                <textarea
                  placeholder="e.g. Flight delayed, business extension..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none min-h-[80px]"
                />
              </div>

              {extensionCost > 0 && (
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-2xl flex items-center justify-between animate-fadeIn">
                  <div>
                    <h5 className="text-xs text-brand-600 font-bold uppercase tracking-wider">Estimated Extra Cost</h5>
                    <p className="text-xs text-brand-500 mt-0.5">Based on the additional hours/days requested</p>
                  </div>
                  <div className="text-2xl font-black text-brand-800">
                    ₹{extensionCost}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setExtensionModalOpen(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={extensionLoading || extensionCost <= 0}
                >
                  {extensionLoading ? 'Submitting...' : 'Submit Extension Request'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Completed History Section */}
      {customer && rentalHistory.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <span>📜</span> My Completed Rental History
            </h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
              {rentalHistory.length} orders
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rentalHistory.map((booking) => {
              const car = booking.Vehicle;
              const driver = booking.Driver;

              return (
                <div
                  key={booking.rental_id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/10 hover:bg-slate-50/30 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-inner flex-shrink-0">
                      {car ? '🚗' : '👨‍✈️'}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {car ? `${car.make} ${car.model}` : driver ? `Driver: ${driver.name}` : 'Driver Booking'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        Booking #VEH-RENT-{booking.rental_id}
                      </p>

                      <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-400">Pickup: </span>
                          <span>{new Date(booking.pickup_time).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-400">Returned: </span>
                          <span>{new Date(booking.expected_return_time).toLocaleDateString('en-IN')}</span>
                        </div>
                        <div className="pt-1 font-bold text-slate-700">
                          Charged: ₹{parseFloat(booking.price).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="mt-3">
                        <Badge color="green" className="bg-emerald-50 text-emerald-800 border-none font-bold text-[9px] px-2 py-0.5 rounded">
                          ✓ Completed & Returned
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default RentalList;
