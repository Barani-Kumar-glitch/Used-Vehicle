import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Spinner, Card, Badge, Button, Modal } from '../../components/common/UI.jsx';
import { 
  Search, MapPin, Fuel, ArrowRight, Share2, 
  GitCompare, Eye, X, Check, HelpCircle, 
  Sparkles, Calendar, Gauge, Info, DollarSign
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

export const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { customer } = useAuthStore();
  const [acquiredHistory, setAcquiredHistory] = useState([]);
  const [search, setSearch] = useState('');
  
  // Custom sidebar filter states
  const [fuelFilter, setFuelFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [transmissionFilter, setTransmissionFilter] = useState('');
  const [minYear, setMinYear] = useState('');
  const [maxYear, setMaxYear] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Innovative details states
  const [compareList, setCompareList] = useState([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [quickViewVehicle, setQuickViewVehicle] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVehicles();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fuelFilter, locationFilter, transmissionFilter, minYear, maxYear, minPrice, maxPrice]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = {
        listing_mode: 'sale',
        status: 'available',
      };
      if (fuelFilter) params.fuel_type = fuelFilter;
      if (locationFilter) params.location = locationFilter;
      if (transmissionFilter) params.transmission = transmissionFilter;
      if (minYear) params.year_min = minYear;
      if (maxYear) params.year_max = maxYear;
      if (minPrice) params.price_min = minPrice;
      if (maxPrice) params.price_max = maxPrice;
      if (search.trim()) params.search = search;

      const res = await API.get('/vehicles', { params });
      setVehicles(res.data.vehicles);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcquiredHistory = async () => {
    if (!customer) return;
    try {
      const res = await API.get('/orders/sale');
      setAcquiredHistory(res.data.orders || []);
    } catch (err) {
      console.error('Failed to fetch acquired history:', err);
    }
  };

  useEffect(() => {
    fetchAcquiredHistory();
  }, [customer]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVehicles();
  };

  // Price dual slider calculation
  const pMin = minPrice ? parseInt(minPrice) : 0;
  const pMax = maxPrice ? parseInt(maxPrice) : 5000000;
  const pMinPercent = (pMin / 5000000) * 100;
  const pMaxPercent = 100 - ((pMax / 5000000) * 100);

  // Year dual slider calculation
  const yMin = minYear ? parseInt(minYear) : 2010;
  const yMax = maxYear ? parseInt(maxYear) : 2026;
  const yMinPercent = ((yMin - 2010) / (2026 - 2010)) * 100;
  const yMaxPercent = 100 - (((yMax - 2010) / (2026 - 2010)) * 100);

  // Comparison Handlers
  const toggleCompare = (vehicle) => {
    const isAlreadyAdded = compareList.some(v => v.vehicle_id === vehicle.vehicle_id);
    if (isAlreadyAdded) {
      setCompareList(prev => prev.filter(v => v.vehicle_id !== vehicle.vehicle_id));
    } else {
      if (compareList.length >= 3) {
        alert("You can compare up to 3 vehicles at once.");
        return;
      }
      setCompareList(prev => [...prev, vehicle]);
    }
  };

  const removeFromCompare = (vehicleId) => {
    setCompareList(prev => prev.filter(v => v.vehicle_id !== vehicleId));
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Custom styles for dual range thumbs and animations */}
      <style>{`
        .flipkart-slider::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff !important;
          border: 2px solid #3b82f6 !important;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        .flipkart-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .flipkart-slider::-moz-range-thumb {
          pointer-events: auto;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff !important;
          border: 2px solid #3b82f6 !important;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.15s ease;
        }
        .flipkart-slider::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
        .glow-hover:hover {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }
        .text-glow {
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Hero Banner Section with Glassmorphic Elements */}
      <div className="relative bg-gradient-to-br from-brand-900 via-brand-950 to-slate-900 rounded-3xl p-8 md:p-14 text-white overflow-hidden shadow-xl border border-brand-800">
        {/* Dynamic Glowing background circles */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-brand-500/20 text-blue-200 border border-blue-400/20 mb-6">
            <Sparkles size={12} className="animate-spin duration-3000" />
            Innovative Pre-Owned Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-tight text-glow">
            Discover Your Next <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Dream Car</span>
          </h1>
          
          <p className="text-slate-300 text-base md:text-lg mb-8 leading-relaxed max-w-2xl">
            Sleek listings, transparent documentation, and a reward-packed referral program. Unlock modern secondhand buying with interactive pricing.
          </p>

          {/* Premium Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-lg focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-300 shadow-lg">
            <div className="relative flex-grow flex items-center">
              <Search className="absolute left-3.5 text-slate-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Search by make, model, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-transparent text-white placeholder-slate-450 text-sm focus:outline-none"
              />
            </div>
            <Button variant="accent" type="submit" size="md" className="py-3.5 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] transition-all">
              Search Cars
            </Button>
          </form>
        </div>
      </div>

      {/* Main filter + list section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Visual Sidebar Filters */}
        <aside className="space-y-6 lg:sticky lg:top-20 h-fit">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Filter Inventory</h3>
              <button 
                onClick={() => {
                  setFuelFilter('');
                  setTransmissionFilter('');
                  setLocationFilter('');
                  setMinYear('');
                  setMaxYear('');
                  setMinPrice('');
                  setMaxPrice('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Reset All
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
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm ring-1 ring-blue-400/20'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Premium Toggle Buttons for Transmission */}
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
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm ring-1 ring-blue-400/20'
                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-350'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Location (City)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. Chennai"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Pricing Slider */}
            <div className="space-y-3 pt-2 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Price Range</label>
                {(minPrice || maxPrice) && (
                  <button
                    type="button"
                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                    className="text-[10px] font-bold text-red-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Range bar */}
              <div className="relative w-full h-1 bg-slate-200 rounded-full my-6">
                <div
                  className="absolute h-1 bg-blue-500 rounded-full"
                  style={{ left: `${pMinPercent}%`, right: `${pMaxPercent}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="5000000"
                  step="50000"
                  value={pMin}
                  onChange={(e) => {
                    const val = Math.min(parseInt(e.target.value), pMax - 50000);
                    setMinPrice(val.toString());
                  }}
                  className="absolute w-full h-1 bg-transparent pointer-events-none appearance-none -top-0 left-0 flipkart-slider"
                />
                <input
                  type="range"
                  min="0"
                  max="5000000"
                  step="50000"
                  value={pMax}
                  onChange={(e) => {
                    const val = Math.max(parseInt(e.target.value), pMin + 50000);
                    setMaxPrice(val.toString());
                  }}
                  className="absolute w-full h-1 bg-transparent pointer-events-none appearance-none -top-0 left-0 flipkart-slider"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
                <span>₹{pMin.toLocaleString('en-IN')}</span>
                <span>₹{pMax.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Model Year Slider */}
            <div className="space-y-3 pt-2 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Model Year</label>
                {(minYear || maxYear) && (
                  <button
                    type="button"
                    onClick={() => { setMinYear(''); setMaxYear(''); }}
                    className="text-[10px] font-bold text-red-500 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="relative w-full h-1 bg-slate-200 rounded-full my-6">
                <div
                  className="absolute h-1 bg-blue-500 rounded-full"
                  style={{ left: `${yMinPercent}%`, right: `${yMaxPercent}%` }}
                />
                <input
                  type="range"
                  min="2010"
                  max="2026"
                  step="1"
                  value={yMin}
                  onChange={(e) => {
                    const val = Math.min(parseInt(e.target.value), yMax - 1);
                    setMinYear(val.toString());
                  }}
                  className="absolute w-full h-1 bg-transparent pointer-events-none appearance-none -top-0 left-0 flipkart-slider"
                />
                <input
                  type="range"
                  min="2010"
                  max="2026"
                  step="1"
                  value={yMax}
                  onChange={(e) => {
                    const val = Math.max(parseInt(e.target.value), yMin + 1);
                    setMaxYear(val.toString());
                  }}
                  className="absolute w-full h-1 bg-transparent pointer-events-none appearance-none -top-0 left-0 flipkart-slider"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-0.5">
                <span>{yMin}</span>
                <span>{yMax}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Listings Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Spinner size="lg" />
              <span className="text-slate-400 text-sm font-semibold animate-pulse">Scanning available inventory...</span>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto space-y-4">
              <div className="text-slate-250 text-7xl">🚙</div>
              <h3 className="text-xl font-bold text-slate-700">No Vehicles Found</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                No pre-owned listings match your active filters. Try resetting search criteria or sliders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((car) => {
                const activePrice = car.prices && car.prices[0];
                const priceValue = activePrice ? parseFloat(activePrice.price) : null;
                const isSelectedForCompare = compareList.some(v => v.vehicle_id === car.vehicle_id);

                return (
                  <Card key={car.vehicle_id} className="flex flex-col h-full bg-white border border-slate-100 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 rounded-2xl overflow-hidden glow-hover">
                    {/* Media Slider Header */}
                    <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden group/image">
                      <VehicleImageSlider photoUrl={car.photo_url} altText={`${car.year} ${car.make}`} />
                      
                      {/* Floating badging */}
                      <Badge color="green" className="absolute top-3 left-3 bg-emerald-500 text-white border-none font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm z-20">
                        {car.status}
                      </Badge>

                      {/* Interactive Buttons Overlaid */}
                      <div className="absolute top-3 right-3 flex flex-col space-y-2 z-20 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200">
                        <button
                          type="button"
                          onClick={() => setQuickViewVehicle(car)}
                          className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-xl shadow-md transition-transform active:scale-95"
                          title="Quick View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCompare(car)}
                          className={`p-2 rounded-xl shadow-md transition-transform active:scale-95 ${
                            isSelectedForCompare 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white/90 hover:bg-white text-slate-700'
                          }`}
                          title="Add to Compare"
                        >
                          <GitCompare size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-5 flex flex-col flex-grow">
                      {/* Technical tags */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                        <span>{car.year}</span>
                        <span>•</span>
                        <span>{car.transmission}</span>
                      </div>

                      <h4 className="text-lg font-black text-slate-800 line-clamp-1 mb-2">
                        {car.make} {car.model}
                      </h4>

                      {/* Core Specs Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                          <Fuel size={14} className="text-slate-400" />
                          <span className="truncate">{car.fuel_type}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                          <Gauge size={14} className="text-slate-400" />
                          <span className="truncate">
                            {car.km_driven !== undefined && car.km_driven !== null ? `${car.km_driven.toLocaleString()} km` : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 col-span-2">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="truncate">{car.location}</span>
                        </div>
                      </div>

                      {/* Referral Earner Loop */}
                      {priceValue && (
                        <div className="mb-4 bg-emerald-50/40 border border-emerald-100 rounded-xl p-2.5 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Sparkles size={13} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-700 font-bold uppercase">Referral Reward</span>
                          </div>
                          <span className="text-xs font-black text-emerald-800">
                            ₹{Math.round(priceValue * 0.015).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {/* Details & CTA Actions */}
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sale Price</span>
                          <span className="text-lg font-black text-slate-800">
                            {priceValue ? `₹${priceValue.toLocaleString('en-IN')}` : 'Contact Us'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setQuickViewVehicle(car)}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all border border-slate-150"
                            title="Quick Specs Breakdown"
                          >
                            <Info size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/buy/vehicle/${car.vehicle_id}`)}
                            className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all border border-blue-100"
                            title="Complete Details"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Comparison Drawer */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center space-x-4 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span className="bg-blue-600 text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded uppercase">Compare Drawer</span>
              <span className="text-xs font-bold text-slate-400">({compareList.length}/3 selected)</span>
            </div>
            <div className="flex space-x-3 overflow-x-auto no-scrollbar">
              {compareList.map(car => (
                <div key={car.vehicle_id} className="relative flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex-shrink-0">
                  <span className="text-xs font-bold text-slate-100">{car.make} {car.model}</span>
                  <button
                    type="button"
                    onClick={() => removeFromCompare(car.vehicle_id)}
                    className="text-slate-400 hover:text-red-400 transition-colors focus:outline-none"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setCompareList([])}
              className="px-3 py-2 text-xs font-bold text-slate-450 hover:text-white rounded-xl transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setCompareModalOpen(true)}
              disabled={compareList.length < 2}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
            >
              <GitCompare size={14} />
              <span>Compare Specs</span>
            </button>
          </div>
        </div>
      )}

      {/* Comparison Drawer Sheet Modal */}
      <Modal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        title="Vehicle Specifications Comparison"
      >
        <div className="overflow-x-auto rounded-xl border border-slate-150">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Specs</th>
                {compareList.map(car => (
                  <th key={car.vehicle_id} className="px-4 py-3 min-w-[150px]">
                    <div className="font-black text-slate-800">{car.make} {car.model}</div>
                    <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{car.year} Model</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-400 text-xs uppercase">Price</td>
                {compareList.map(car => {
                  const price = car.prices?.[0]?.price;
                  return (
                    <td key={car.vehicle_id} className="px-4 py-3.5 font-extrabold text-slate-900 text-sm">
                      {price ? `₹${parseFloat(price).toLocaleString('en-IN')}` : 'Contact Us'}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-400 text-xs uppercase">Fuel Type</td>
                {compareList.map(car => (
                  <td key={car.vehicle_id} className="px-4 py-3.5 font-medium">{car.fuel_type}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-400 text-xs uppercase">Transmission</td>
                {compareList.map(car => (
                  <td key={car.vehicle_id} className="px-4 py-3.5 font-medium">{car.transmission}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-400 text-xs uppercase">KM Driven</td>
                {compareList.map(car => (
                  <td key={car.vehicle_id} className="px-4 py-3.5 font-medium">
                    {car.km_driven !== undefined && car.km_driven !== null ? `${car.km_driven.toLocaleString()} km` : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-400 text-xs uppercase">City Location</td>
                {compareList.map(car => (
                  <td key={car.vehicle_id} className="px-4 py-3.5 font-medium">{car.location}</td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-bold text-slate-400 text-xs uppercase">Status</td>
                {compareList.map(car => (
                  <td key={car.vehicle_id} className="px-4 py-3.5">
                    <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full capitalize">
                      {car.status}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-4"></td>
                {compareList.map(car => (
                  <td key={car.vehicle_id} className="px-4 py-4">
                    <button
                      onClick={() => {
                        setCompareModalOpen(false);
                        navigate(`/buy/vehicle/${car.vehicle_id}`);
                      }}
                      className="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold py-2 rounded-xl transition-all"
                    >
                      View Details
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Quick View Details Modal */}
      <Modal
        isOpen={quickViewVehicle !== null}
        onClose={() => setQuickViewVehicle(null)}
        title={quickViewVehicle ? `Quick Review: ${quickViewVehicle.make} ${quickViewVehicle.model}` : "Vehicle Review"}
      >
        {quickViewVehicle && (
          <div className="space-y-6">
            {/* Main Picture */}
            <div className="aspect-video w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-100 relative">
              <VehicleImageSlider photoUrl={quickViewVehicle.photo_url} altText={`${quickViewVehicle.year} ${quickViewVehicle.make}`} />
            </div>

            {/* General Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xl font-black text-slate-800">
                  {quickViewVehicle.make} {quickViewVehicle.model}
                </h4>
                <span className="text-lg font-black text-blue-600">
                  {quickViewVehicle.prices?.[0]?.price ? `₹${parseFloat(quickViewVehicle.prices[0].price).toLocaleString('en-IN')}` : 'Contact Us'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-4">
                Year {quickViewVehicle.year} • {quickViewVehicle.transmission} • {quickViewVehicle.fuel_type}
              </p>
            </div>

            {/* Full Spec List */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">LOCATION</span>
                <span className="text-sm font-semibold text-slate-700">{quickViewVehicle.location}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">KM DRIVEN</span>
                <span className="text-sm font-semibold text-slate-700">
                  {quickViewVehicle.km_driven !== undefined && quickViewVehicle.km_driven !== null ? `${quickViewVehicle.km_driven.toLocaleString()} km` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">FUEL TYPE</span>
                <span className="text-sm font-semibold text-slate-700">{quickViewVehicle.fuel_type}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">REGISTRATION</span>
                <span className="text-sm font-semibold text-slate-700">{quickViewVehicle.registration_number || 'Pending'}</span>
              </div>
            </div>

            {/* Call to action */}
            <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
              <Button 
                variant="secondary" 
                className="flex-1 font-bold py-3 border border-slate-250"
                onClick={() => {
                  toggleCompare(quickViewVehicle);
                  setQuickViewVehicle(null);
                }}
              >
                <GitCompare size={14} className="mr-1.5" />
                Add to Compare
              </Button>
              <Button
                variant="primary"
                className="flex-1 font-bold py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                onClick={() => {
                  setQuickViewVehicle(null);
                  navigate(`/buy/vehicle/${quickViewVehicle.vehicle_id}`);
                }}
              >
                Buy Now Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Redesigned Acquired Vehicles History */}
      {customer && acquiredHistory.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2.5">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">🔑</span> My Acquired Vehicles
              </h3>
              <p className="text-xs text-slate-400 mt-1">Timeline tracker of all your vehicle purchases and ownership transfers</p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">
              {acquiredHistory.length} orders logged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {acquiredHistory.map((sale) => {
              const car = sale.Vehicle;
              const isPaid = sale.payment_status === 'paid';
              return (
                <div
                  key={sale.sale_order_id}
                  className="p-5 rounded-2xl border border-slate-150 bg-slate-50/20 hover:bg-slate-50/50 transition-all duration-200 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                      #VEH-BUY-{sale.sale_order_id}
                    </span>
                    <Badge color={isPaid ? 'green' : 'amber'} className="font-extrabold text-[10px] px-2.5 py-0.5 rounded-md">
                      {isPaid ? 'Completed' : 'Awaiting Payment'}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-150 flex items-center justify-center text-xl shadow-inner flex-shrink-0">
                      🚗
                    </div>
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-sm font-black text-slate-850 truncate">
                        {car ? `${car.make} ${car.model}` : 'Deleted Vehicle'}
                      </h4>
                      <p className="text-xs text-slate-450">
                        Purchased on {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Horizontal Timeline Tracker */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase mb-2">
                      <span>Ordered</span>
                      <span>Payment</span>
                      <span>Delivery</span>
                    </div>
                    <div className="relative w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-blue-500 w-1/3" />
                      <div className={`h-full ${isPaid ? 'bg-blue-500' : 'bg-slate-200'} w-1/3`} />
                      <div className={`h-full ${isPaid && sale.ownership_transfer_date ? 'bg-blue-500' : 'bg-slate-200'} w-1/3`} />
                    </div>
                  </div>

                  {/* Pricing and details footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-[9px] text-slate-400 font-bold uppercase">Purchase Value</div>
                      <div className="text-sm font-black text-slate-800">
                        ₹{parseFloat(sale.price).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {sale.referral?.Referrer && (
                      <div className="text-right">
                        <div className="text-[8px] text-indigo-400 font-bold uppercase">Commission Agent</div>
                        <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded truncate max-w-[120px]">
                          {sale.referral.Referrer.name}
                        </div>
                      </div>
                    )}
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
export default VehicleList;
