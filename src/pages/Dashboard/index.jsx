import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import StoreNavbar from '../../components/StoreNavbar';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';
import Skeleton from '../../components/Skeleton';
import BookSearchControls from '../../components/BookSearchControls';

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
];

const MANAGEMENT_TABS = [
  { key: 'customers', label: 'Customers', icon: '👥' },
  { key: 'books', label: 'Books', icon: '📚' },
  { key: 'categories', label: 'Categories', icon: '🏷️' },
  { key: 'authors', label: 'Authors', icon: '✍️' },
];

const BOOK_SEARCH_SCOPE_OPTIONS = [
  { value: 'all', label: 'Search: All' },
  { value: 'name', label: 'Search: Book Name' },
  { value: 'author', label: 'Search: Author' },
  { value: 'category', label: 'Search: Category' },
];

const BOOK_FILTER_OPTIONS = [
  { value: 'none', label: 'No Filter' },
  { value: 'categories', label: 'Categories' },
  { value: 'authors', label: 'Authors' },
  { value: 'price', label: 'Price' },
  { value: 'trending', label: 'Trending (Most Sales)' },
];

const CUSTOMER_SEARCH_SCOPE_OPTIONS = [
  { value: 'all', label: 'Search: All' },
  { value: 'name', label: 'Search: Name' },
  { value: 'email', label: 'Search: Email' },
  { value: 'phone', label: 'Search: Phone' },
];

const CUSTOMER_FILTER_OPTIONS = [
  { value: 'none', label: 'Sort: Newest' },
  { value: 'name', label: 'Sort: Name A-Z' },
  { value: 'email', label: 'Sort: Email A-Z' },
];

const CATEGORY_SEARCH_SCOPE_OPTIONS = [
  { value: 'all', label: 'Search: All' },
  { value: 'name', label: 'Search: Name' },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: 'none', label: 'Sort: Newest' },
  { value: 'name', label: 'Sort: Name A-Z' },
  { value: 'books', label: 'Sort: Most Books' },
];

const AUTHOR_SEARCH_SCOPE_OPTIONS = [
  { value: 'all', label: 'Search: All' },
  { value: 'name', label: 'Search: Name' },
  { value: 'bio', label: 'Search: Bio' },
];

