import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StoreNavbar from '../../components/StoreNavbar';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';
import Skeleton from '../../components/Skeleton';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

function getPeriodStart(period) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    const day = start.getDay();
    const shift = (day + 6) % 7;
    start.setDate(start.getDate() - shift);
    return start;
  }

  if (period === 'month') {
    start.setDate(1);
    return start;
  }

  if (period === 'year') {
    start.setMonth(0, 1);
    return start;
  }

  return start;
}

function getOrderDate(order) {
  const raw = order?.orderDate || order?.created_at || order?.createdAt || null;
  if (!raw) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function numberValue(input) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOrderOwnerLabel(order) {
  const owner = order?.owner;
  if (!owner || typeof owner !== 'object') {
    return 'Unknown user';
  }

  const ownerType = String(owner.userType || '').toLowerCase();
  const ownerName = String(owner.name || '').trim();

  if (ownerType === 'customer') {
    return ownerName ? `Customer: ${ownerName}` : 'Customer';
  }

  if (ownerType === 'admin') {
    return ownerName ? `Admin: ${ownerName}` : 'Admin';
  }

  return ownerName || 'Unknown user';
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileName, setProfileName] = useState('Admin');
  const [books, setBooks] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [allRecentOrders, setAllRecentOrders] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');

      try {
        const [
          profileResponse,
          booksResponse,
          ordersResponse,
          dashboardOrdersResponse,
          customersResponse,
        ] =
          await Promise.all([
            apiFetch('/api/auth/profile', { method: 'GET' }),
            apiFetch('/api/books', { method: 'GET' }),
            apiFetch('/api/orders', { method: 'GET' }),
            apiFetch('/api/admin/dashboard/orders', { method: 'GET' }),
            apiFetch('/api/customers', { method: 'GET' }),
          ]);

        const [
          profilePayload,
          booksPayload,
          ordersPayload,
          dashboardOrdersPayload,
          customersPayload,
        ] =
          await Promise.all([
            parseJsonResponse(profileResponse),
            parseJsonResponse(booksResponse),
            parseJsonResponse(ordersResponse),
            parseJsonResponse(dashboardOrdersResponse),
            parseJsonResponse(customersResponse),
          ]);

        if (isCancelled) {
          return;
        }

        if (
          profileResponse.status === 401 ||
          booksResponse.status === 401 ||
          ordersResponse.status === 401 ||
          dashboardOrdersResponse.status === 401 ||
          customersResponse.status === 401
        ) {
          logoutAndRedirect(navigate);
          return;
        }

        if (!profileResponse.ok) {
          setError(profilePayload?.error || 'Unable to load admin profile.');
          setBooks([]);
          setAdminOrders([]);
          setAllRecentOrders([]);
          setCustomers([]);
          return;
        }

        const role = String(profilePayload?.user?.role || '').toLowerCase();
        if (role !== 'admin') {
          navigate('/', { replace: true });
          return;
        }

        setProfileName(profilePayload?.user?.name || 'Admin');

        if (
          !booksResponse.ok ||
          !ordersResponse.ok ||
          !dashboardOrdersResponse.ok ||
          !customersResponse.ok
        ) {
          const apiError =
            booksPayload?.error ||
            ordersPayload?.error ||
            dashboardOrdersPayload?.error ||
            customersPayload?.error ||
            'Unable to load dashboard data.';

          setError(apiError);
          setBooks(Array.isArray(booksPayload) ? booksPayload : []);
          setAdminOrders(
            Array.isArray(ordersPayload?.orders)
              ? ordersPayload.orders
              : Array.isArray(ordersPayload)
                ? ordersPayload
                : []
          );
          setAllRecentOrders(
            Array.isArray(dashboardOrdersPayload?.all_recent_orders)
              ? dashboardOrdersPayload.all_recent_orders
              : []
          );
          setCustomers(Array.isArray(customersPayload) ? customersPayload : []);
          return;
        }

        setBooks(Array.isArray(booksPayload) ? booksPayload : []);
        setAdminOrders(
          Array.isArray(ordersPayload?.orders)
            ? ordersPayload.orders
            : Array.isArray(ordersPayload)
              ? ordersPayload
              : []
        );
        setAllRecentOrders(
          Array.isArray(dashboardOrdersPayload?.all_recent_orders)
            ? dashboardOrdersPayload.all_recent_orders
            : []
        );
        setCustomers(Array.isArray(customersPayload) ? customersPayload : []);
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to server.');
          setBooks([]);
          setAdminOrders([]);
          setAllRecentOrders([]);
          setCustomers([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [navigate]);

  const filteredOrders = useMemo(() => {
    const periodStart = getPeriodStart(selectedPeriod);
    return allRecentOrders.filter((order) => {
      const date = getOrderDate(order);
      if (!date) {
        return false;
      }
      return date >= periodStart;
    });
  }, [allRecentOrders, selectedPeriod]);

  const totalRevenue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + numberValue(order?.total), 0),
    [filteredOrders]
  );

  const topBooks = useMemo(() => {
    return [...books]
      .map((book) => ({
        id: book.id,
        title: book.title || 'Untitled Book',
        sales: numberValue(book.sales_count ?? book.sold),
        stock: numberValue(book.stock),
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [books]);

  const lowStockBooks = useMemo(() => {
    return [...books]
      .map((book) => ({
        id: book.id,
        title: book.title || 'Untitled Book',
        stock: numberValue(book.stock),
      }))
      .filter((book) => book.stock > 0 && book.stock <= 10)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);
  }, [books]);

  const recentOrders = useMemo(() => {
    return [...allRecentOrders]
      .sort((a, b) => {
        const aDate = getOrderDate(a);
        const bDate = getOrderDate(b);
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      })
      .slice(0, 8);
  }, [allRecentOrders]);

  const adminRecentOrders = useMemo(() => {
    return [...adminOrders]
      .sort((a, b) => {
        const aDate = getOrderDate(a);
        const bDate = getOrderDate(b);
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0);
      })
      .slice(0, 8);
  }, [adminOrders]);

  const stats = [
    {
      label: 'Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      helper: `${selectedPeriod} total`,
    },
    {
      label: 'Orders',
      value: filteredOrders.length.toLocaleString(),
      helper: `${selectedPeriod} orders`,
    },
    {
      label: 'Customers',
      value: customers.length.toLocaleString(),
      helper: 'registered users',
    },
    {
      label: 'Books',
      value: books.length.toLocaleString(),
      helper: 'catalog items',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      <StoreNavbar />

      <main className="max-w-7xl mx-auto py-6 sm:py-8 px-3 sm:px-4 md:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Welcome, {profileName}. Monitor store performance in real time.
            </p>
          </div>
          <select
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
            className="w-full sm:w-auto rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </header>

        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`stats-skeleton-${index}`}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 space-y-3"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`panel-skeleton-${index}`}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 space-y-3"
                >
                  <Skeleton className="h-5 w-40" />
                  {Array.from({ length: 4 }).map((__, rowIndex) => (
                    <Skeleton key={`row-skeleton-${index}-${rowIndex}`} className="h-10 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-white mt-1">{stat.value}</p>
                  <p className="text-xs text-emerald-300 mt-1">{stat.helper}</p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
              <div className="xl:col-span-2 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <h2 className="text-lg font-semibold text-white mb-4">All Recent Orders</h2>
                {recentOrders.length === 0 ? (
                  <p className="text-sm text-slate-400">No orders available.</p>
                ) : (
                  <div className="space-y-2">
                    {recentOrders.map((order, index) => {
                      const orderId = order?.id ? String(order.id) : String(order?.orderNumber || '');
                      return (
                        <Link
                          key={orderId || `order-${index}`}
                          to={orderId ? `/orders/${encodeURIComponent(orderId)}` : '/orders'}
                          className="block rounded-lg border border-slate-800/60 bg-slate-800/30 px-3 py-2 hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {order?.orderNumber || `Order #${orderId || 'Unknown'}`}
                              </p>
                              <p className="text-xs text-slate-400">
                                {getOrderDate(order)?.toLocaleString() || 'No date'}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {getOrderOwnerLabel(order)}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-emerald-300">
                              ${numberValue(order?.total).toFixed(2)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">Admin Recent Orders</h2>
                  <Link to="/orders" className="text-xs text-emerald-300 hover:text-emerald-200">
                    Open mine
                  </Link>
                </div>
                {adminRecentOrders.length === 0 ? (
                  <p className="text-sm text-slate-400">No recent admin orders.</p>
                ) : (
                  <div className="space-y-2">
                    {adminRecentOrders.map((order, index) => {
                      const orderId = order?.id ? String(order.id) : String(order?.orderNumber || '');
                      return (
                        <Link
                          key={orderId || `admin-order-${index}`}
                          to={orderId ? `/orders/${encodeURIComponent(orderId)}` : '/orders'}
                          className="block rounded-lg border border-slate-800/60 bg-slate-800/30 px-3 py-2 hover:border-emerald-500/40 transition-colors"
                        >
                          <p className="text-sm font-semibold text-white truncate">
                            {order?.orderNumber || `Order #${orderId || 'Unknown'}`}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-slate-400">
                              {getOrderDate(order)?.toLocaleString() || 'No date'}
                            </p>
                            <p className="text-sm font-semibold text-emerald-300">
                              ${numberValue(order?.total).toFixed(2)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Low Stock</h2>
              {lowStockBooks.length === 0 ? (
                <p className="text-sm text-slate-400">No low-stock books right now.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lowStockBooks.map((book) => (
                    <div
                      key={book.id}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-white">{book.title}</p>
                      <p className="text-xs text-amber-300">Stock left: {book.stock}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Top Selling Books</h2>
              {topBooks.length === 0 ? (
                <p className="text-sm text-slate-400">No sales data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-800/80">
                        <th className="py-2 pr-3">Book</th>
                        <th className="py-2 pr-3">Sales</th>
                        <th className="py-2 pr-3">Current Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBooks.map((book) => (
                        <tr key={book.id} className="border-b border-slate-800/40 last:border-0">
                          <td className="py-2 pr-3 text-white">{book.title}</td>
                          <td className="py-2 pr-3 text-emerald-300">{book.sales.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-slate-300">{book.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
