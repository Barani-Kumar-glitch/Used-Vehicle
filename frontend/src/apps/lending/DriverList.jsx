import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Spinner, Card, Badge, Button, Modal } from '../../components/common/UI.jsx';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { 
  UserCheck, MapPin, Calendar, Clock, ShieldCheck, 
  Star, Sparkles, AlertCircle, Info, ChevronRight, X, Search 
} from 'lucide-react';

export const DriverList = () => {
  const { showToast } = useNotificationStore();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const { customer } = useAuthStore();
  const navigate = useNavigate();

  // Hire Modal State
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hireSuccess, setHireSuccess] = useState(false);
  const [hireLoading, setHireLoading] = useState(false);

  // Split date/time states
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [calculatedDays, setCalculatedDays] = useState(0);

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

  // Dynamic cost calculation: ₹150/hour or ₹1200/day
  const calculateEstimate = () => {
    if (!startTime || !endTime) {
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

    const diffMs = Math.abs(end - start);
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    setCalculatedHours(diffHours);
    setCalculatedDays(diffDays);

    let cost = 0;
    if (diffHours < 24) {
      cost = diffHours * 150;
    } else {
      cost = diffDays * 1200;
    }
    setEstimatedCost(cost);
  };

  useEffect(() => {
    calculateEstimate();
  }, [startTime, endTime]);

  useEffect(() => {
    fetchDrivers();
  }, [cityFilter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = {
        status: 'available'
      };
      if (cityFilter) params.city = cityFilter;
      const res = await API.get('/drivers', { params });
      setDrivers(res.data.drivers);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenHire = (driver) => {
    if (!customer) {
      navigate(`/login?redirect=${encodeURIComponent('/drivers')}`);
      return;
    }
    setSelectedDriver(driver);
    setStartDate('');
    setStartTimeInput('');
    setEndDate('');
    setEndTimeInput('');
    setStartTime('');
    setEndTime('');
    setEstimatedCost(0);
    setCalculatedHours(0);
    setCalculatedDays(0);
    setHireModalOpen(true);
  };

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime || estimatedCost <= 0) return;

    setHireLoading(true);
    try {
      await API.post('/requests', {
        driver_id: selectedDriver.driver_id,
        request_type: 'driver',
        details: `Driver hire request from ${startTime} to ${endTime}. Total estimated cost: ₹${estimatedCost}`
      });
      setHireSuccess(true);
      setHireModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit driver request', 'error');
    } finally {
      setHireLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header Layout */}
      <div className="relative bg-gradient-to-br from-brand-900 via-brand-950 to-slate-900 rounded-3xl p-8 md:p-12 text-white overflow-hidden shadow-xl border border-brand-850">
        <div className="absolute top-0 right-0 w-[40%] h-[60%] bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <Badge color="purple" className="bg-purple-500/20 text-purple-200 border-none px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
              Verification Level: Elite
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
              Professional Drivers <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">On Demand</span>
            </h2>
            <p className="text-slate-350 text-sm md:text-base leading-relaxed">
              Hire fully verified professional operators for hourly commutes or long distance journeys. Backed by full licensing audits.
            </p>
          </div>

          {/* Premium City Selector */}
          <div className="w-full md:max-w-xs flex-shrink-0 bg-white/5 border border-white/10 p-1.5 rounded-2xl backdrop-blur-md focus-within:border-purple-500/50 transition-all">
            <div className="relative flex items-center">
              <MapPin className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="Filter by city, e.g. Chennai"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-transparent text-white placeholder-slate-450 text-xs focus:outline-none"
              />
              {cityFilter && (
                <button onClick={() => setCityFilter('')} className="absolute right-3 text-slate-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Driver Grid Catalog */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Spinner size="lg" />
          <span className="text-slate-400 text-sm font-semibold animate-pulse">Filtering driver availability...</span>
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl max-w-md mx-auto space-y-3">
          <UserCheck className="mx-auto text-slate-300" size={48} />
          <h4 className="font-black text-slate-700">No Drivers Available</h4>
          <p className="text-slate-450 text-xs px-6">We could not find active operators in this city zone at the moment. Check back shortly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => {
            // Class experience tag generator
            const isHeavyLicense = ['Heavy', 'HMV'].some(cls => driver.licence_class?.includes(cls));
            
            return (
              <Card key={driver.driver_id} className="p-6 flex flex-col justify-between h-full bg-white border border-slate-100 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 rounded-2xl glow-hover">
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-100 to-indigo-50 border border-brand-200 flex items-center justify-center text-lg font-black text-brand-800 shadow-inner flex-shrink-0">
                        {driver.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                          {driver.name}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded font-mono font-bold">
                            L-CLASS: {driver.licence_class}
                          </span>
                          {isHeavyLicense && (
                            <Badge color="purple" className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded">
                              Heavy Spec
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mapped Star rating mock for visual appeal */}
                    <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-lg text-amber-700 text-xs font-black">
                      <Star size={12} fill="currentColor" />
                      <span>4.9</span>
                    </div>
                  </div>

                  {/* Zones & Location parameters */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-50">
                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-slate-550">Home Base: {driver.home_city}</span>
                    </div>

                    {driver.locations && driver.locations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Service Zones</span>
                        <div className="flex flex-wrap gap-1.5">
                          {driver.locations.map((loc, idx) => (
                            <span key={idx} className="text-[9px] bg-slate-50 border border-slate-150 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                              {loc.city} ({loc.zone})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Badge color={driver.status === 'available' ? 'green' : 'amber'} className="font-extrabold text-[10px] px-2.5 py-1 rounded-lg">
                    {driver.status}
                  </Badge>

                  <Button variant="primary" size="sm" className="font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 text-white" onClick={() => handleOpenHire(driver)}>
                    Hire Operator
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Hire Modal Form */}
      <Modal
        isOpen={hireModalOpen}
        onClose={() => setHireModalOpen(false)}
        title={selectedDriver ? `Hire Driver: ${selectedDriver.name}` : 'Hire Driver'}
      >
        <form onSubmit={handleHireSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Date</label>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Start Time</label>
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

          {/* Interactive Calculator breakdown summary */}
          {estimatedCost > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl space-y-2 text-purple-905">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Total Commitment Duration</span>
                <span>
                  {calculatedHours < 24 ? `${calculatedHours} Hours` : `${calculatedDays} Days`}
                </span>
              </div>
              <div className="text-[10px] text-purple-600 leading-normal border-t border-purple-200/50 pt-2 flex flex-col space-y-1">
                <div className="flex justify-between">
                  <span>Standard Driver Tariff</span>
                  <span>
                    {calculatedHours < 24 
                      ? `${calculatedHours} hr × ₹150` 
                      : `${calculatedDays} day × ₹1200`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Elite Licensing Mappings</span>
                  <span>Included</span>
                </div>
              </div>
              <div className="pt-2 border-t border-purple-200/50 flex justify-between items-center text-purple-950">
                <span className="text-xs font-bold uppercase">Estimated Driver Tariff</span>
                <span className="text-xl font-black">₹{estimatedCost.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setHireModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={hireLoading || estimatedCost <= 0} className="bg-gradient-to-r from-blue-600 to-indigo-650 text-white">
              {hireLoading ? 'Submitting request...' : 'Confirm Driver Hire'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hire Success Modal */}
      <Modal
        isOpen={hireSuccess}
        onClose={() => setHireSuccess(false)}
        title="Driver Request Logged!"
        footer={<Button variant="primary" onClick={() => setHireSuccess(false)}>Done</Button>}
      >
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Driver Request Received</h3>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
            Your request to hire a professional driver has been logged. Our administration team will contact you to confirm licensing and schedule.
          </p>
        </div>
      </Modal>
    </div>
  );
};
export default DriverList;
