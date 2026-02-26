import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';
import { OrderRowSkeleton } from '../../components/Skeleton';
import StoreNavbar from '../../components/StoreNavbar';

function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAllScope =
    new URLSearchParams(location.search).get('scope') === 'all';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightLatestOrder, setHighlightLatestOrder] = useState(false);
  const [highlightOrderId, setHighlightOrderId] = useState('');
  const [purchaseAlert, setPurchaseAlert] = useState('');

  useEffect(() => {
    if (location.state?.highlightLatestOrder) {
      setHighlightLatestOrder(true);
      const timer = setTimeout(() => {
        setHighlightLatestOrder(false);
      }, 15000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [location.state]);

  useEffect(() => {
    const stateOrderId = location.state?.orderId
      ? String(location.state.orderId)
      : '';
    const stateOrderNumber = location.state?.orderNumber
      ? String(location.state.orderNumber)
      : '';

    if (stateOrderId) {
      setHighlightOrderId(stateOrderId);
      setPurchaseAlert(
        stateOrderNumber
          ? `New purchase completed: ${stateOrderNumber}`
          : 'New purchase completed successfully.'
      );
      return;
    }

    try {
      const raw = sessionStorage.getItem('latest_purchase');
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      const storedOrderId = parsed?.orderId ? String(parsed.orderId) : '';
      const storedOrderNumber = parsed?.orderNumber ? String(parsed.orderNumber) : '';

      if (storedOrderId) {
        setHighlightOrderId(storedOrderId);
        setPurchaseAlert(
          storedOrderNumber
            ? `New purchase completed: ${storedOrderNumber}`
            : 'New purchase completed successfully.'
        );
      }
    } catch {
      // Ignore invalid session payload.
    }
  }, [location.state]);

  useEffect(() => {
    if (!purchaseAlert) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setPurchaseAlert('');
      try {
        sessionStorage.removeItem('latest_purchase');
      } catch {
        // Ignore storage errors.
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [purchaseAlert]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');

      try {
        if (isAllScope) {
          const adminResponse = await apiFetch('/api/admin/dashboard/orders', {
            method: 'GET',
          });
          const adminPayload = await parseJsonResponse(adminResponse);

          if (adminResponse.status === 401) {
            logoutAndRedirect(navigate);
            return;
          }

          if (adminResponse.ok) {
            setOrders(
              Array.isArray(adminPayload?.all_recent_orders)
                ? adminPayload.all_recent_orders
                : []
            );
            return;
          }

          // Non-admin users requesting `scope=all` fallback to their own order history.
          if (adminResponse.status !== 403) {
            setError(adminPayload?.error || 'Unable to load all orders');
            setOrders([]);
            return;
          }
        }

        const response = await apiFetch('/api/orders', { method: 'GET' });
        const payload = await parseJsonResponse(response);

        if (response.status === 401) {
          logoutAndRedirect(navigate);
          return;
        }

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
  }, [isAllScope, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      <StoreNavbar
        backTo={isAllScope ? '/admin/dashboard' : '/cart'}
        backLabel={isAllScope ? 'Back to Dashboard' : 'Back to Cart'}
      />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {isAllScope ? 'All Orders' : 'Order History'}
          </h1>
        </div>

        {!!purchaseAlert && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
            {purchaseAlert}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <OrderRowSkeleton key={`order-skeleton-${index}`} />
            ))}
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
            {orders.map((order, index) => {
              const primaryId =
                order?.id !== null && order?.id !== undefined && String(order.id) !== ''
                  ? String(order.id)
                  : '';
              const fallbackId = order?.orderNumber ? String(order.orderNumber) : '';
              const routeId = primaryId || fallbackId;

              if (!routeId) {
                return null;
              }

              const firstOrder = orders[0] || null;
              const firstPrimaryId =
                firstOrder?.id !== null && firstOrder?.id !== undefined && String(firstOrder.id) !== ''
                  ? String(firstOrder.id)
                  : '';
              const firstRouteId = firstPrimaryId || String(firstOrder?.orderNumber || '');

              const isHighlighted =
                (highlightOrderId && (highlightOrderId === primaryId || highlightOrderId === routeId))
                || (highlightLatestOrder && firstRouteId === routeId);

              return (
                <Link
                  key={`${routeId}-${index}`}
                  to={`/orders/${encodeURIComponent(routeId)}`}
                  className={`relative block rounded-xl p-4 transition-colors ${
                    isHighlighted
                      ? 'bg-slate-900/60 border border-emerald-400/90 shadow-[0_0_0_2px_rgba(16,185,129,0.9),0_0_30px_rgba(16,185,129,0.75),0_0_60px_rgba(16,185,129,0.45)]'
                      : 'bg-slate-900/50 border border-slate-700/50 hover:border-emerald-500/40'
                  }`}
                >
                  {isHighlighted && (
                    <>
                      <span className="pointer-events-none absolute -inset-2 rounded-xl bg-emerald-400/25 blur-md animate-pulse"></span>
                      <span className="pointer-events-none absolute -inset-1 rounded-xl border-2 border-emerald-400/90 animate-pulse"></span>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">{order.orderNumber || `Order #${routeId}`}</p>
                      <p className="text-slate-400 text-sm">
                        {order.orderDate ? new Date(order.orderDate).toLocaleString() : '-'}
                      </p>
                      {!!order?.owner?.name && (
                        <p className="text-slate-500 text-xs mt-0.5">
                          {`${order.owner.userType === 'admin' ? 'Admin' : 'Customer'}: ${order.owner.name}`}
                        </p>
                      )}
                    </div>
                    <p className="text-emerald-400 font-semibold">${Number(order.total || 0).toFixed(2)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage;

