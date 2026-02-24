import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';

const COUNTRY_OPTIONS = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Singapore',
  'Cambodia',
  'Thailand',
  'Vietnam',
];

const COUNTRY_ADDRESS_PRESETS = {
  'United States': {
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
  },
  Canada: {
    address: '123 Queen Street',
    city: 'Toronto',
    state: 'ON',
    zipCode: 'M5H 2N2',
  },
  'United Kingdom': {
    address: '221B Baker Street',
    city: 'London',
    state: 'Greater London',
    zipCode: 'NW1 6XE',
  },
  Australia: {
    address: '100 Collins Street',
    city: 'Melbourne',
    state: 'VIC',
    zipCode: '3000',
  },
  Singapore: {
    address: '1 Raffles Place',
    city: 'Singapore',
    state: 'Central Region',
    zipCode: '048616',
  },
  Cambodia: {
    address: '123 Norodom Boulevard',
    city: 'Phnom Penh',
    state: 'Phnom Penh',
    zipCode: '12000',
  },
  Thailand: {
    address: '88 Sukhumvit Road',
    city: 'Bangkok',
    state: 'Bangkok',
    zipCode: '10110',
  },
  Vietnam: {
    address: '10 Nguyen Hue Boulevard',
    city: 'Ho Chi Minh City',
    state: 'Ho Chi Minh',
    zipCode: '700000',
  },
};

