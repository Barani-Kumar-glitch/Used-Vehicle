import React, { useState, useEffect } from 'react';
import API from '../../api/index.js';
import { Spinner, Badge, Button, Modal, Card } from '../../components/common/UI.jsx';
import { ShieldAlert, ArrowRight, CheckCircle, Clock, Calendar, MessageSquare, AlertCircle, User } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Bar, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

export const Dashboard = () => {
  const { showBanner } = useNotificationStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Request Acceptance Modal State
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [selectedRequestEvent, setSelectedRequestEvent] = useState(null);
  const [requestDetails, setRequestDetails] = useState(null);

  // Accept form state
  const [finalPrice, setFinalPrice] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transferDate, setTransferDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Split date/time states
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

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

  const [analyticsFilter, setAnalyticsFilter] = useState('daily');

  const getAnalyticsData = () => {
    const now = new Date();
    
    if (analyticsFilter === 'daily') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateString = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        days.push({ key: dateString, label, total: 0, requests: 0, conversions: 0 });
      }

      events.forEach(event => {
        if (!event.created_at) return;
        const eventDate = event.created_at.split('T')[0];
        const dayObj = days.find(d => d.key === eventDate);
        if (dayObj) {
          dayObj.total += 1;
          if (event.event_type.includes('Request')) {
            dayObj.requests += 1;
          }
          if (event.event_type.includes('Completed') || event.event_type.includes('Converted')) {
            dayObj.conversions += 1;
          }
        }
      });
      return days;
    }

    if (analyticsFilter === 'weekly') {
      const weeks = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);
        const dayOfWeek = d.getDay();
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - dayOfWeek);
        const weekKey = startOfWeek.toISOString().split('T')[0];
        const label = `Wk ${startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
        weeks.push({ key: weekKey, label, total: 0, requests: 0, conversions: 0, dateObj: startOfWeek });
      }

      events.forEach(event => {
        if (!event.created_at) return;
        const evDate = new Date(event.created_at);
        const matchedWeek = weeks.find(w => {
          const wStart = w.dateObj;
          const wEnd = new Date(wStart);
          wEnd.setDate(wStart.getDate() + 7);
          return evDate >= wStart && evDate < wEnd;
        });
        if (matchedWeek) {
          matchedWeek.total += 1;
          if (event.event_type.includes('Request')) {
            matchedWeek.requests += 1;
          }
          if (event.event_type.includes('Completed') || event.event_type.includes('Converted')) {
            matchedWeek.conversions += 1;
          }
        }
      });
      return weeks;
    }

    if (analyticsFilter === 'monthly') {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        months.push({ key: yearMonth, label, total: 0, requests: 0, conversions: 0 });
      }

      events.forEach(event => {
        if (!event.created_at) return;
        const evDate = new Date(event.created_at);
        const yearMonth = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}`;
        const monthObj = months.find(m => m.key === yearMonth);
        if (monthObj) {
          monthObj.total += 1;
          if (event.event_type.includes('Request')) {
            monthObj.requests += 1;
          }
          if (event.event_type.includes('Completed') || event.event_type.includes('Converted')) {
            monthObj.conversions += 1;
          }
        }
      });
      return months;
    }

    return [];
  };

  const recordsPerPage = 10;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const filteredEvents = eventTypeFilter
    ? events.filter(e => e.event_type === eventTypeFilter)
    : events;

  const currentEvents = filteredEvents.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredEvents.length / recordsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [eventTypeFilter]);

  useEffect(() => {
    fetchStatusEvents();
  }, []);

  const fetchStatusEvents = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/status-events', { params: { limit: 1000 } });
      setEvents(res.data.events);
    } catch (err) {
      console.error('Failed to fetch status events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAccept = async (event) => {
    setSelectedRequestEvent(event);
    setRequestDetails(null);
    setFinalPrice('');
    setPaymentStatus('unpaid');
    setPaymentMethod('UPI');
    setTransferDate('');
    setStartDate('');
    setStartTimeInput('');
    setEndDate('');
    setEndTimeInput('');
    setStartTime('');
    setEndTime('');
    setAcceptModalOpen(true);

    try {
      const res = await API.get('/requests', { params: { request_id: event.entity_id } });
      if (res.data.requests && res.data.requests.length > 0) {
        const reqLog = res.data.requests[0];
        setRequestDetails(reqLog);

        // 1. If sale request, auto-fill price from vehicle prices
        if (reqLog.request_type === 'buy' && reqLog.Vehicle) {
          const activePrice = reqLog.Vehicle.prices?.find(p => p.effective_to === null);
          if (activePrice) {
            setFinalPrice(activePrice.price);
          }
        }

        // 2. Parse dates/times and estimated cost from details text
        if (reqLog.details) {
          const detailsStr = reqLog.details;

          // Extractor for rental/extension request dates
          let startVal = null;
          let endVal = null;

          // 1. Try to match ISO format first: "from (\S+) to (\S+)" where dates are YYYY-MM-DDTHH:MM
          const isoMatch = detailsStr.match(/from\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\s+to\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
          if (isoMatch) {
            startVal = isoMatch[1];
            endVal = isoMatch[2];
          } else {
            // 2. Try generic "from ... to ..."
            const fromToMatch = detailsStr.match(/from\s+(.+?)\s+to\s+(.+?)(?:\. Reason|\. Estimated|\. Includes|$)/i);
            if (fromToMatch) {
              const startCandidate = fromToMatch[1].trim();
              const endCandidate = fromToMatch[2].trim();
              
              const parseArbitraryDate = (str) => {
                const cleanStr = str.replace(/,/g, '').endsWith('.') ? str.replace(/,/g, '').slice(0, -1) : str.replace(/,/g, '');
                const d = new Date(cleanStr);
                if (!isNaN(d)) {
                  const pad = (num) => String(num).padStart(2, '0');
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                }
                return null;
              };
              
              const startParsed = parseArbitraryDate(startCandidate);
              const endParsed = parseArbitraryDate(endCandidate);
              if (startParsed && endParsed) {
                startVal = startParsed;
                endVal = endParsed;
              }
            } else {
              // 3. Fallback to existing word boundary match
              const simpleMatch = detailsStr.match(/from\s+(\S+)\s+to\s+(\S+)/);
              if (simpleMatch) {
                startVal = simpleMatch[1];
                endVal = simpleMatch[2];
              }
            }
          }

          if (startVal && endVal) {
            // Start date/time
            if (startVal.includes('T')) {
              const [sDate, sTime] = startVal.split('T');
              setStartDate(sDate);
              setStartTimeInput(sTime.substring(0, 5));
            } else {
              setStartDate(startVal);
            }

            // End date/time
            if (endVal.includes('T')) {
              const cleanEndVal = endVal.endsWith('.') ? endVal.slice(0, -1) : endVal;
              const [eDate, eTime] = cleanEndVal.split('T');
              setEndDate(eDate);
              setEndTimeInput(eTime.substring(0, 5));
            } else {
              const cleanEndVal = endVal.endsWith('.') ? endVal.slice(0, -1) : endVal;
              setEndDate(cleanEndVal);
            }
          }

          // Extractor for estimated cost/price: "Total estimated cost: ₹(\d+(\.\d+)?)"
          const costMatch = detailsStr.match(/cost:\s*₹?(\d+(\.\d+)?)/);
          if (costMatch) {
            setFinalPrice(costMatch[1]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load request details:", err);
    }
  };

  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequestEvent) return;

    setSubmitting(true);
    try {
      // The event payload contains entity details. In our model, StatusEventLog entity_id maps to RequestLog ID
      const requestId = selectedRequestEvent.entity_id;

      const payload = {
        payment_status: paymentStatus,
        payment_method: paymentStatus === 'paid' ? paymentMethod : undefined,
      };
      if (finalPrice) payload.final_price = parseFloat(finalPrice);
      if (transferDate) payload.transfer_date = transferDate;
      if (startTime) payload.start_time = startTime;
      if (endTime) payload.end_time = endTime;

      await API.post(`/requests/${requestId}/accept`, payload);
      setAcceptModalOpen(false);
      fetchStatusEvents();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRequest = async (event) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      const requestId = event.entity_id;
      await API.post(`/requests/${requestId}/reject`);
      showBanner('Request rejected successfully', 'success');
      fetchStatusEvents();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to reject request', 'error');
    }
  };

  const getEventBadgeColor = (type) => {
    if (type.includes('Completed') || type.includes('Verified')) return 'green';
    if (type.includes('Request') || type.includes('Alert')) return 'amber';
    if (type.includes('Converted') || type.includes('Visited')) return 'purple';
    if (type.includes('Removed')) return 'rose';
    return 'gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">System Status Event Log</h1>
          <p className="text-slate-400 text-xs mt-1">Real-time polymorphic logs tracking sales, referrals, rentals, and payments.</p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Logs</span>
            <h4 className="text-2xl font-black text-blue-400 mt-1">{events.length}</h4>
          </div>
          <MessageSquare size={24} className="text-slate-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">KYC & Verify</span>
            <h4 className="text-2xl font-black text-emerald-500 mt-1">
              {events.filter(e => e.event_type.includes('OTP') || e.event_type.includes('Verified') || e.event_type.includes('KYC')).length}
            </h4>
          </div>
          <ShieldAlert size={24} className="text-emerald-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Requests</span>
            <h4 className="text-2xl font-black text-amber-500 mt-1">
              {events.filter(e => e.event_type.includes('Request')).length}
            </h4>
          </div>
          <Clock size={24} className="text-amber-600" />
        </Card>

        <Card className="p-5 bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Transactions</span>
            <h4 className="text-2xl font-black text-purple-500 mt-1">
              {events.filter(e => e.event_type.includes('Sale') || e.event_type.includes('Booking') || e.event_type.includes('Payment')).length}
            </h4>
          </div>
          <AlertCircle size={24} className="text-purple-600" />
        </Card>
      </div>

      {/* Analytics Card */}
      <Card className="p-6 bg-slate-950 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Status Log Analytics</h3>
            <p className="text-xs text-slate-500 mt-1">Combination view of total logs, user requests, and order conversions.</p>
          </div>
          
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
            {[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAnalyticsFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  analyticsFilter === tab.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={getAnalyticsData()}
              margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                labelStyle={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Area 
                type="monotone" 
                dataKey="conversions" 
                fill="#8b5cf6" 
                stroke="#8b5cf6" 
                fillOpacity={0.1}
                name="Conversions" 
              />
              <Bar 
                dataKey="total" 
                barSize={30} 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                name="Total Logs" 
              />
              <Line 
                type="monotone" 
                dataKey="requests" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                name="User Requests" 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tabs / Filter Controls */}
      <div className="flex flex-wrap gap-2 border-b border-slate-850 pb-4">
        {[
          { id: '', label: 'All Events' },
          { id: 'Sale Request', label: 'Sale Requests' },
          { id: 'Rental Request', label: 'Rental Requests' },
          { id: 'Driver Request', label: 'Driver Requests' },
          { id: 'Rental Extension Request', label: 'Extension Requests' },
          { id: 'Sale Completed', label: 'Sales Completed' },
          { id: 'Referral Converted', label: 'Conversions' }
        ].map(tab => {
          const count = tab.id === '' 
            ? events.length 
            : events.filter(e => e.event_type === tab.id).length;
          
          return (
            <button
              key={tab.id}
              onClick={() => setEventTypeFilter(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all duration-200 ${
                eventTypeFilter === tab.id
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
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Spinner size="lg" />
          <span className="text-slate-400 text-sm">Streaming system events...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-slate-950 border border-slate-800 rounded-2xl">
          <ShieldAlert className="mx-auto text-slate-600 mb-4" size={40} />
          <h4 className="font-bold text-slate-300 mb-1">No Status Events Registered</h4>
          <p className="text-slate-500 text-xs">Event logs will appear as customers make requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {currentEvents.map((event) => {
              // Check if this is a pending request event to show Accept button
              const isRequest = event.event_type.includes('Request') && event.new_status === 'pending';

              return (
                <div
                  key={event.event_id}
                  className={`p-6 rounded-2xl border transition-all ${event.event_type === 'Referral Converted'
                      ? 'bg-purple-950/20 border-purple-900/40'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80'
                    }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Badge color={getEventBadgeColor(event.event_type)}>{event.event_type}</Badge>
                        <span className="text-xs text-slate-400 font-mono">ID: {event.event_id}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(event.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-slate-200 text-sm font-semibold flex items-center space-x-2">
                        {event.payload?.customer && <span>Customer: {event.payload.customer}</span>}
                        {event.payload?.vehicle && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span>Vehicle: {event.payload.vehicle}</span>
                          </>
                        )}
                        {event.payload?.driver && (
                          <>
                            <span className="text-slate-600">|</span>
                            <span>Driver: {event.payload.driver}</span>
                          </>
                        )}
                      </div>

                      {/* Show referral information for conversions */}
                      {event.event_type === 'Referral Converted' && (
                        <div className="p-3 bg-purple-900/10 border border-purple-800/20 rounded-xl space-y-1.5 text-xs text-purple-200">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <CheckCircle size={14} className="text-purple-400" />
                            <span>Referral Conversion Details</span>
                          </div>
                          <div>Referrer: {event.payload.referrer_name} ({event.payload.referrer_phone})</div>
                          <div>Payout Amount: <span className="font-extrabold text-white">₹{parseFloat(event.payload.commission_amount || 0).toLocaleString('en-IN')}</span></div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end space-x-2">
                      {isRequest ? (
                        <>
                          <Button variant="accent" size="sm" onClick={() => handleOpenAccept(event)}>
                            <span>Process & Accept</span>
                            <ArrowRight size={14} className="ml-1.5" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleRejectRequest(event)}>
                            <span>Reject</span>
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500">
                          Triggered by: {event.triggered_by}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, events.length)} of {events.length} records
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

      {/* Accept request modal */}
      <Modal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        title={selectedRequestEvent ? `Accept: ${selectedRequestEvent.event_type}` : 'Process Request'}
      >
        {selectedRequestEvent && (
          <form onSubmit={handleAcceptSubmit} className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
              <div className="font-bold text-slate-850 flex items-center space-x-1.5 uppercase tracking-wider text-[10px]">
                <User size={12} className="text-brand-500" />
                <span>Customer & Vehicle Context:</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Customer</span>
                  <span className="font-bold">{requestDetails?.Customer?.name || selectedRequestEvent.payload?.customer_name || selectedRequestEvent.payload?.customer || 'N/A'}</span>
                  {(requestDetails?.Customer?.phone || selectedRequestEvent.payload?.customer_phone) && (
                    <span className="block text-[10px] text-slate-500">{requestDetails?.Customer?.phone || selectedRequestEvent.payload?.customer_phone}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Requested Item</span>
                  <span className="font-bold">
                    {requestDetails?.Vehicle ? `${requestDetails.Vehicle.year} ${requestDetails.Vehicle.make} ${requestDetails.Vehicle.model}` : selectedRequestEvent.payload?.vehicle || requestDetails?.Driver?.name || selectedRequestEvent.payload?.driver || 'N/A'}
                  </span>
                  {requestDetails?.Vehicle && (
                    <span className="block text-[10px] text-slate-500">Rate: ₹{parseFloat(requestDetails.Vehicle.rate_per_day || 0)}/day | ₹{parseFloat(requestDetails.Vehicle.rate_per_hour || 0)}/hr</span>
                  )}
                </div>
              </div>
              {requestDetails?.details && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Requested Schedule & Price (Details)</span>
                  <span className="font-serif italic text-slate-600">"{requestDetails.details}"</span>
                </div>
              )}
              {selectedRequestEvent.payload?.referral_code && (
                <div className="text-purple-600 font-semibold text-[10px] pt-1">
                  Referral Applied: {selectedRequestEvent.payload.referral_code}
                </div>
              )}
            </div>

            {/* Price (Sale and rental) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Final Settled Price (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 550000"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Initial Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="unpaid">Unpaid / Processing</option>
                <option value="partial">Partial Payment Received</option>
                <option value="paid">Full Payment Completed</option>
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

            {/* Date logic depending on request type */}
            {selectedRequestEvent.event_type === 'Sale Request' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Ownership Transfer Date</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none"
                />
              </div>
            ) : selectedRequestEvent.event_type === 'Rental Extension Request' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Original Return Date</label>
                    <input
                      type="date"
                      disabled
                      value={startDate}
                      className="w-full rounded-xl border border-slate-200 bg-slate-800 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Original Return Time</label>
                    <input
                      type="time"
                      disabled
                      value={startTimeInput}
                      className="w-full rounded-xl border border-slate-200 bg-slate-800 px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">New Return Date *</label>
                    <input
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
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
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                      onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Rental request
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pickup Date</label>
                    <input
                      type="date"
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
                      min={startDate || new Date().toISOString().split('T')[0]}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                      onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Expected Return Time</label>
                    <input
                      type="time"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      onClick={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                      onFocus={(e) => { try { e.target.showPicker(); } catch (err) { } }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setAcceptModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Processing Order...' : 'Confirm Accept & Sync DB'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default Dashboard;
