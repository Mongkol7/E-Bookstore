import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost/Ecommerce/public';

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'GET',
          credentials: 'include',
        });

        const rawText = await response.text();
        const payload = rawText ? JSON.parse(rawText) : {};

        if (!response.ok) {
          setError(payload?.error || 'Unable to load order history');
          setOrders([]);
          return;
        }

        setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
      } catch {
        setError('Unable to connect to server');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Order History</h1>
          <Link to="/cart" className="text-emerald-400 hover:text-emerald-300 text-sm sm:text-base">
            Back to Cart
          </Link>
        </div>

        {loading && (
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 text-slate-300">
            Loading order history...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 text-slate-300">
            No order history yet.
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{order.orderNumber || `Order #${order.id}`}</p>
                    <p className="text-slate-400 text-sm">
                      {order.orderDate ? new Date(order.orderDate).toLocaleString() : '-'}
                    </p>
                  </div>
                  <p className="text-emerald-400 font-semibold">${Number(order.total || 0).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;