function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Shipping Information
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
    // Payment Information
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    // Billing same as shipping
    sameAsShipping: true,
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
  });

  const checkoutItems = Array.isArray(location.state?.items)
    ? location.state.items
    : [];

  const orderSummary = useMemo(() => {
    const subtotal = checkoutItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
    const tax = subtotal * 0.1;
    const shipping = subtotal > 50 ? 0 : 5.99;

    return {
      items: checkoutItems,
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping,
    };
  }, [checkoutItems]);

  useEffect(() => {
    const autofillShipping = async () => {
      try {
        const response = await apiFetch('/api/auth/profile', { method: 'GET' });

        if (response.status === 401) {
          logoutAndRedirect(navigate);
          return;
        }

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const user = payload?.user || {};

        setFormData((prev) => ({
          ...prev,
          email: user.email || prev.email,
          firstName: user.first_name || prev.firstName,
          lastName: user.last_name || prev.lastName,
          phone: user.phone || prev.phone,
          address: user.address || prev.address,
        }));
      } catch {
        // No-op: checkout stays editable with manual input.
      }
    };

    autofillShipping();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      ...(name === 'country'
        ? {
            country: value,
            ...(COUNTRY_ADDRESS_PRESETS[value] || {}),
          }
        : {
            [name]: type === 'checkbox' ? checked : value,
          }),
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (currentStep < 3) {
      setCurrentStep(3);
      return;
    }

    if (checkoutItems.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Items',
        text: 'Your cart is empty. Please add items before placing order.',
        background: '#0f172a',
        color: '#e2e8f0',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    let placedOrder = null;
    try {
      const response = await apiFetch('/api/cart/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shippingAddress: {
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            street: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country,
            phone: formData.phone,
            email: formData.email,
          },
          paymentMethod: formData.cardNumber
            ? `Card ending in ${formData.cardNumber.slice(-4)}`
            : 'Card',
        }),
      });

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        logoutAndRedirect(navigate);
        return;
      }

      if (!response.ok) {
        await Swal.fire({
          icon: 'error',
          title: 'Checkout Failed',
          text: payload?.error || 'Unable to place order',
          background: '#0f172a',
          color: '#e2e8f0',
          confirmButtonColor: '#10b981',
        });
        return;
      }

      placedOrder = payload?.order || null;
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Unable to connect to server',
        background: '#0f172a',
        color: '#e2e8f0',
        confirmButtonColor: '#10b981',
      });
      return;
    }

    await Swal.fire({
      icon: 'success',
      title: 'Order placed successfully!',
      text: 'Your order has been confirmed.',
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#10b981',
    });

    if (placedOrder?.id) {
      try {
        sessionStorage.setItem(
          'latest_purchase',
          JSON.stringify({
            orderId: String(placedOrder.id),
            orderNumber: String(placedOrder.orderNumber || ''),
            placedAt: Date.now(),
          })
        );
      } catch {
        // Ignore storage errors.
      }
    }

    navigate('/orders', {
      state: {
        highlightLatestOrder: true,
        orderId: placedOrder?.id ? String(placedOrder.id) : undefined,
        orderNumber: placedOrder?.orderNumber || undefined,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-xl shadow-2xl border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-700/50 shadow-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-sm sm:rounded-md rotate-45 shadow-lg shadow-emerald-500/50"></div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              E-Bookstore
            </h1>
          </Link>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:py-12 px-3 sm:px-4 md:px-6 lg:px-8 relative">
        {checkoutItems.length === 0 && (
          <div className="mb-6 bg-red-950/30 border border-red-500/40 rounded-xl p-4 text-red-300">
            No cart items found. Please add items from the cart page before checkout.
            <Link to="/cart" className="inline-block ml-2 text-emerald-400 hover:text-emerald-300">
              Go to Cart
            </Link>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-6 sm:mb-12">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all duration-300 ${
                      currentStep >= step
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-900 shadow-lg shadow-emerald-500/50'
                        : 'bg-slate-800/50 text-slate-400 border-2 border-slate-700/50'
                    }`}
                  >
                    {currentStep > step ? (
                      <svg
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs sm:text-sm font-medium ${
                      currentStep >= step
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {step === 1
                      ? 'Shipping'
                      : step === 2
                        ? 'Payment'
                        : 'Review'}
                  </span>
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 sm:w-24 h-1 mx-2 rounded-full transition-all duration-300 ${
                      currentStep > step ? 'bg-emerald-500' : 'bg-slate-700/50'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-slate-800/50">
                {/* Step 1: Shipping Information */}
                {currentStep === 1 && (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Shipping Information
                      </h2>
                      <p className="text-slate-400 text-sm sm:text-base">
                        Enter your delivery details
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Email */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="you@example.com"
                          required
                        />
                      </div>

                      {/* Name Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            First Name *
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="John"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="Doe"
                            required
                          />
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="+1 (555) 123-4567"
                          required
                        />
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                          Country *
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          required
                        >
                          {COUNTRY_OPTIONS.map((country) => (
                            <option
                              key={country}
                              value={country}
                              className="bg-slate-900"
                            >
                              {country}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Address */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="123 Main Street, Apt 4B"
                          required
                        />
                      </div>

                      {/* City, State, Zip */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            City *
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="New York"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            State / Province *
                          </label>
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="NY"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            name="zipCode"
                            value={formData.zipCode}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="10001"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Payment Information */}
                {currentStep === 2 && (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Payment Information
                      </h2>
                      <p className="text-slate-400 text-sm sm:text-base">
                        Enter your payment details
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Card Number */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          required
                        />
                        <div className="flex gap-2 mt-2">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png"
                            alt="Visa"
                            className="h-6 opacity-70"
                          />
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png"
                            alt="Mastercard"
                            className="h-6 opacity-70"
                          />
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/601px-American_Express_logo_%282018%29.svg.png"
                            alt="Amex"
                            className="h-6 opacity-70"
                          />
                        </div>
                      </div>

                      {/* Cardholder Name */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          name="cardName"
                          value={formData.cardName}
                          onChange={handleInputChange}
                          className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      {/* Expiry and CVV */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            Expiry Date *
                          </label>
                          <input
                            type="text"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="MM/YY"
                            maxLength="5"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-2 uppercase tracking-wider">
                            CVV *
                          </label>
                          <input
                            type="text"
                            name="cvv"
                            value={formData.cvv}
                            onChange={handleInputChange}
                            className="w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                            placeholder="123"
                            maxLength="4"
                            required
                          />
                        </div>
                      </div>

                      {/* Same as Shipping */}
                      <div className="pt-4 border-t border-slate-700/50">
                        <label className="flex items-start cursor-pointer group">
                          <input
                            type="checkbox"
                            name="sameAsShipping"
                            checked={formData.sameAsShipping}
                            onChange={handleInputChange}
                            className="w-5 h-5 mt-0.5 rounded border-slate-600 bg-slate-800/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                          />
                          <span className="ml-3 text-sm sm:text-base text-slate-300 group-hover:text-white transition-colors">
                            Billing address same as shipping address
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Review Order */}
                {currentStep === 3 && (
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Review Your Order
                      </h2>
                      <p className="text-slate-400 text-sm sm:text-base">
                        Please verify your information before placing order
                      </p>
                    </div>

                    {/* Shipping Info Review */}
                    <div className="bg-slate-800/30 rounded-xl p-4 sm:p-6 border border-slate-700/30">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Shipping Address
                      </h3>
                      <div className="text-slate-300 text-sm sm:text-base space-y-1">
                        <p className="font-medium">
                          {formData.firstName} {formData.lastName}
                        </p>
                        <p>{formData.address}</p>
                        <p>
                          {formData.city}, {formData.state} {formData.zipCode}
                        </p>
                        <p>{formData.country}</p>
                        <p>{formData.phone}</p>
                        <p>{formData.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Payment Info Review */}
                    <div className="bg-slate-800/30 rounded-xl p-4 sm:p-6 border border-slate-700/30">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        Payment Method
                      </h3>
                      <div className="text-slate-300 text-sm sm:text-base space-y-1">
                        <p className="font-medium">{formData.cardName}</p>
                        <p>Card ending in {formData.cardNumber.slice(-4)}</p>
                        <p>Expires {formData.expiryDate}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Items Review */}
                    <div className="bg-slate-800/30 rounded-xl p-4 sm:p-6 border border-slate-700/30">
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                        Order Items ({orderSummary.items.length})
                      </h3>
                      <div className="space-y-2">
                        {orderSummary.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm sm:text-base text-slate-300"
                          >
                            <span>
                              {item.title} x {item.quantity}
                            </span>
                            <span className="font-medium">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 mt-6 sm:mt-8">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="flex-1 px-4 py-3 sm:py-3.5 bg-slate-800/50 border border-slate-700/50 text-white font-semibold rounded-lg sm:rounded-xl hover:bg-slate-700/50 transition-all duration-200 text-sm sm:text-base touch-manipulation active:scale-95"
                    >
                      Back
                    </button>
                  )}
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 px-4 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-900 font-semibold rounded-lg sm:rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation active:scale-95"
                    >
                      Continue
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="flex-1 px-4 py-3 sm:py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-900 font-semibold rounded-lg sm:rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation active:scale-95"
                    >
                      Place Order
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-800/50 sticky top-24">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                  Order Summary
                </h3>

                {/* Items */}
                <div className="space-y-3 mb-4 sm:mb-6 max-h-48 overflow-y-auto">
                  {orderSummary.items.map((item) => (
                    <div key={item.id} className="flex gap-2 text-sm">
                      <span className="flex-1 text-slate-300 truncate">
                        {item.title}
                      </span>
                      <span className="text-slate-400">x{item.quantity}</span>
                      <span className="text-white font-medium">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 border-t border-slate-700/50 pt-4">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-white font-medium">
                      ${orderSummary.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Tax</span>
                    <span className="text-white font-medium">
                      ${orderSummary.tax.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Shipping</span>
                    <span className="text-white font-medium">{orderSummary.shipping === 0 ? 'FREE' : `$${orderSummary.shipping.toFixed(2)}`}</span>
                  </div>

                  <div className="border-t border-slate-700/50 pt-3 sm:pt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base sm:text-lg font-semibold text-white">
                        Total
                      </span>
                      <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
                        ${orderSummary.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-semibold text-sm sm:text-base">
                      Secure Payment
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Your payment information is encrypted and secure
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}

export default CheckoutPage;