const AUTHOR_FILTER_OPTIONS = [
  { value: 'none', label: 'Sort: Newest' },
  { value: 'name', label: 'Sort: Name A-Z' },
  { value: 'books', label: 'Sort: Most Books' },
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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatchText(text, query, enabled = true, keyPrefix = 'hl') {
  const source = String(text || '');
  const cleanedQuery = String(query || '').trim();

  if (!enabled || !cleanedQuery) {
    return source;
  }

  const matcher = new RegExp(`(${escapeRegExp(cleanedQuery)})`, 'ig');
  const parts = source.split(matcher);
  const normalizedQuery = cleanedQuery.toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedQuery ? (
      <mark
        key={`${keyPrefix}-mark-${index}`}
        className="bg-emerald-400/30 text-emerald-200 rounded px-0.5"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${keyPrefix}-text-${index}`}>
        {part}
      </React.Fragment>
    ),
  );
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

function formatCompactCurrency(value) {
  const safeValue = numberValue(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(safeValue);
  } catch {
    return `$${safeValue.toFixed(2)}`;
  }
}

function buildTrendSeries(orders, period) {
  const now = new Date();
  const buckets = [];

  if (period === 'today') {
    const start = getPeriodStart('today');
    for (let i = 0; i < 8; i += 1) {
      const bucketStart = new Date(start.getTime() + i * 3 * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 3 * 60 * 60 * 1000);
      buckets.push({
        key: `today-${i}`,
        label: `${String(bucketStart.getHours()).padStart(2, '0')}:00`,
        start: bucketStart,
        end: bucketEnd,
        revenue: 0,
        orders: 0,
      });
    }
  } else if (period === 'week') {
    const start = getPeriodStart('week');
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i += 1) {
      const bucketStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + 24 * 60 * 60 * 1000);
      buckets.push({
        key: `week-${i}`,
        label: labels[i],
        start: bucketStart,
        end: bucketEnd,
        revenue: 0,
        orders: 0,
      });
    }
  } else if (period === 'month') {
    const start = getPeriodStart('month');
    const year = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let day = 1;
    let bucketIndex = 0;
    while (day <= daysInMonth) {
      const endDay = Math.min(day + 6, daysInMonth);
      const bucketStart = new Date(year, month, day, 0, 0, 0, 0);
      const bucketEnd = new Date(year, month, endDay + 1, 0, 0, 0, 0);
      buckets.push({
        key: `month-${bucketIndex}`,
        label: `${day}-${endDay}`,
        start: bucketStart,
        end: bucketEnd,
        revenue: 0,
        orders: 0,
      });
      day = endDay + 1;
      bucketIndex += 1;
    }
  } else {
    const yearStart = getPeriodStart('year');
    const year = yearStart.getFullYear();
    const labels = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    for (let i = 0; i < 12; i += 1) {
      const bucketStart = new Date(year, i, 1, 0, 0, 0, 0);
      const bucketEnd = new Date(year, i + 1, 1, 0, 0, 0, 0);
      buckets.push({
        key: `year-${i}`,
        label: labels[i],
        start: bucketStart,
        end: bucketEnd,
        revenue: 0,
        orders: 0,
      });
    }
  }

  orders.forEach((order) => {
    const date = getOrderDate(order);
    if (!date) {
      return;
    }

    const bucket = buckets.find(
      (item) => date >= item.start && date < item.end,
    );
    if (!bucket) {
      return;
    }

    bucket.orders += 1;
    bucket.revenue += numberValue(order?.total);
  });

  const maxRevenue = Math.max(1, ...buckets.map((item) => item.revenue));
  const maxOrderCount = Math.max(1, ...buckets.map((item) => item.orders));

  return buckets.map((bucket) => ({
    ...bucket,
    revenueHeight: bucket.revenue > 0 ? (bucket.revenue / maxRevenue) * 100 : 0,
    orderHeight: bucket.orders > 0 ? (bucket.orders / maxOrderCount) * 100 : 0,
  }));
}

function buildCandleSeries(trendSeries) {
  if (!Array.isArray(trendSeries) || trendSeries.length === 0) {
    return [];
  }

  let previousClose = 64;
  const rawSeries = trendSeries.map((bucket, index) => {
    const revenuePulse = numberValue(bucket?.revenueHeight);
    const orderPulse = numberValue(bucket?.orderHeight);
    const wave = Math.sin(index * 1.2) * 1.8 + Math.cos(index * 0.7) * 1.2;
    const momentum = (revenuePulse - 50) * 0.08 + (orderPulse - 50) * 0.06 + wave;

    const open = previousClose;
    const close = Math.max(12, open + momentum);
    const high =
      Math.max(open, close) + 1.8 + (Math.max(revenuePulse, orderPulse) / 100) * 2.8;
    const low =
      Math.max(
        4,
        Math.min(open, close) - (1.5 + (Math.max(0, 100 - revenuePulse) / 100) * 2.2),
      );

    previousClose = close;

    return {
      key: String(bucket?.key || index),
      label: String(bucket?.label || index + 1),
      open,
      close,
      high,
      low,
      isUp: close >= open,
    };
  });

  const minLow = Math.min(...rawSeries.map((item) => item.low));
  const maxHigh = Math.max(...rawSeries.map((item) => item.high));
  const range = Math.max(1, maxHigh - minLow);

  return rawSeries.map((item) => ({
    ...item,
    lowPct: ((item.low - minLow) / range) * 100,
    highPct: ((item.high - minLow) / range) * 100,
    openPct: ((item.open - minLow) / range) * 100,
    closePct: ((item.close - minLow) / range) * 100,
  }));
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
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeManagerTab, setActiveManagerTab] = useState('customers');
  const [savingManager, setSavingManager] = useState(false);
  const [managerMessage, setManagerMessage] = useState({ type: '', text: '' });

  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
  });

  const [editingAuthorId, setEditingAuthorId] = useState(null);
  const [authorForm, setAuthorForm] = useState({
    name: '',
    bio: '',
  });

  const [editingBookId, setEditingBookId] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    author_id: '',
    category_id: '',
    image: '',
    published_date: '',
  });
  const [managerBookSearchText, setManagerBookSearchText] = useState('');
  const [managerBookSearchScope, setManagerBookSearchScope] = useState('all');
  const [managerBookFilterType, setManagerBookFilterType] = useState('none');
  const [managerCustomerSearchText, setManagerCustomerSearchText] = useState('');
  const [managerCustomerSearchScope, setManagerCustomerSearchScope] =
    useState('all');
  const [managerCustomerFilterType, setManagerCustomerFilterType] =
    useState('none');
  const [managerCategorySearchText, setManagerCategorySearchText] = useState('');
  const [managerCategorySearchScope, setManagerCategorySearchScope] =
    useState('all');
  const [managerCategoryFilterType, setManagerCategoryFilterType] =
    useState('none');
  const [managerAuthorSearchText, setManagerAuthorSearchText] = useState('');
  const [managerAuthorSearchScope, setManagerAuthorSearchScope] =
    useState('all');
  const [managerAuthorFilterType, setManagerAuthorFilterType] = useState('none');
  const [lowStockRestockByBookId, setLowStockRestockByBookId] = useState({});
  const [activeRestockBookId, setActiveRestockBookId] = useState(null);

  const revenueSectionRef = useRef(null);
  const breakdownSectionRef = useRef(null);
  const candleSectionRef = useRef(null);
  const overviewSectionRef = useRef(null);
  const graphSectionRef = useRef(null);
  const ordersSectionRef = useRef(null);
  const managementSectionRef = useRef(null);
  const [hasRevenueSectionEntered, setHasRevenueSectionEntered] = useState(false);
  const [hasBreakdownSectionEntered, setHasBreakdownSectionEntered] = useState(false);
  const [hasCandleSectionEntered, setHasCandleSectionEntered] = useState(false);
  const [isRevenueSectionVisible, setIsRevenueSectionVisible] = useState(false);
  const [isBreakdownSectionVisible, setIsBreakdownSectionVisible] = useState(false);
  const [isCandleSectionVisible, setIsCandleSectionVisible] = useState(false);
  const [revenueAnimationTick, setRevenueAnimationTick] = useState(0);
  const [breakdownAnimationTick, setBreakdownAnimationTick] = useState(0);
  const [candleAnimationTick, setCandleAnimationTick] = useState(0);
  const [pendingRevenueReplay, setPendingRevenueReplay] = useState(true);
  const [pendingBreakdownReplay, setPendingBreakdownReplay] = useState(true);
  const [pendingCandleReplay, setPendingCandleReplay] = useState(true);
  const [isManagerPhone, setIsManagerPhone] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(max-width: 639px)').matches;
  });
  const [isManagerFormModalOpen, setIsManagerFormModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia('(max-width: 639px)');
    const handleChange = (event) => {
      setIsManagerPhone(event.matches);
      if (!event.matches) {
        setIsManagerFormModalOpen(false);
      }
    };

    setIsManagerPhone(media.matches);
    media.addEventListener('change', handleChange);
    return () => {
      media.removeEventListener('change', handleChange);
    };
  }, []);

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
          authorsResponse,
          categoriesResponse,
          customersResponse,
        ] = await Promise.all([
          apiFetch('/api/auth/profile', { method: 'GET' }),
          apiFetch('/api/books', { method: 'GET' }),
          apiFetch('/api/orders', { method: 'GET' }),
          apiFetch('/api/admin/dashboard/orders', { method: 'GET' }),
          apiFetch('/api/authors', { method: 'GET' }),
          apiFetch('/api/categories', { method: 'GET' }),
          apiFetch('/api/customers', { method: 'GET' }),
        ]);

        const [
          profilePayload,
          booksPayload,
          ordersPayload,
          dashboardOrdersPayload,
          authorsPayload,
          categoriesPayload,
          customersPayload,
        ] = await Promise.all([
          parseJsonResponse(profileResponse),
          parseJsonResponse(booksResponse),
          parseJsonResponse(ordersResponse),
          parseJsonResponse(dashboardOrdersResponse),
          parseJsonResponse(authorsResponse),
          parseJsonResponse(categoriesResponse),
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
          authorsResponse.status === 401 ||
          categoriesResponse.status === 401 ||
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
          setAuthors([]);
          setCategories([]);
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
          !authorsResponse.ok ||
          !categoriesResponse.ok ||
          !customersResponse.ok
        ) {
          const apiError =
            booksPayload?.error ||
            ordersPayload?.error ||
            dashboardOrdersPayload?.error ||
            authorsPayload?.error ||
            categoriesPayload?.error ||
            customersPayload?.error ||
            'Unable to load dashboard data.';

          setError(apiError);
          setBooks(Array.isArray(booksPayload) ? booksPayload : []);
          setAdminOrders(
            Array.isArray(ordersPayload?.orders)
              ? ordersPayload.orders
              : Array.isArray(ordersPayload)
                ? ordersPayload
                : [],
          );
          setAllRecentOrders(
            Array.isArray(dashboardOrdersPayload?.all_recent_orders)
              ? dashboardOrdersPayload.all_recent_orders
              : [],
          );
          setCustomers(Array.isArray(customersPayload) ? customersPayload : []);
          setAuthors(Array.isArray(authorsPayload) ? authorsPayload : []);
          setCategories(
            Array.isArray(categoriesPayload) ? categoriesPayload : [],
          );
          return;
        }

        setBooks(Array.isArray(booksPayload) ? booksPayload : []);
        setAdminOrders(
          Array.isArray(ordersPayload?.orders)
            ? ordersPayload.orders
            : Array.isArray(ordersPayload)
              ? ordersPayload
              : [],
        );
        setAllRecentOrders(
          Array.isArray(dashboardOrdersPayload?.all_recent_orders)
            ? dashboardOrdersPayload.all_recent_orders
            : [],
        );
        setCustomers(Array.isArray(customersPayload) ? customersPayload : []);
        setAuthors(Array.isArray(authorsPayload) ? authorsPayload : []);
        setCategories(
          Array.isArray(categoriesPayload) ? categoriesPayload : [],
        );
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to server.');
          setBooks([]);
          setAdminOrders([]);
          setAllRecentOrders([]);
          setCustomers([]);
          setAuthors([]);
          setCategories([]);
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

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === revenueSectionRef.current) {
            setIsRevenueSectionVisible(entry.isIntersecting);
            if (entry.isIntersecting) {
              setHasRevenueSectionEntered(true);
            }
          }

          if (entry.target === breakdownSectionRef.current) {
            setIsBreakdownSectionVisible(entry.isIntersecting);
            if (entry.isIntersecting) {
              setHasBreakdownSectionEntered(true);
            }
          }

          if (entry.target === candleSectionRef.current) {
            setIsCandleSectionVisible(entry.isIntersecting);
            if (entry.isIntersecting) {
              setHasCandleSectionEntered(true);
            }
          }
        });
      },
      {
        threshold: 0.2,
      },
    );

    const revenueElement = revenueSectionRef.current;
    const breakdownElement = breakdownSectionRef.current;
    const candleElement = candleSectionRef.current;

    if (revenueElement) {
      observer.observe(revenueElement);
      const rect = revenueElement.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < viewportHeight && rect.bottom > 0) {
        setIsRevenueSectionVisible(true);
        setHasRevenueSectionEntered(true);
      }
    }
    if (breakdownElement) {
      observer.observe(breakdownElement);
      const rect = breakdownElement.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < viewportHeight && rect.bottom > 0) {
        setIsBreakdownSectionVisible(true);
        setHasBreakdownSectionEntered(true);
      }
    }
    if (candleElement) {
      observer.observe(candleElement);
      const rect = candleElement.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < viewportHeight && rect.bottom > 0) {
        setIsCandleSectionVisible(true);
        setHasCandleSectionEntered(true);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  useEffect(() => {
    if (hasRevenueSectionEntered) {
      setPendingRevenueReplay(true);
    }
    if (hasBreakdownSectionEntered) {
      setPendingBreakdownReplay(true);
    }
    if (hasCandleSectionEntered) {
      setPendingCandleReplay(true);
    }
  }, [
    selectedPeriod,
    hasRevenueSectionEntered,
    hasBreakdownSectionEntered,
    hasCandleSectionEntered,
  ]);

  useEffect(() => {
    if (
      hasRevenueSectionEntered &&
      isRevenueSectionVisible &&
      pendingRevenueReplay
    ) {
      setRevenueAnimationTick((previous) => previous + 1);
      setPendingRevenueReplay(false);
    }
  }, [
    hasRevenueSectionEntered,
    isRevenueSectionVisible,
    pendingRevenueReplay,
  ]);

  useEffect(() => {
    if (
      hasBreakdownSectionEntered &&
      isBreakdownSectionVisible &&
      pendingBreakdownReplay
    ) {
      setBreakdownAnimationTick((previous) => previous + 1);
      setPendingBreakdownReplay(false);
    }
  }, [
    hasBreakdownSectionEntered,
    isBreakdownSectionVisible,
    pendingBreakdownReplay,
  ]);

  useEffect(() => {
    if (
      hasCandleSectionEntered &&
      isCandleSectionVisible &&
      pendingCandleReplay
    ) {
      setCandleAnimationTick((previous) => previous + 1);
      setPendingCandleReplay(false);
    }
  }, [hasCandleSectionEntered, isCandleSectionVisible, pendingCandleReplay]);

  const refreshBooks = async () => {
    const response = await apiFetch('/api/books', { method: 'GET' });
    const payload = await parseJsonResponse(response);
    if (response.status === 401) {
      logoutAndRedirect(navigate);
      return false;
    }
    if (!response.ok) {
      setManagerMessage({
        type: 'error',
        text: payload?.error || 'Unable to refresh books.',
      });
      return false;
    }
    setBooks(Array.isArray(payload) ? payload : []);
    return true;
  };

  const refreshCustomers = async () => {
    const response = await apiFetch('/api/customers', { method: 'GET' });
    const payload = await parseJsonResponse(response);
    if (response.status === 401) {
      logoutAndRedirect(navigate);
      return false;
    }
    if (!response.ok) {
      setManagerMessage({
        type: 'error',
        text: payload?.error || 'Unable to refresh customers.',
      });
      return false;
    }
    setCustomers(Array.isArray(payload) ? payload : []);
    return true;
  };

  const refreshAuthors = async () => {
    const response = await apiFetch('/api/authors', { method: 'GET' });
    const payload = await parseJsonResponse(response);
    if (response.status === 401) {
      logoutAndRedirect(navigate);
      return false;
    }
    if (!response.ok) {
      setManagerMessage({
        type: 'error',
        text: payload?.error || 'Unable to refresh authors.',
      });
      return false;
    }
    setAuthors(Array.isArray(payload) ? payload : []);
    return true;
  };

  const refreshCategories = async () => {
    const response = await apiFetch('/api/categories', { method: 'GET' });
    const payload = await parseJsonResponse(response);
    if (response.status === 401) {
      logoutAndRedirect(navigate);
      return false;
    }
    if (!response.ok) {
      setManagerMessage({
        type: 'error',
        text: payload?.error || 'Unable to refresh categories.',
      });
      return false;
    }
    setCategories(Array.isArray(payload) ? payload : []);
    return true;
  };

  const submitManagerRequest = async (
    path,
    method,
    requestBody,
    successMessage,
  ) => {
    setSavingManager(true);
    setManagerMessage({ type: '', text: '' });

    try {
      const response = await apiFetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        logoutAndRedirect(navigate);
        return false;
      }

      if (!response.ok) {
        setManagerMessage({
          type: 'error',
          text: payload?.error || 'Operation failed.',
        });
        return false;
      }

      setManagerMessage({
        type: 'success',
        text: successMessage,
      });
      return true;
    } catch {
      setManagerMessage({
        type: 'error',
        text: 'Unable to connect to server.',
      });
      return false;
    } finally {
      setSavingManager(false);
    }
  };

  const openManagerFormModalIfPhone = () => {
    if (isManagerPhone) {
      setIsManagerFormModalOpen(true);
    }
  };

  const closeManagerFormModal = () => {
    setIsManagerFormModalOpen(false);
  };

  const confirmDeleteAction = async (entityLabel) => {
    const result = await Swal.fire({
      title: `Delete ${entityLabel}?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      background: '#0f172a',
      color: '#e2e8f0',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
    });

    return result.isConfirmed;
  };

  const handleCustomerSubmit = async (event) => {
    event.preventDefault();

    if (!editingCustomerId) {
      setManagerMessage({
        type: 'error',
        text: 'Adding customers is disabled here. Select a customer and use Edit.',
      });
      return;
    }

    const payload = {
      id: editingCustomerId,
      first_name: customerForm.first_name.trim(),
      last_name: customerForm.last_name.trim(),
      email: customerForm.email.trim(),
      phone: customerForm.phone.trim() || null,
      address: customerForm.address.trim() || null,
      ...(customerForm.password.trim()
        ? { password: customerForm.password }
        : {}),
    };

    const success = await submitManagerRequest(
      '/api/customers/put',
      'PUT',
      payload,
      'Customer updated successfully.',
    );

    if (!success) {
      return;
    }

    await refreshCustomers();
    setCustomerForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      address: '',
    });
    setEditingCustomerId(null);
    closeManagerFormModal();
  };

  const handleDeleteCustomer = async (customerId, customerLabel = 'customer') => {
    const confirmed = await confirmDeleteAction(customerLabel);
    if (!confirmed) {
      return;
    }

    const success = await submitManagerRequest(
      '/api/customers/delete',
      'DELETE',
      { id: customerId },
      'Customer deleted successfully.',
    );
    if (success) {
      await refreshCustomers();
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    const name = categoryForm.name.trim();
    if (!name) {
      setManagerMessage({ type: 'error', text: 'Category name is required.' });
      return;
    }

    const isEditing = editingCategoryId !== null;
    const payload = isEditing ? { id: editingCategoryId, name } : { name };
    const success = await submitManagerRequest(
      isEditing ? '/api/categories/put' : '/api/categories/post',
      isEditing ? 'PUT' : 'POST',
      payload,
      isEditing
        ? 'Category updated successfully.'
        : 'Category created successfully.',
    );
    if (!success) {
      return;
    }

    await Promise.all([refreshCategories(), refreshBooks()]);
    setCategoryForm({ name: '' });
    setEditingCategoryId(null);
    closeManagerFormModal();
  };

  const handleDeleteCategory = async (
    categoryId,
    categoryLabel = 'category',
  ) => {
    const confirmed = await confirmDeleteAction(categoryLabel);
    if (!confirmed) {
      return;
    }

    const success = await submitManagerRequest(
      '/api/categories/delete',
      'DELETE',
      { id: categoryId },
      'Category deleted successfully.',
    );
    if (success) {
      await Promise.all([refreshCategories(), refreshBooks()]);
    }
  };

  const handleAuthorSubmit = async (event) => {
    event.preventDefault();
    const name = authorForm.name.trim();
    if (!name) {
      setManagerMessage({ type: 'error', text: 'Author name is required.' });
      return;
    }

    const isEditing = editingAuthorId !== null;
    const payload = isEditing
      ? { id: editingAuthorId, name, bio: authorForm.bio.trim() || null }
      : { name, bio: authorForm.bio.trim() || null };

    const success = await submitManagerRequest(
      isEditing ? '/api/authors/put' : '/api/authors/post',
      isEditing ? 'PUT' : 'POST',
      payload,
      isEditing
        ? 'Author updated successfully.'
        : 'Author created successfully.',
    );
    if (!success) {
      return;
    }

    await Promise.all([refreshAuthors(), refreshBooks()]);
    setAuthorForm({ name: '', bio: '' });
    setEditingAuthorId(null);
    closeManagerFormModal();
  };

  const handleDeleteAuthor = async (authorId, authorLabel = 'author') => {
    const confirmed = await confirmDeleteAction(authorLabel);
    if (!confirmed) {
      return;
    }

    const success = await submitManagerRequest(
      '/api/authors/delete',
      'DELETE',
      { id: authorId },
      'Author deleted successfully.',
    );
    if (success) {
      await Promise.all([refreshAuthors(), refreshBooks()]);
    }
  };

  const handleBookSubmit = async (event) => {
    event.preventDefault();
    const isEditing = editingBookId !== null;

    const payload = {
      ...(isEditing ? { id: editingBookId } : {}),
      title: bookForm.title.trim(),
      description: bookForm.description.trim(),
      price: Number(bookForm.price || 0),
      stock: Number(bookForm.stock || 0),
      author_id: Number(bookForm.author_id || 0),
      category_id: Number(bookForm.category_id || 0),
      image: bookForm.image.trim(),
      published_date: bookForm.published_date,
    };

    if (
      !payload.title ||
      !payload.description ||
      !payload.image ||
      !payload.published_date ||
      payload.author_id <= 0 ||
      payload.category_id <= 0 ||
      payload.price < 0 ||
      payload.stock < 0
    ) {
      setManagerMessage({
        type: 'error',
        text: 'Complete all required book fields with valid values.',
      });
      return;
    }

    const success = await submitManagerRequest(
      isEditing ? '/api/books/put' : '/api/books/post',
      isEditing ? 'PUT' : 'POST',
      payload,
      isEditing ? 'Book updated successfully.' : 'Book created successfully.',
    );
    if (!success) {
      return;
    }

    await refreshBooks();
    setBookForm({
      title: '',
      description: '',
      price: '',
      stock: '',
      author_id: '',
      category_id: '',
      image: '',
      published_date: '',
    });
    setEditingBookId(null);
    closeManagerFormModal();
  };

  const handleDeleteBook = async (bookId, bookLabel = 'book') => {
    const confirmed = await confirmDeleteAction(bookLabel);
    if (!confirmed) {
      return;
    }

    const success = await submitManagerRequest(
      '/api/books/delete',
      'DELETE',
      { id: bookId },
      'Book deleted successfully.',
    );
    if (success) {
      await refreshBooks();
    }
  };

  const setLowStockRestockAmount = (bookId, rawValue) => {
    const key = String(bookId);
    const sanitized = String(rawValue || '').replace(/[^\d]/g, '');
    setLowStockRestockByBookId((prev) => ({
      ...prev,
      [key]: sanitized,
    }));
  };

  const handleLowStockRestock = async (bookId) => {
    const key = String(bookId);
    const requestedValue = numberValue(lowStockRestockByBookId[key]);
    const restockAmount = Math.floor(requestedValue);

    if (restockAmount <= 0) {
      setManagerMessage({
        type: 'error',
        text: 'Enter a restock quantity greater than 0.',
      });
      return;
    }

    setActiveRestockBookId(key);
    try {
      const success = await submitManagerRequest(
        '/api/books/stock',
        'PUT',
        { id: numberValue(bookId), quantity: restockAmount },
        `Restocked by ${restockAmount} successfully.`,
      );

      if (!success) {
        return;
      }

      await refreshBooks();
      setLowStockRestockByBookId((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setActiveRestockBookId(null);
    }
  };

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
    () =>
      filteredOrders.reduce((sum, order) => sum + numberValue(order?.total), 0),
    [filteredOrders],
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
      .filter((book) => book.stock <= 10)
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

  const authorNameById = useMemo(() => {
    const map = {};
    authors.forEach((author) => {
      map[String(author?.id ?? '')] = author?.name || 'Unknown Author';
    });
    return map;
  }, [authors]);

  const categoryNameById = useMemo(() => {
    const map = {};
    categories.forEach((category) => {
      map[String(category?.id ?? '')] = category?.name || 'Unknown Category';
    });
    return map;
  }, [categories]);

  const managerBookAuthorOptions = useMemo(() => {
    const names = new Set();
    books.forEach((book) => {
      const authorName =
        String(book?.author_name || '').trim() ||
        String(authorNameById[String(book?.author_id ?? '')] || '').trim();
      if (authorName) {
        names.add(authorName);
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [books, authorNameById]);

  const managerVisibleBooks = useMemo(() => {
    const query = managerBookSearchText.trim().toLowerCase();
    const scoped = [...books].filter((book) => {
      if (!query) {
        return true;
      }

      const title = String(book?.title || '').toLowerCase();
      const author = String(
        book?.author_name || authorNameById[String(book?.author_id ?? '')] || '',
      ).toLowerCase();
      const category = String(
        book?.category_name ||
          categoryNameById[String(book?.category_id ?? '')] ||
          '',
      ).toLowerCase();

      if (managerBookSearchScope === 'name') {
        return title.includes(query);
      }
      if (managerBookSearchScope === 'author') {
        return author.includes(query);
      }
      if (managerBookSearchScope === 'category') {
        return category.includes(query);
      }

      return (
        title.includes(query) || author.includes(query) || category.includes(query)
      );
    });

    if (managerBookFilterType === 'categories') {
      return scoped.sort((a, b) =>
        String(
          a?.category_name || categoryNameById[String(a?.category_id ?? '')] || '',
        ).localeCompare(
          String(
            b?.category_name || categoryNameById[String(b?.category_id ?? '')] || '',
          ),
        ),
      );
    }

    if (managerBookFilterType === 'authors') {
      return scoped.sort((a, b) =>
        String(
          a?.author_name || authorNameById[String(a?.author_id ?? '')] || '',
        ).localeCompare(
          String(
            b?.author_name || authorNameById[String(b?.author_id ?? '')] || '',
          ),
        ),
      );
    }

    if (managerBookFilterType === 'price') {
      return scoped.sort(
        (a, b) => numberValue(a?.price) - numberValue(b?.price),
      );
    }

    if (managerBookFilterType === 'trending') {
      return scoped.sort((a, b) => {
        const bScore = numberValue(b?.sales_count ?? b?.sold ?? b?.rating);
        const aScore = numberValue(a?.sales_count ?? a?.sold ?? a?.rating);
        return bScore - aScore;
      });
    }

    return scoped.sort((a, b) => numberValue(b?.id) - numberValue(a?.id));
  }, [
    books,
    managerBookSearchText,
    managerBookSearchScope,
    managerBookFilterType,
    authorNameById,
    categoryNameById,
  ]);

  const categoryBookCountById = useMemo(() => {
    const map = {};
    books.forEach((book) => {
      const key = String(book?.category_id ?? '');
      if (!key) {
        return;
      }
      map[key] = numberValue(map[key]) + 1;
    });
    return map;
  }, [books]);

  const authorBookCountById = useMemo(() => {
    const map = {};
    books.forEach((book) => {
      const key = String(book?.author_id ?? '');
      if (!key) {
        return;
      }
      map[key] = numberValue(map[key]) + 1;
    });
    return map;
  }, [books]);

  const managerVisibleCustomers = useMemo(() => {
    const query = managerCustomerSearchText.trim().toLowerCase();
    const scoped = [...customers].filter((customer) => {
      if (!query) {
        return true;
      }

      const fullName = `${String(customer?.first_name || '')} ${String(customer?.last_name || '')}`
        .trim()
        .toLowerCase();
      const email = String(customer?.email || '').toLowerCase();
      const phone = String(customer?.phone || '').toLowerCase();

      if (managerCustomerSearchScope === 'name') {
        return fullName.includes(query);
      }
      if (managerCustomerSearchScope === 'email') {
        return email.includes(query);
      }
      if (managerCustomerSearchScope === 'phone') {
        return phone.includes(query);
      }

      return (
        fullName.includes(query) || email.includes(query) || phone.includes(query)
      );
    });

    if (managerCustomerFilterType === 'name') {
      return scoped.sort((a, b) =>
        `${String(a?.first_name || '')} ${String(a?.last_name || '')}`
          .trim()
          .localeCompare(
            `${String(b?.first_name || '')} ${String(b?.last_name || '')}`.trim(),
          ),
      );
    }

    if (managerCustomerFilterType === 'email') {
      return scoped.sort((a, b) =>
        String(a?.email || '').localeCompare(String(b?.email || '')),
      );
    }

    return scoped.sort((a, b) => numberValue(b?.id) - numberValue(a?.id));
  }, [
    customers,
    managerCustomerSearchText,
    managerCustomerSearchScope,
    managerCustomerFilterType,
  ]);

  const managerVisibleCategories = useMemo(() => {
    const query = managerCategorySearchText.trim().toLowerCase();
    const scoped = [...categories].filter((category) => {
      if (!query) {
        return true;
      }
      const name = String(category?.name || '').toLowerCase();
      return name.includes(query);
    });

    if (managerCategoryFilterType === 'name') {
      return scoped.sort((a, b) =>
        String(a?.name || '').localeCompare(String(b?.name || '')),
      );
    }

    if (managerCategoryFilterType === 'books') {
      return scoped.sort((a, b) => {
        const bCount = numberValue(categoryBookCountById[String(b?.id ?? '')]);
        const aCount = numberValue(categoryBookCountById[String(a?.id ?? '')]);
        if (bCount !== aCount) {
          return bCount - aCount;
        }
        return numberValue(b?.id) - numberValue(a?.id);
      });
    }

    return scoped.sort((a, b) => numberValue(b?.id) - numberValue(a?.id));
  }, [
    categories,
    managerCategorySearchText,
    managerCategoryFilterType,
    categoryBookCountById,
  ]);

  const managerVisibleAuthors = useMemo(() => {
    const query = managerAuthorSearchText.trim().toLowerCase();
    const scoped = [...authors].filter((author) => {
      if (!query) {
        return true;
      }
      const name = String(author?.name || '').toLowerCase();
      const bio = String(author?.bio || '').toLowerCase();

      if (managerAuthorSearchScope === 'name') {
        return name.includes(query);
      }
      if (managerAuthorSearchScope === 'bio') {
        return bio.includes(query);
      }

      return name.includes(query) || bio.includes(query);
    });

    if (managerAuthorFilterType === 'name') {
      return scoped.sort((a, b) =>
        String(a?.name || '').localeCompare(String(b?.name || '')),
      );
    }

    if (managerAuthorFilterType === 'books') {
      return scoped.sort((a, b) => {
        const bCount = numberValue(authorBookCountById[String(b?.id ?? '')]);
        const aCount = numberValue(authorBookCountById[String(a?.id ?? '')]);
        if (bCount !== aCount) {
          return bCount - aCount;
        }
        return numberValue(b?.id) - numberValue(a?.id);
      });
    }

    return scoped.sort((a, b) => numberValue(b?.id) - numberValue(a?.id));
  }, [
    authors,
    managerAuthorSearchText,
    managerAuthorSearchScope,
    managerAuthorFilterType,
    authorBookCountById,
  ]);

  const stats = [
    {
      label: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      helper: `${selectedPeriod} period`,
      icon: '💰',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      label: 'Total Orders',
      value: filteredOrders.length.toLocaleString(),
      helper: `${selectedPeriod} orders`,
      icon: '📦',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      label: 'Customers',
      value: customers.length.toLocaleString(),
      helper: 'registered users',
      icon: '👥',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      label: 'Total Books',
      value: books.length.toLocaleString(),
      helper: 'in catalog',
      icon: '📚',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
  ];

  const trendSeries = useMemo(
    () => buildTrendSeries(filteredOrders, selectedPeriod),
    [filteredOrders, selectedPeriod],
  );
  const candleSeries = useMemo(
    () => buildCandleSeries(trendSeries),
    [trendSeries],
  );
  const candleLinePoints = useMemo(() => {
    if (candleSeries.length === 0) {
      return '';
    }

    return candleSeries
      .map((candle, index) => {
        const x =
          candleSeries.length <= 1
            ? 50
            : (index / (candleSeries.length - 1)) * 100;
        const y = 100 - candle.closePct;
        return `${x},${y}`;
      })
      .join(' ');
  }, [candleSeries]);

  const handleSectionNavClick = (sectionId) => {
    if (!sectionId) {
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    const isPhone = window.matchMedia('(max-width: 639px)').matches;
    const scrollOffset = isPhone ? 210 : 160;
    const top =
      target.getBoundingClientRect().top + window.scrollY - scrollOffset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: 'smooth',
    });
  };

  const dashboardSectionNav = [
    { key: 'overview', label: 'Overview', sectionId: 'dashboard-overview' },
    { key: 'graph', label: 'Graph', sectionId: 'dashboard-graph' },
    {
      key: 'recent-orders',
      label: 'Recent Orders',
      sectionId: 'dashboard-recent-orders',
    },
    {
      key: 'low-stock',
      label: 'Low Stock',
      sectionId: 'dashboard-low-stock',
    },
    {
      key: 'management',
      label: 'Management Center',
      sectionId: 'dashboard-management',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <StoreNavbar />

      <main className="max-w-[1400px] mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Welcome back,{' '}
                <span className="text-emerald-400 font-medium">
                  {profileName}
                </span>
              </p>
            </div>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              className="px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!loading && (
          <div className="sticky top-[124px] sm:top-[96px] z-20 mt-5 sm:mt-2 mb-8">
            <div className="rounded-xl border border-white/10 bg-slate-900/75 backdrop-blur-md px-2 py-2.5 sm:py-2 overflow-x-auto">
              <div className="inline-flex items-center gap-2 min-w-max">
                {dashboardSectionNav.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => handleSectionNavClick(section.sectionId)}
                    className="px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-sm font-medium text-slate-200 border border-white/10 bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/30 hover:text-emerald-300 transition-all"
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`stats-skeleton-${index}`}
                  className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 space-y-3"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="mb-6 rounded-xl border border-red-500/50 bg-red-500/10 backdrop-blur-sm p-4 text-red-300">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Modern Stats Cards */}
            <section
              id="dashboard-overview"
              ref={overviewSectionRef}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 scroll-mt-32"
            >
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="group relative rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  />

                  <div className="relative flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${stat.bgColor} border ${stat.borderColor} flex items-center justify-center text-2xl`}
                    >
                      {stat.icon}
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs uppercase tracking-wider font-medium mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-white mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-emerald-400">{stat.helper}</p>
                </div>
              ))}
            </section>

            <div
              id="dashboard-graph"
              ref={graphSectionRef}
              className="scroll-mt-32"
            >
              {/* Crypto-Style Line Graph */}
              <section
                ref={revenueSectionRef}
                className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 mb-8 overflow-hidden"
              >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Revenue Analytics
                  </h2>
                  <p className="text-sm text-slate-400">
                    Track your sales performance over time
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">
                      {totalRevenue > 0 ? '+' : ''}
                      {((totalRevenue / (totalRevenue + 1000)) * 100).toFixed(
                        1,
                      )}
                      %
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    $
                    {totalRevenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {trendSeries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">
                    No sales data available for this period
                  </p>
                </div>
              ) : (
                <div
                  key={`line-chart-${selectedPeriod}-${revenueAnimationTick}`}
                  className="relative h-64 overflow-hidden"
                >
                  <svg
                    viewBox={`0 0 ${trendSeries.length * 100} 200`}
                    className="w-full h-full"
                    preserveAspectRatio="none"
                    style={{
                      animation: hasRevenueSectionEntered
                        ? 'fadeIn 0.8s ease-out'
                        : 'none',
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="revenueGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
                        <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={`grid-${i}`}
                        x1="0"
                        y1={i * 40}
                        x2={trendSeries.length * 100}
                        y2={i * 40}
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Area fill */}
                    <path
                      d={`
                        M 0,${200 - trendSeries[0].revenueHeight * 2}
                        ${trendSeries
                          .map(
                            (bucket, i) =>
                              `L ${i * 100 + 50},${200 - bucket.revenueHeight * 2}`,
                          )
                          .join(' ')}
                        L ${(trendSeries.length - 1) * 100 + 50},200
                        L 0,200 Z
                      `}
                      fill="url(#revenueGradient)"
                      style={{
                        animation: hasRevenueSectionEntered
                          ? 'pathGrow 1.2s ease-out both'
                          : 'none',
                      }}
                    />

                    {/* Main line */}
                    <path
                      d={`
                        M 0,${200 - trendSeries[0].revenueHeight * 2}
                        ${trendSeries
                          .map(
                            (bucket, i) =>
                              `L ${i * 100 + 50},${200 - bucket.revenueHeight * 2}`,
                          )
                          .join(' ')}
                      `}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      style={{
                        animation: hasRevenueSectionEntered
                          ? 'pathDraw 1.5s ease-out both'
                          : 'none',
                        strokeDasharray: trendSeries.length * 100,
                        strokeDashoffset: trendSeries.length * 100,
                      }}
                    />

                    <defs>
                      <linearGradient
                        id="lineGradient"
                        x1="0"
                        x2="1"
                        y1="0"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="rgba(16, 185, 129, 0.8)" />
                        <stop offset="50%" stopColor="rgba(20, 184, 166, 1)" />
                        <stop
                          offset="100%"
                          stopColor="rgba(56, 189, 248, 0.8)"
                        />
                      </linearGradient>
                    </defs>

                    {/* Data points */}
                    {trendSeries.map((bucket, i) => (
                      <g key={`point-${i}`}>
                        <circle
                          cx={i * 100 + 50}
                          cy={200 - bucket.revenueHeight * 2}
                          r="4"
                          fill="rgba(16, 185, 129, 0.3)"
                          style={{
                            animation: hasRevenueSectionEntered
                              ? `pointPop 0.4s ease-out ${0.8 + i * 0.05}s both`
                              : 'none',
                          }}
                        />
                        <circle
                          cx={i * 100 + 50}
                          cy={200 - bucket.revenueHeight * 2}
                          r="2"
                          fill="#10b981"
                          className="graph-point"
                          style={{
                            animation: hasRevenueSectionEntered
                              ? `pointPop 0.4s ease-out ${0.85 + i * 0.05}s both`
                              : 'none',
                            cursor: 'pointer',
                          }}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* X-axis labels */}
                  <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4">
                    {trendSeries.map((bucket, index) => (
                      <div
                        key={`label-${index}`}
                        className="text-xs text-slate-500 font-medium"
                        style={{
                          animation: hasRevenueSectionEntered
                            ? `fadeIn 0.4s ease-out ${1.2 + index * 0.05}s both`
                            : 'none',
                        }}
                      >
                        {bucket.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats bar below graph */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Total Orders</p>
                  <p className="text-xl font-bold text-white">
                    {filteredOrders.length.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Avg Order Value</p>
                  <p className="text-xl font-bold text-emerald-400">
                    $
                    {filteredOrders.length > 0
                      ? (totalRevenue / filteredOrders.length).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Peak Day</p>
                  <p className="text-xl font-bold text-white">
                    {trendSeries.reduce(
                      (max, bucket) =>
                        bucket.revenue > max.revenue ? bucket : max,
                      trendSeries[0],
                    )?.label || 'N/A'}
                  </p>
                </div>
              </div>
              </section>

              {/* Bar Chart Section */}
              <section
                ref={breakdownSectionRef}
                className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 mb-8"
              >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Daily Breakdown
                  </h2>
                  <p className="text-sm text-slate-400">
                    Revenue and order comparison by day
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <span className="text-slate-300">Revenue</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                    <span className="text-slate-300">Orders</span>
                  </span>
                </div>
              </div>

              {trendSeries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto pb-2">
                  <div
                    key={`daily-breakdown-${selectedPeriod}-${breakdownAnimationTick}`}
                    className="grid gap-4 min-w-[680px]"
                    style={{
                      gridTemplateColumns: `repeat(${trendSeries.length}, minmax(80px, 1fr))`,
                    }}
                  >
                    {trendSeries.map((bucket, index) => (
                      <div key={bucket.key} className="group">
                        <div className="h-40 flex items-end justify-center gap-2 mb-3">
                          <div
                            className="w-6 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
                            style={{
                              height: `${bucket.revenueHeight}%`,
                              minHeight: bucket.revenue > 0 ? '8px' : '0px',
                              transformOrigin: 'bottom',
                              animation: hasBreakdownSectionEntered
                                ? `chartBarGrow 700ms ease-out ${index * 60}ms both`
                                : 'none',
                            }}
                            title={`Revenue: ${formatCompactCurrency(bucket.revenue)}`}
                          />
                          <div
                            className="w-6 rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all cursor-pointer"
                            style={{
                              height: `${bucket.orderHeight}%`,
                              minHeight: bucket.orders > 0 ? '8px' : '0px',
                              transformOrigin: 'bottom',
                              animation: hasBreakdownSectionEntered
                                ? `chartBarGrow 700ms ease-out ${index * 60 + 40}ms both`
                                : 'none',
                            }}
                            title={`Orders: ${bucket.orders}`}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-white mb-1">
                            {bucket.label}
                          </p>
                          <p className="text-xs text-emerald-400">
                            {formatCompactCurrency(bucket.revenue)}
                          </p>
                          <p className="text-xs text-blue-400">
                            {bucket.orders} orders
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </section>

              {/* Candlestick Pattern Section */}
              <section
                ref={candleSectionRef}
                className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 mb-8 overflow-hidden"
              >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Pattern Candles
                  </h2>
                  <p className="text-sm text-slate-400">
                    Crypto-style momentum view derived from current period flow
                  </p>
                </div>
                <div className="inline-flex items-center gap-4 text-xs font-medium">
                  <span className="inline-flex items-center gap-2 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Bull candle
                  </span>
                  <span className="inline-flex items-center gap-2 text-rose-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    Bear candle
                  </span>
                </div>
              </div>

              {candleSeries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No pattern data available</p>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-500/20 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.18),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.8))] p-3 sm:p-4">
                  <div
                    key={`candles-${selectedPeriod}-${candleAnimationTick}`}
                    className="relative h-[300px] sm:h-[320px] overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.08)_1px,transparent_1px)] [background-size:28px_28px,28px_28px]"
                  >
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <polyline
                        points={candleLinePoints}
                        fill="none"
                        stroke="rgba(99,102,241,0.85)"
                        strokeWidth="0.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          animation: hasCandleSectionEntered
                            ? 'candleLineDraw 1.1s ease-out both'
                            : 'none',
                          strokeDasharray: 300,
                          strokeDashoffset: 300,
                        }}
                      />
                    </svg>

                    <div
                      className="absolute inset-0 grid gap-1 sm:gap-2 px-2 sm:px-3 py-5"
                      style={{
                        gridTemplateColumns: `repeat(${candleSeries.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {candleSeries.map((candle, index) => {
                        const bodyBottom = Math.min(
                          candle.openPct,
                          candle.closePct,
                        );
                        const bodyHeight = Math.max(
                          2.4,
                          Math.abs(candle.closePct - candle.openPct),
                        );
                        const wickBottom = candle.lowPct;
                        const wickHeight = Math.max(
                          3,
                          candle.highPct - candle.lowPct,
                        );

                        return (
                          <div
                            key={`candle-${candle.key}-${index}`}
                            className="relative"
                          >
                            <div
                              className={`absolute left-1/2 -translate-x-1/2 w-[2px] rounded-full ${
                                candle.isUp ? 'bg-emerald-300/95' : 'bg-rose-300/95'
                              }`}
                              style={{
                                bottom: `${wickBottom}%`,
                                height: `${wickHeight}%`,
                                animation: hasCandleSectionEntered
                                  ? `candleRise 520ms ease-out ${index * 45}ms both`
                                  : 'none',
                              }}
                            />
                            <div
                              className={`absolute left-1/2 -translate-x-1/2 w-[72%] max-w-[16px] rounded-[3px] border ${
                                candle.isUp
                                  ? 'bg-emerald-400/90 border-emerald-200/70'
                                  : 'bg-rose-400/90 border-rose-200/70'
                              }`}
                              style={{
                                bottom: `${bodyBottom}%`,
                                height: `${bodyHeight}%`,
                                animation: hasCandleSectionEntered
                                  ? `candleRise 620ms ease-out ${index * 45 + 40}ms both`
                                  : 'none',
                                boxShadow: candle.isUp
                                  ? '0 0 16px rgba(16,185,129,0.32)'
                                  : '0 0 16px rgba(244,63,94,0.28)',
                              }}
                              title={`${candle.label}: ${candle.isUp ? 'Bull' : 'Bear'} candle`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute bottom-1 left-0 right-0 px-2 sm:px-3">
                      <div
                        className="grid gap-1 sm:gap-2"
                        style={{
                          gridTemplateColumns: `repeat(${candleSeries.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {candleSeries.map((candle, index) => {
                          const showLabelEvery = Math.max(
                            1,
                            Math.ceil(candleSeries.length / 6),
                          );
                          const shouldShow =
                            index % showLabelEvery === 0 ||
                            index === candleSeries.length - 1;

                          return (
                            <div
                              key={`candle-label-${candle.key}-${index}`}
                              className="text-center"
                            >
                              {shouldShow ? (
                                <span className="text-[10px] sm:text-xs text-slate-400">
                                  {candle.label}
                                </span>
                              ) : (
                                <span className="text-[10px] sm:text-xs text-transparent">
                                  .
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </section>
            </div>

            {/* Orders and Info Grid */}
            <div
              ref={ordersSectionRef}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 scroll-mt-32"
            >
              {/* Recent Orders - Takes 2 columns */}
              <div
                id="dashboard-recent-orders"
                className="lg:col-span-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 scroll-mt-32"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      Recent Orders
                    </h2>
                    <p className="text-sm text-slate-400">
                      {recentOrders.length} latest transactions
                    </p>
                  </div>
                  <Link
                    to="/orders?scope=all"
                    className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-all"
                  >
                    View All
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.slice(0, 6).map((order, index) => {
                      const orderId = order?.id
                        ? String(order.id)
                        : String(order?.orderNumber || '');
                      return (
                        <Link
                          key={orderId || `order-${index}`}
                          to={
                            orderId
                              ? `/orders/${encodeURIComponent(orderId)}?scope=all`
                              : '/orders?scope=all'
                          }
                          className="block group rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 hover:bg-white/10 hover:border-emerald-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white mb-1 truncate">
                                {order?.orderNumber || `#${orderId}`}
                              </p>
                              <p className="text-xs text-slate-400">
                                {getOrderDate(order)?.toLocaleDateString() ||
                                  'No date'}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {getOrderOwnerLabel(order)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-400">
                                ${numberValue(order?.total).toFixed(2)}
                              </p>
                              <svg
                                className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors ml-auto mt-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Low Stock Alert */}
              <div
                id="dashboard-low-stock"
                className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 scroll-mt-32"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      Low Stock
                    </h2>
                    <p className="text-sm text-slate-400">Needs restock</p>
                  </div>
                  <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-bold">
                    {lowStockBooks.length}
                  </span>
                </div>

                {lowStockBooks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">
                      All books well stocked
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockBooks.map((book) => {
                      const bookIdKey = String(book?.id ?? '');
                      const restockAmount =
                        lowStockRestockByBookId[bookIdKey] || '';
                      const isRestocking = activeRestockBookId === bookIdKey;

                      return (
                        <div
                        key={book.id}
                        className="rounded-xl bg-red-500/10 border border-red-500/20 p-4"
                      >
                        <p className="font-semibold text-white mb-1 text-sm">
                          {book.title}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-red-400">
                            {book.stock <= 0
                              ? 'Out of stock'
                              : `Only ${book.stock} left`}
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={restockAmount}
                              onChange={(event) =>
                                setLowStockRestockAmount(
                                  book.id,
                                  event.target.value,
                                )
                              }
                              placeholder="+10"
                              className="w-20 rounded-lg border border-white/15 bg-slate-900/60 px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                void handleLowStockRestock(book.id);
                              }}
                              disabled={savingManager || isRestocking}
                              className="text-xs rounded-lg border border-emerald-400/30 px-2.5 py-1 text-emerald-300 hover:text-emerald-200 hover:border-emerald-300/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                              {isRestocking ? 'Saving...' : 'Restock'}
                            </button>
                          </div>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Management Section */}
            <section
              id="dashboard-management"
              ref={managementSectionRef}
              className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 mb-8 scroll-mt-32"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    Management Center
                  </h2>
                  <p className="text-sm text-slate-400">
                    Add, edit, and manage your store data
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>{customers.length} Customers</span>
                  <span>•</span>
                  <span>{books.length} Books</span>
                  <span>•</span>
                  <span>{categories.length} Categories</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/10">
                {MANAGEMENT_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveManagerTab(tab.key);
                      setManagerMessage({ type: '', text: '' });
                      setIsManagerFormModalOpen(false);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeManagerTab === tab.key
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Message Banner */}
              {!!managerMessage.text && (
                <div
                  className={`mb-6 rounded-xl border p-4 ${
                    managerMessage.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      {managerMessage.type === 'success' ? (
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      ) : (
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      )}
                    </svg>
                    {managerMessage.text}
                  </div>
                </div>
              )}

              {isManagerPhone && isManagerFormModalOpen && (
                <button
                  type="button"
                  onClick={closeManagerFormModal}
                  className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm"
                  aria-label="Close form popup"
                />
              )}

              {/* Tab Content - Customers */}
              {activeManagerTab === 'customers' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Form */}
                  <div
                    className={`${
                      isManagerPhone
                        ? isManagerFormModalOpen
                          ? 'fixed inset-0 z-[75] flex items-center justify-center p-3'
                          : 'hidden'
                        : ''
                    }`}
                  >
                  <form
                    onSubmit={handleCustomerSubmit}
                    className={`relative space-y-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 ${
                      isManagerPhone
                        ? 'w-full max-w-xl max-h-[82vh] overflow-y-auto bg-slate-900/95 shadow-2xl'
                        : ''
                    }`}
                  >
                    <h3 className="text-base font-semibold text-white mb-3">
                      {editingCustomerId
                        ? `Edit Customer #${editingCustomerId}`
                        : 'Customer Editing'}
                    </h3>
                    {isManagerPhone && (
                      <button
                        type="button"
                        onClick={closeManagerFormModal}
                        className="absolute top-3 right-3 px-2 py-1 rounded-md border border-white/15 text-slate-300 text-xs hover:bg-white/10"
                      >
                        Close
                      </button>
                    )}
                    {!editingCustomerId && (
                      <p className="text-xs text-slate-400 mb-1">
                        Select a customer from the list and click Edit to update details.
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        disabled={!editingCustomerId}
                        value={customerForm.first_name}
                        onChange={(e) =>
                          setCustomerForm((prev) => ({
                            ...prev,
                            first_name: e.target.value,
                          }))
                        }
                        placeholder="First name"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <input
                        disabled={!editingCustomerId}
                        value={customerForm.last_name}
                        onChange={(e) =>
                          setCustomerForm((prev) => ({
                            ...prev,
                            last_name: e.target.value,
                          }))
                        }
                        placeholder="Last name"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <input
                      disabled={!editingCustomerId}
                      value={customerForm.email}
                      onChange={(e) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="Email address"
                      type="email"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <input
                      disabled={!editingCustomerId}
                      value={customerForm.password}
                      onChange={(e) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="New password (optional)"
                      type="password"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <input
                      disabled={!editingCustomerId}
                      value={customerForm.phone}
                      onChange={(e) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="Phone number"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <textarea
                      disabled={!editingCustomerId}
                      value={customerForm.address}
                      onChange={(e) =>
                        setCustomerForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Address"
                      rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingManager || !editingCustomerId}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingManager
                          ? 'Saving...'
                          : 'Update Customer'}
                      </button>
                      {editingCustomerId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCustomerId(null);
                            setCustomerForm({
                              first_name: '',
                              last_name: '',
                              email: '',
                              password: '',
                              phone: '',
                              address: '',
                            });
                            closeManagerFormModal();
                          }}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                  </div>

                  {/* List */}
                  <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                    <BookSearchControls
                      className="mb-4"
                      searchPlaceholder="Search customers by name, email, phone"
                      searchText={managerCustomerSearchText}
                      onSearchTextChange={setManagerCustomerSearchText}
                      searchScope={managerCustomerSearchScope}
                      onSearchScopeChange={setManagerCustomerSearchScope}
                      filterType={managerCustomerFilterType}
                      onFilterTypeChange={setManagerCustomerFilterType}
                      scopeOptions={CUSTOMER_SEARCH_SCOPE_OPTIONS}
                      filterOptions={CUSTOMER_FILTER_OPTIONS}
                      hintText={
                        managerCustomerFilterType === 'name'
                          ? 'Sorted by customer name'
                          : managerCustomerFilterType === 'email'
                            ? 'Sorted by email address'
                            : managerCustomerSearchText.trim()
                              ? `Searching "${managerCustomerSearchText.trim()}"`
                              : 'Sorted by newest customer'
                      }
                    />
                    <h3 className="text-base font-semibold text-white mb-3">
                      Customer List ({managerVisibleCustomers.length}/
                      {customers.length})
                    </h3>
                    <div className="max-h-[500px] overflow-y-auto pr-1">
                    {customers.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No customers found
                      </p>
                    ) : managerVisibleCustomers.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No matching customers found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {managerVisibleCustomers.map((customer) => (
                            <div
                              key={`customer-${customer?.id}`}
                              className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white text-sm mb-1">
                                    {highlightMatchText(
                                      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
                                      managerCustomerSearchText,
                                      managerCustomerSearchScope === 'all' ||
                                        managerCustomerSearchScope === 'name',
                                      `customer-name-${customer?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">
                                    {highlightMatchText(
                                      customer?.email || '',
                                      managerCustomerSearchText,
                                      managerCustomerSearchScope === 'all' ||
                                        managerCustomerSearchScope === 'email',
                                      `customer-email-${customer?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {highlightMatchText(
                                      customer?.phone || 'No phone',
                                      managerCustomerSearchText,
                                      managerCustomerSearchScope === 'all' ||
                                        managerCustomerSearchScope === 'phone',
                                      `customer-phone-${customer?.id}`,
                                    )}
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400">
                                  #{customer?.id}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCustomerId(Number(customer?.id));
                                    setCustomerForm({
                                      first_name: customer?.first_name || '',
                                      last_name: customer?.last_name || '',
                                      email: customer?.email || '',
                                      password: '',
                                      phone: customer?.phone || '',
                                      address: customer?.address || '',
                                    });
                                    openManagerFormModalIfPhone();
                                  }}
                                  className="flex-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDeleteCustomer(
                                      Number(customer?.id),
                                      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
                                        'customer',
                                    );
                                  }}
                                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              {activeManagerTab === 'books' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div
                    className={`${
                      isManagerPhone
                        ? isManagerFormModalOpen
                          ? 'fixed inset-0 z-[75] flex items-center justify-center p-3'
                          : 'hidden'
                        : ''
                    }`}
                  >
                  <form
                    onSubmit={handleBookSubmit}
                    className={`relative space-y-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 ${
                      isManagerPhone
                        ? 'w-full max-w-xl max-h-[82vh] overflow-y-auto bg-slate-900/95 shadow-2xl'
                        : ''
                    }`}
                  >
                    <h3 className="text-base font-semibold text-white mb-3">
                      {editingBookId
                        ? `Edit Book #${editingBookId}`
                        : 'Add New Book'}
                    </h3>
                    {isManagerPhone && (
                      <button
                        type="button"
                        onClick={closeManagerFormModal}
                        className="absolute top-3 right-3 px-2 py-1 rounded-md border border-white/15 text-slate-300 text-xs hover:bg-white/10"
                      >
                        Close
                      </button>
                    )}
                    <input
                      value={bookForm.title}
                      onChange={(e) =>
                        setBookForm((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Book title"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <textarea
                      value={bookForm.description}
                      onChange={(e) =>
                        setBookForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Description"
                      rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bookForm.price}
                        onChange={(e) =>
                          setBookForm((prev) => ({
                            ...prev,
                            price: e.target.value,
                          }))
                        }
                        placeholder="Price"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <input
                        type="number"
                        min="0"
                        value={bookForm.stock}
                        onChange={(e) =>
                          setBookForm((prev) => ({
                            ...prev,
                            stock: e.target.value,
                          }))
                        }
                        placeholder="Stock"
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={bookForm.author_id}
                        onChange={(e) =>
                          setBookForm((prev) => ({
                            ...prev,
                            author_id: e.target.value,
                          }))
                        }
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select author</option>
                        {authors.map((author) => (
                          <option
                            key={`author-opt-${author?.id}`}
                            value={String(author?.id)}
                            className="bg-slate-900"
                          >
                            {author?.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={bookForm.category_id}
                        onChange={(e) =>
                          setBookForm((prev) => ({
                            ...prev,
                            category_id: e.target.value,
                          }))
                        }
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option
                            key={`category-opt-${category?.id}`}
                            value={String(category?.id)}
                            className="bg-slate-900"
                          >
                            {category?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={bookForm.image}
                      onChange={(e) =>
                        setBookForm((prev) => ({
                          ...prev,
                          image: e.target.value,
                        }))
                      }
                      placeholder="Image URL"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <input
                      type="date"
                      value={bookForm.published_date}
                      onChange={(e) =>
                        setBookForm((prev) => ({
                          ...prev,
                          published_date: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingManager}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                      >
                        {savingManager
                          ? 'Saving...'
                          : editingBookId
                            ? 'Update Book'
                            : 'Add Book'}
                      </button>
                      {editingBookId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBookId(null);
                            setBookForm({
                              title: '',
                              description: '',
                              price: '',
                              stock: '',
                              author_id: '',
                              category_id: '',
                              image: '',
                              published_date: '',
                            });
                            closeManagerFormModal();
                          }}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                  </div>

                  <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                    {isManagerPhone && (
                      <div className="mb-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBookId(null);
                          setBookForm({
                            title: '',
                            description: '',
                            price: '',
                            stock: '',
                            author_id: '',
                            category_id: '',
                            image: '',
                            published_date: '',
                          });
                          openManagerFormModalIfPhone();
                        }}
                        className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                      >
                        Add Book
                      </button>
                      </div>
                    )}
                    <BookSearchControls
                      className="mb-4"
                      searchPlaceholder="Search books by title, author, category"
                      searchText={managerBookSearchText}
                      onSearchTextChange={setManagerBookSearchText}
                      searchScope={managerBookSearchScope}
                      onSearchScopeChange={setManagerBookSearchScope}
                      filterType={managerBookFilterType}
                      onFilterTypeChange={setManagerBookFilterType}
                      scopeOptions={BOOK_SEARCH_SCOPE_OPTIONS}
                      filterOptions={BOOK_FILTER_OPTIONS}
                      authorCount={managerBookAuthorOptions.length}
                    />
                    <h3 className="text-base font-semibold text-white mb-3">
                      Book List ({managerVisibleBooks.length}/{books.length})
                    </h3>
                    <div className="max-h-[500px] overflow-y-auto pr-1">
                    {books.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No books found
                      </p>
                    ) : managerVisibleBooks.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No matching books found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {managerVisibleBooks.map((book) => (
                            <div
                              key={`book-${book?.id}`}
                              className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white text-sm mb-1 truncate">
                                    {highlightMatchText(
                                      book?.title || '',
                                      managerBookSearchText,
                                      managerBookSearchScope === 'all' ||
                                        managerBookSearchScope === 'name',
                                      `book-title-${book?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {highlightMatchText(
                                      authorNameById[
                                        String(book?.author_id ?? '')
                                      ] || 'Unknown',
                                      managerBookSearchText,
                                      managerBookSearchScope === 'all' ||
                                        managerBookSearchScope === 'author',
                                      `book-author-${book?.id}`,
                                    )}{' '}
                                    •{' '}
                                    {highlightMatchText(
                                      categoryNameById[
                                        String(book?.category_id ?? '')
                                      ] || 'Unknown',
                                      managerBookSearchText,
                                      managerBookSearchScope === 'all' ||
                                        managerBookSearchScope === 'category',
                                      `book-category-${book?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-emerald-400 mt-1">
                                    ${numberValue(book?.price).toFixed(2)} •
                                    Stock: {numberValue(book?.stock)}
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400">
                                  #{book?.id}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBookId(Number(book?.id));
                                    setBookForm({
                                      title: book?.title || '',
                                      description: book?.description || '',
                                      price: String(book?.price ?? ''),
                                      stock: String(book?.stock ?? ''),
                                      author_id: String(book?.author_id ?? ''),
                                      category_id: String(
                                        book?.category_id ?? '',
                                      ),
                                      image: book?.image || '',
                                      published_date: String(
                                        book?.published_date || '',
                                      ).split('T')[0],
                                    });
                                    openManagerFormModalIfPhone();
                                  }}
                                  className="flex-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDeleteBook(
                                      Number(book?.id),
                                      book?.title || 'book',
                                    );
                                  }}
                                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              {activeManagerTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div
                    className={`${
                      isManagerPhone
                        ? isManagerFormModalOpen
                          ? 'fixed inset-0 z-[75] flex items-center justify-center p-3'
                          : 'hidden'
                        : ''
                    }`}
                  >
                  <form
                    onSubmit={handleCategorySubmit}
                    className={`relative space-y-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 ${
                      isManagerPhone
                        ? 'w-full max-w-xl max-h-[82vh] overflow-y-auto bg-slate-900/95 shadow-2xl'
                        : ''
                    }`}
                  >
                    <h3 className="text-base font-semibold text-white mb-3">
                      {editingCategoryId
                        ? `Edit Category #${editingCategoryId}`
                        : 'Add New Category'}
                    </h3>
                    {isManagerPhone && (
                      <button
                        type="button"
                        onClick={closeManagerFormModal}
                        className="absolute top-3 right-3 px-2 py-1 rounded-md border border-white/15 text-slate-300 text-xs hover:bg-white/10"
                      >
                        Close
                      </button>
                    )}
                    <input
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({
                          name: e.target.value,
                        })
                      }
                      placeholder="Category name"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingManager}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                      >
                        {savingManager
                          ? 'Saving...'
                          : editingCategoryId
                            ? 'Update Category'
                            : 'Add Category'}
                      </button>
                      {editingCategoryId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setCategoryForm({ name: '' });
                            closeManagerFormModal();
                          }}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                  </div>

                  <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                    {isManagerPhone && (
                      <div className="mb-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setCategoryForm({ name: '' });
                          openManagerFormModalIfPhone();
                        }}
                        className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                      >
                        Add Category
                      </button>
                      </div>
                    )}
                    <BookSearchControls
                      className="mb-4"
                      searchPlaceholder="Search categories by name"
                      searchText={managerCategorySearchText}
                      onSearchTextChange={setManagerCategorySearchText}
                      searchScope={managerCategorySearchScope}
                      onSearchScopeChange={setManagerCategorySearchScope}
                      filterType={managerCategoryFilterType}
                      onFilterTypeChange={setManagerCategoryFilterType}
                      scopeOptions={CATEGORY_SEARCH_SCOPE_OPTIONS}
                      filterOptions={CATEGORY_FILTER_OPTIONS}
                      hintText={
                        managerCategoryFilterType === 'name'
                          ? 'Sorted by category name'
                          : managerCategoryFilterType === 'books'
                            ? 'Sorted by number of books'
                            : managerCategorySearchText.trim()
                              ? `Searching "${managerCategorySearchText.trim()}"`
                              : 'Sorted by newest category'
                      }
                    />
                    <h3 className="text-base font-semibold text-white mb-3">
                      Category List ({managerVisibleCategories.length}/
                      {categories.length})
                    </h3>
                    <div className="max-h-[500px] overflow-y-auto pr-1">
                    {categories.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No categories found
                      </p>
                    ) : managerVisibleCategories.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No matching categories found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {managerVisibleCategories.map((category) => (
                            <div
                              key={`category-${category?.id}`}
                              className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white text-sm mb-1">
                                    {highlightMatchText(
                                      category?.name || '',
                                      managerCategorySearchText,
                                      managerCategorySearchScope === 'all' ||
                                        managerCategorySearchScope === 'name',
                                      `category-name-${category?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {numberValue(
                                      categoryBookCountById[
                                        String(category?.id ?? '')
                                      ],
                                    )}{' '}
                                    book(s)
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400">
                                  #{category?.id}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategoryId(Number(category?.id));
                                    setCategoryForm({
                                      name: category?.name || '',
                                    });
                                    openManagerFormModalIfPhone();
                                  }}
                                  className="flex-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDeleteCategory(
                                      Number(category?.id),
                                      category?.name || 'category',
                                    );
                                  }}
                                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}

              {activeManagerTab === 'authors' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div
                    className={`${
                      isManagerPhone
                        ? isManagerFormModalOpen
                          ? 'fixed inset-0 z-[75] flex items-center justify-center p-3'
                          : 'hidden'
                        : ''
                    }`}
                  >
                  <form
                    onSubmit={handleAuthorSubmit}
                    className={`relative space-y-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-3 sm:p-4 ${
                      isManagerPhone
                        ? 'w-full max-w-xl max-h-[82vh] overflow-y-auto bg-slate-900/95 shadow-2xl'
                        : ''
                    }`}
                  >
                    <h3 className="text-base font-semibold text-white mb-3">
                      {editingAuthorId
                        ? `Edit Author #${editingAuthorId}`
                        : 'Add New Author'}
                    </h3>
                    {isManagerPhone && (
                      <button
                        type="button"
                        onClick={closeManagerFormModal}
                        className="absolute top-3 right-3 px-2 py-1 rounded-md border border-white/15 text-slate-300 text-xs hover:bg-white/10"
                      >
                        Close
                      </button>
                    )}
                    <input
                      value={authorForm.name}
                      onChange={(e) =>
                        setAuthorForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Author name"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <textarea
                      value={authorForm.bio}
                      onChange={(e) =>
                        setAuthorForm((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      placeholder="Bio (optional)"
                      rows={4}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={savingManager}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg text-white font-semibold text-sm hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
                      >
                        {savingManager
                          ? 'Saving...'
                          : editingAuthorId
                            ? 'Update Author'
                            : 'Add Author'}
                      </button>
                      {editingAuthorId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAuthorId(null);
                            setAuthorForm({ name: '', bio: '' });
                            closeManagerFormModal();
                          }}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                  </div>

                  <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                    {isManagerPhone && (
                      <div className="mb-4 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAuthorId(null);
                          setAuthorForm({ name: '', bio: '' });
                          openManagerFormModalIfPhone();
                        }}
                        className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
                      >
                        Add Author
                      </button>
                      </div>
                    )}
                    <BookSearchControls
                      className="mb-4"
                      searchPlaceholder="Search authors by name or bio"
                      searchText={managerAuthorSearchText}
                      onSearchTextChange={setManagerAuthorSearchText}
                      searchScope={managerAuthorSearchScope}
                      onSearchScopeChange={setManagerAuthorSearchScope}
                      filterType={managerAuthorFilterType}
                      onFilterTypeChange={setManagerAuthorFilterType}
                      scopeOptions={AUTHOR_SEARCH_SCOPE_OPTIONS}
                      filterOptions={AUTHOR_FILTER_OPTIONS}
                      hintText={
                        managerAuthorFilterType === 'name'
                          ? 'Sorted by author name'
                          : managerAuthorFilterType === 'books'
                            ? 'Sorted by number of books'
                            : managerAuthorSearchText.trim()
                              ? `Searching "${managerAuthorSearchText.trim()}"`
                              : 'Sorted by newest author'
                      }
                    />
                    <h3 className="text-base font-semibold text-white mb-3">
                      Author List ({managerVisibleAuthors.length}/
                      {authors.length})
                    </h3>
                    <div className="max-h-[500px] overflow-y-auto pr-1">
                    {authors.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No authors found
                      </p>
                    ) : managerVisibleAuthors.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">
                        No matching authors found
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {managerVisibleAuthors.map((author) => (
                            <div
                              key={`author-${author?.id}`}
                              className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-white text-sm mb-1">
                                    {highlightMatchText(
                                      author?.name || '',
                                      managerAuthorSearchText,
                                      managerAuthorSearchScope === 'all' ||
                                        managerAuthorSearchScope === 'name',
                                      `author-name-${author?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400 line-clamp-2">
                                    {highlightMatchText(
                                      author?.bio || 'No bio',
                                      managerAuthorSearchText,
                                      managerAuthorSearchScope === 'all' ||
                                        managerAuthorSearchScope === 'bio',
                                      `author-bio-${author?.id}`,
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    {numberValue(
                                      authorBookCountById[
                                        String(author?.id ?? '')
                                      ],
                                    )}{' '}
                                    book(s)
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400">
                                  #{author?.id}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAuthorId(Number(author?.id));
                                    setAuthorForm({
                                      name: author?.name || '',
                                      bio: author?.bio || '',
                                    });
                                    openManagerFormModalIfPhone();
                                  }}
                                  className="flex-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDeleteAuthor(
                                      Number(author?.id),
                                      author?.name || 'author',
                                    );
                                  }}
                                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        @keyframes chartBarGrow {
          0% {
            transform: scaleY(0);
            opacity: 0.3;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes pathDraw {
          0% {
            stroke-dashoffset: 1000;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pathGrow {
          0% {
            opacity: 0;
            transform: scaleY(0);
          }
          100% {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        @keyframes pointPop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes candleRise {
          0% {
            transform: translate(-50%, 14px) scaleY(0.35);
            opacity: 0;
          }
          100% {
            transform: translate(-50%, 0) scaleY(1);
            opacity: 1;
          }
        }

        @keyframes candleLineDraw {
          0% {
            stroke-dashoffset: 300;
            opacity: 0.2;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        .graph-point:hover {
          r: 6;
          filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
          transition: all 0.3s ease;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Smooth transitions for stats */
        .stat-card {
          animation: slideUp 0.6s ease-out both;
        }

        @keyframes slideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;

