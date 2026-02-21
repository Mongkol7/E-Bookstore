import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';

function OrderDetailPage() {
  // In a real app, you'd fetch this based on useParams().orderId
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [sampleOrder] = useState({
    id: 1,
    orderNumber: 'ORD-20250217-001',
    orderDate: '2025-02-17T10:30:00',
    status: 'delivered',
    deliveredDate: '2025-02-20T14:45:00',

    // Items
    items: [
      {
        id: 1,
        title: "Harry Potter and the Philosopher's Stone",
        author: 'J.K. Rowling',
        quantity: 1,
        price: 24.99,
        imageUrl:
          'https://images.unsplash.com/photo-1621351183012-e2f6d86f5b9e?w=500&h=750&fit=crop&q=80',
      },
      {
        id: 2,
        title: 'Atomic Habits',
        author: 'James Clear',
        quantity: 2,
        price: 27.0,
        imageUrl:
          'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=500&h=750&fit=crop&q=80',
      },
      {
        id: 3,
        title: 'The Alchemist',
        author: 'Paulo Coelho',
        quantity: 1,
        price: 19.99,
        imageUrl:
          'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=500&h=750&fit=crop&q=80',
      },
    ],

    // Pricing
    subtotal: 98.98,
    tax: 9.9,
    shipping: 0.0,
    discount: 0.0,
    total: 108.88,

    // Shipping Info
    shippingAddress: {
      name: 'John Doe',
      street: '123 Main Street, Apt 4B',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'United States',
      phone: '+1 (555) 123-4567',
      email: 'john.doe@example.com',
    },

    // Payment Info
    paymentMethod: 'Visa ending in 4242',
    paymentStatus: 'paid',

    // Tracking
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    estimatedDelivery: '2025-02-20',

    // Timeline
    timeline: [
      {
        status: 'Order Placed',
        date: '2025-02-17T10:30:00',
        completed: true,
        icon: 'check',
      },
      {
        status: 'Payment Confirmed',
        date: '2025-02-17T10:31:00',
        completed: true,
        icon: 'check',
      },
      {
        status: 'Processing',
        date: '2025-02-17T15:20:00',
        completed: true,
        icon: 'check',
      },
      {
        status: 'Shipped',
        date: '2025-02-18T09:15:00',
        completed: true,
        icon: 'truck',
      },
      {
        status: 'Out for Delivery',
        date: '2025-02-20T08:30:00',
        completed: true,
        icon: 'delivery',
      },
      {
        status: 'Delivered',
        date: '2025-02-20T14:45:00',
        completed: true,
        icon: 'check',
      },
    ],
  });

  const [order, setOrder] = useState(sampleOrder);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await apiFetch(`/api/orders/${orderId}`, { method: 'GET' });
        const payload = await parseJsonResponse(response);

        if (response.status === 401) {
          logoutAndRedirect(navigate);
          return;
        }

        if (!response.ok || !payload?.order) {
          return;
        }

        setOrder({
          ...sampleOrder,
          ...payload.order,
        });
      } catch {
        // Keep fallback sample order on network failure.
      }
    };

    fetchOrder();
  }, [orderId, sampleOrder]);

  const getStatusColor = (status) => {
    const colors = {
      delivered: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      shipped: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      processing: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      cancelled: 'text-red-400 bg-red-500/10 border-red-500/30',
    };
    return colors[status] || colors.processing;
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
          <Link
            to="/orders"
            className="text-slate-300 hover:text-emerald-400 transition-colors font-medium px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-slate-800/50 text-sm sm:text-base flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All Orders
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:py-12 px-3 sm:px-4 md:px-6 lg:px-8 relative">
        {/* Order Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                Order {order.orderNumber}
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                Placed on{' '}
                {new Date(order.orderDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-semibold border ${getStatusColor(order.status)}`}
            >
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
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Timeline */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-slate-800/50">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Order Timeline
              </h3>

              <div className="space-y-4">
                {order.timeline.map((item, index) => (
                  <div key={index} className="relative flex gap-4">
                    {/* Timeline Line */}
                    {index !== order.timeline.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-700/50"></div>
                    )}

                    {/* Timeline Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.completed
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/50'
                          : 'bg-slate-800 border-2 border-slate-700'
                      }`}
                    >
                      {item.completed ? (
                        <svg
                          className="w-5 h-5 text-slate-900"
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
                        <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                      )}
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4
                            className={`font-semibold text-base sm:text-lg ${
                              item.completed ? 'text-white' : 'text-slate-400'
                            }`}
                          >
                            {item.status}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-400 mt-1">
                            {new Date(item.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-slate-800/50">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-emerald-500"
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
                Order Items
              </h3>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-16 h-24 sm:w-20 sm:h-30 object-cover rounded-lg shadow-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-base sm:text-lg mb-1 truncate">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-400 mb-2">
                        {item.author}
                      </p>
                      <p className="text-sm text-emerald-400/90 mb-2">
                        Category: {item.category || 'Unknown Category'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                          Quantity: {item.quantity}
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-emerald-400">
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          {item.quantity > 1 && (
                            <div className="text-xs text-slate-500">
                              ${item.price.toFixed(2)} each
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-slate-800/50">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-emerald-500"
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
                Shipping Information
              </h3>

              <div className="space-y-4">
                <div className="p-4 bg-slate-800/30 rounded-xl">
                  <h4 className="font-semibold text-white mb-3">
                    Delivery Address
                  </h4>
                  <div className="space-y-1 text-slate-300 text-sm sm:text-base">
                    <p className="font-medium">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.street}</p>
                    <p>
                      {order.shippingAddress.city},{' '}
                      {order.shippingAddress.state}{' '}
                      {order.shippingAddress.zipCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    <p className="pt-2 text-slate-400">
                      {order.shippingAddress.phone}
                    </p>
                    <p className="text-slate-400">
                      {order.shippingAddress.email}
                    </p>
                  </div>
                </div>

                {order.trackingNumber && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <h4 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
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
                          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                        />
                      </svg>
                      Tracking Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">Carrier:</span>
                        <span className="text-white font-medium">
                          {order.carrier}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Tracking Number:</span>
                        <span className="text-white font-mono font-medium">
                          {order.trackingNumber}
                        </span>
                      </div>
                      <button className="mt-3 w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        Track Package
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-800/50 sticky top-24">
              <h3 className="text-xl font-bold text-white mb-6">
                Order Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white font-medium">
                    ${order.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-slate-400">Tax</span>
                  <span className="text-white font-medium">
                    ${order.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-slate-400">Shipping</span>
                  <span className="text-emerald-400 font-medium">
                    {order.shipping === 0
                      ? 'FREE'
                      : `$${order.shipping.toFixed(2)}`}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Discount</span>
                    <span className="text-emerald-400 font-medium">
                      -${order.discount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-700/50 pt-3 mt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-lg font-semibold text-white">
                      Total
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-400">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-4 bg-slate-800/30 rounded-xl mb-4">
                <h4 className="font-semibold text-white mb-2 text-sm">
                  Payment Method
                </h4>
                <p className="text-slate-300 text-sm">{order.paymentMethod}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium">
                    <svg
                      className="w-3 h-3"
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
                    {order.paymentStatus.charAt(0).toUpperCase() +
                      order.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-white font-medium rounded-xl hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2">
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
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download Invoice
                </button>

                {order.status === 'delivered' && (
                  <button className="w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2">
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reorder Items
                  </button>
                )}

                <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-slate-300 font-medium rounded-xl hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2">
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Need Help?
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      `}</style>
    </div>
  );
}

export default OrderDetailPage;

