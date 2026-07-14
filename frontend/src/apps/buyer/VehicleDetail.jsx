import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/index.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useReferralStore } from '../../stores/referralStore.js';
import { Spinner, Badge, Button, Card, Modal } from '../../components/common/UI.jsx';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { Share2, Tag, MapPin, Fuel, Calendar, ShieldCheck, ShoppingCart, MessageSquare, Copy, Gauge } from 'lucide-react';

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
      <div className="w-full h-full flex items-center justify-center text-slate-300 text-7xl bg-gradient-to-br from-slate-100 to-slate-200">
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
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none z-20 text-sm font-black shadow-md"
          >
            ❮
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none z-20 text-sm font-black shadow-md"
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
                className={`w-2 h-2 rounded-full transition-all duration-200 ${currentIdx === idx ? 'bg-white w-4' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const VehicleDetail = () => {
  const { showToast } = useNotificationStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { customer } = useAuthStore();
  const { referralCode, setReferralCode } = useReferralStore();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [referrerName, setReferrerName] = useState('');
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Share link modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  // Buy request confirmation state
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    fetchVehicleDetail();
    handleReferralResolution();
  }, [id]);

  const fetchVehicleDetail = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/vehicles/${id}`);
      setVehicle(res.data.vehicle);
    } catch (err) {
      setError('Failed to load vehicle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReferralResolution = async () => {
    const urlRef = searchParams.get('ref');
    if (urlRef) {
      setReferralCode(urlRef);
      try {
        const res = await API.get(`/referrals/resolve/${urlRef}`);
        setReferrerName(res.data.result.referrer.name);
        setReferralSuccess(true);
      } catch (err) {
        console.warn('Could not resolve referral code:', err.message);
      }
    } else if (referralCode) {
      // Re-resolve existing referral code if we came back
      try {
        const res = await API.get(`/referrals/resolve/${referralCode}`);
        setReferrerName(res.data.result.referrer.name);
        setReferralSuccess(true);
      } catch (err) {
        console.warn('Could not resolve stored referral code:', err.message);
      }
    }
  };

  const handleBuyNow = async () => {
    if (!customer) {
      navigate(`/login?redirect=${encodeURIComponent(`/buy/vehicle/${id}`)}`);
      return;
    }

    setSubmittingRequest(true);
    try {
      await API.post('/requests', {
        vehicle_id: id,
        request_type: 'buy',
        referral_code: referralCode || null,
        details: `Customer requests to purchase ${vehicle.make} ${vehicle.model} for listed price.`
      });
      setRequestSuccess(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit purchase request.', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleReferAndEarn = async () => {
    if (!customer) {
      navigate(`/login?redirect=${encodeURIComponent(`/buy/vehicle/${id}`)}`);
      return;
    }

    setGeneratingLink(true);
    try {
      const res = await API.post('/referrals/generate', { vehicle_id: id });
      const fullUrl = `${window.location.origin}/buy/vehicle/${id}?ref=${res.data.referral_code}&vehicle_id=${id}&referrer_id=${customer.customer_id}`;
      setGeneratedLink(fullUrl);
      setShareModalOpen(true);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate referral link.', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Spinner size="lg" />
        <span className="text-slate-400 text-sm font-medium">Loading vehicle details...</span>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <div className="text-rose-500 text-5xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Details</h3>
        <p className="text-slate-500 text-sm mb-6">{error || 'Vehicle record not found.'}</p>
        <Button variant="secondary" onClick={() => navigate('/buy')}>Back to listings</Button>
      </div>
    );
  }

  const activePrice = vehicle.prices && vehicle.prices.find(p => p.effective_to === null);
  const priceValue = activePrice ? activePrice.price : null;

  return (
    <div className="space-y-8">
      {/* Referral alert banner */}
      {referralSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm">
            <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
            <span>
              You were referred to this vehicle listing by <span className="font-bold">{referrerName}</span>. Your referral has been logged!
            </span>
          </div>
          <Badge color="green" className="bg-emerald-600 text-white font-bold px-3 py-1">Referred</Badge>
        </div>
      )}

      {/* Main product display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Images & specs */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-2 bg-slate-100/50">
            <div className="aspect-video w-full rounded-lg bg-slate-100 overflow-hidden relative shadow-inner">
              <VehicleImageSlider photoUrl={vehicle.photo_url} altText={`${vehicle.year} ${vehicle.make}`} />
            </div>
          </Card>

          {/* Details & description */}
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xl font-bold text-slate-800 pb-3 border-b border-slate-100">Vehicle Specifications</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center">
                <Calendar className="text-brand-500 mb-2" size={20} />
                <span className="text-xs text-slate-400 font-medium">Model Year</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">{vehicle.year}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center">
                <MapPin className="text-brand-500 mb-2" size={20} />
                <span className="text-xs text-slate-400 font-medium">Location</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">{vehicle.location}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center">
                <Fuel className="text-brand-500 mb-2" size={20} />
                <span className="text-xs text-slate-400 font-medium">Fuel Type</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">{vehicle.fuel_type}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center">
                <Tag className="text-brand-500 mb-2" size={20} />
                <span className="text-xs text-slate-400 font-medium">Gearbox</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">{vehicle.transmission}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl flex flex-col items-center justify-center text-center">
                <Gauge className="text-brand-500 mb-2" size={20} />
                <span className="text-xs text-slate-400 font-medium">Odometer</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5">
                  {vehicle.km_driven !== undefined && vehicle.km_driven !== null ? `${vehicle.km_driven} km` : '0 km'}
                </span>
              </div>
            </div>

            <div className="text-slate-600 leading-relaxed text-sm">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Detailed Condition Notes</h4>
              This secondhand {vehicle.year} {vehicle.make} {vehicle.model} has been thoroughly inspected by our mechanics. It comes with updated documents and a verified history checklist. Ideal choice for dealers and private buyers alike.
            </div>
          </div>
        </div>

        {/* Right Side: Buying / share card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg space-y-6 sticky top-24">
            <div>
              <Badge color="blue" className="mb-2">Available for Sale</Badge>
              <h2 className="text-2xl font-black text-slate-800">{vehicle.make} {vehicle.model}</h2>
              <p className="text-slate-400 text-xs mt-1">Vehicle Asset listing</p>
            </div>

            <div className="p-5 bg-brand-50 rounded-2xl flex items-center justify-between border border-brand-100">
              <span className="text-sm font-semibold text-brand-800">Final Price</span>
              <span className="text-3xl font-black text-brand-950">
                {priceValue ? `₹${parseFloat(priceValue).toLocaleString('en-IN')}` : 'Request Quote'}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                variant="primary"
                onClick={handleBuyNow}
                disabled={submittingRequest}
                className="w-full py-4 text-sm font-bold shadow-lg"
              >
                <ShoppingCart size={18} className="mr-2" />
                {submittingRequest ? 'Submitting Purchase Request...' : 'Buy Now'}
              </Button>

              <Button
                variant="accent"
                onClick={handleReferAndEarn}
                disabled={generatingLink}
                className="w-full py-4 text-sm font-bold"
              >
                <Share2 size={18} className="mr-2" />
                {generatingLink ? 'Generating Code...' : 'Refer & Earn'}
              </Button>
            </div>

            <div className="pt-6 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
              * Tapping "Buy Now" will log a purchase request. Our administrators will contact you to finalize paperwork, payment, and transfer.
              <br />
              ** "Refer & Earn" generates a unique link. If a friend buys this car using your link, you'll earn a cash commission!
            </div>
          </div>
        </div>
      </div>

      {/* Share Referral Link Modal */}
      <Modal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share Link & Earn Commission"
        footer={<Button variant="secondary" onClick={() => setShareModalOpen(false)}>Done</Button>}
      >
        <div className="space-y-6">
          <div className="text-center p-4 bg-accent-50 rounded-2xl border border-accent-100 text-slate-800">
            <h4 className="font-extrabold text-accent-800 mb-1">Your Referral Link is Ready!</h4>
            <p className="text-xs text-slate-500">Share this link. When they purchase this vehicle, commission is credited to you.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Copy Referral URL</label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-grow rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 focus:outline-none"
              />
              <Button variant="secondary" onClick={copyToClipboard} className="px-3">
                <Copy size={16} className={copied ? 'text-emerald-500' : 'text-slate-500'} />
              </Button>
            </div>
            {copied && <span className="text-xs text-emerald-600 font-semibold">Link copied to clipboard!</span>}
          </div>

          <div className="flex justify-center pt-2">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Hey! Check out this pre-owned ${vehicle.year} ${vehicle.make} ${vehicle.model} on SV PreOwned. It's listed for sale here: ${generatedLink}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all text-sm"
            >
              <MessageSquare size={16} className="mr-2" />
              Share on WhatsApp
            </a>
          </div>
        </div>
      </Modal>

      {/* Buy Request Success Modal */}
      <Modal
        isOpen={requestSuccess}
        onClose={() => {
          setRequestSuccess(false);
          navigate('/buy');
        }}
        title="Request Received!"
        footer={
          <Button variant="primary" onClick={() => {
            setRequestSuccess(false);
            navigate('/buy');
          }}>
            Got it
          </Button>
        }
      >
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 text-emerald-600">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Purchase Request Logged</h3>
          <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
            Your request to buy the <span className="font-semibold text-slate-700">{vehicle.year} {vehicle.make} {vehicle.model}</span> has been logged. An administrator will contact you shortly to process your purchase order.
          </p>
        </div>
      </Modal>
    </div>
  );
};
export default VehicleDetail;
