import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { clearAuthSession, logoutAndRedirect } from '../../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../../utils/api';
import { BookCardSkeleton } from '../../../components/Skeleton';

function HomePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: 'Unknown User',
    role: 'Guest',
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState('');
  const [addingBookIds, setAddingBookIds] = useState({});
  const [filterType, setFilterType] = useState('none');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fallbackFromLocalStorage = () => {
      try {
        const raw = localStorage.getItem('auth_user');
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        const fallbackName =
          parsed?.user?.first_name && parsed?.user?.last_name
            ? `${parsed.user.first_name} ${parsed.user.last_name}`
            : parsed?.customer?.first_name && parsed?.customer?.last_name
              ? `${parsed.customer.first_name} ${parsed.customer.last_name}`
            : parsed?.email || 'Unknown User';
        const fallbackRole =
          typeof parsed?.role === 'string' && parsed.role.trim() !== ''
            ? `${parsed.role.charAt(0).toUpperCase()}${parsed.role.slice(1)}`
            : 'Guest';

        setProfile({
          name: fallbackName,
          role: fallbackRole,
        });
      } catch {
        setProfile({
          name: 'Unknown User',
          role: 'Guest',
        });
      }
    };

    const fetchProfile = async () => {
      try {
        const response = await apiFetch('/api/auth/profile', { method: 'GET' });

        if (response.status === 401) {
          clearAuthSession();
          setProfile({
            name: 'Unknown User',
            role: 'Guest',
          });
          return;
        }

        if (!response.ok) {
          fallbackFromLocalStorage();
          return;
        }

        const data = await response.json();
        setProfile({
          name: data?.user?.name || 'Unknown User',
          role: data?.user?.role || 'Guest',
        });
      } catch {
        fallbackFromLocalStorage();
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      setBooksLoading(true);
      setBooksError('');

      try {
        const response = await apiFetch('/api/books', { method: 'GET' });
        const data = await parseJsonResponse(response);

        if (!response.ok) {
          setBooks([]);
          setBooksError(
            data?.error || 'Unable to load books. Please sign in first.'
          );
          return;
        }

        setBooks(Array.isArray(data) ? data : []);
      } catch {
        setBooks([]);
        setBooksError('Unable to connect to server');
      } finally {
        setBooksLoading(false);
      }
    };

    fetchBooks();
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/logout', {
        method: 'POST',
      });
    } catch {
      // No-op: we still clear local state for UX consistency.
    } finally {
      clearAuthSession();
      setProfile({
        name: 'Unknown User',
        role: 'Guest',
      });
      setIsProfileMenuOpen(false);
      setShowLogoutModal(false);
    }
  };

  const handleAddToCart = async (bookId) => {
    setAddingBookIds((prev) => ({ ...prev, [bookId]: true }));

    try {
      const response = await apiFetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_id: bookId,
          quantity: 1,
        }),
      });

      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        await Swal.fire({
          icon: 'warning',
          title: 'Session Expired',
          text: 'Please log in again.',
          background: '#0f172a',
          color: '#e2e8f0',
          confirmButtonColor: '#10b981',
        });
        logoutAndRedirect(navigate);
        return;
      }

      if (!response.ok) {
        await Swal.fire({
          icon: 'error',
          title: 'Add to Cart Failed',
          text: payload?.error || 'Unable to add to cart',
          background: '#0f172a',
          color: '#e2e8f0',
          confirmButtonColor: '#10b981',
        });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Added to Cart',
        text: 'Book added successfully.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#e2e8f0',
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Unable to connect to server',
        background: '#0f172a',
        color: '#e2e8f0',
        confirmButtonColor: '#10b981',
      });
    } finally {
      setAddingBookIds((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const getProfileInitial = () => {
    if (!profile.name || profile.name === 'Unknown User') {
      return '?';
    }
    return profile.name.trim().charAt(0).toUpperCase();
  };

  const authorOptions = useMemo(() => {
    const options = new Set();
    books.forEach((book) => {
      const author = (book.author_name || '').trim();
      if (author) {
        options.add(author);
      }
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [books]);

  const visibleBooks = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const copied = [...books].filter((book) => {
      if (!query) return true;

      const title = String(book.title || '').toLowerCase();
      const author = String(book.author_name || '').toLowerCase();
      const category = String(book.category_name || book.category || '').toLowerCase();

      return title.includes(query) || author.includes(query) || category.includes(query);
    });

    if (filterType === 'categories') {
      copied.sort((a, b) =>
        String(a.category_name || a.category || '').localeCompare(
          String(b.category_name || b.category || '')
        )
      );
      return copied;
    }

    if (filterType === 'authors') {
      copied.sort((a, b) =>
        String(a.author_name || '').localeCompare(String(b.author_name || ''))
      );
      return copied;
    }

    if (filterType === 'price') {
      copied.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      return copied;
    }

    if (filterType === 'trending') {
      // If `sales_count` is unavailable, fallback to rating.
      copied.sort((a, b) => {
        const bScore = Number(b.sales_count ?? b.sold ?? b.rating ?? 0);
        const aScore = Number(a.sales_count ?? a.sold ?? a.rating ?? 0);
        return bScore - aScore;
      });
      return copied;
    }

    return copied;
  }, [books, filterType, searchText]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <header className="bg-slate-900/50 backdrop-blur-xl shadow-2xl border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-700/50 shadow-lg">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-sm sm:rounded-md rotate-45 shadow-lg shadow-emerald-500/50"></div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
              E-Bookstore
            </h1>
          </div>
          <div className="w-full sm:w-auto flex items-center justify-end gap-2 sm:gap-3 sm:ml-4">
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/40 text-slate-200 hover:border-emerald-500/40 hover:text-white transition-colors text-sm"
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
                  d="M3 3h2l.4 2m0 0L7 13h10l2-8H5.4zM7 13l-1 5h12M9 20a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z"
                />
              </svg>
              Cart
            </Link>

            <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-lg px-3 py-2 text-left hover:border-emerald-500/40 transition-colors flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-900 font-bold text-sm flex items-center justify-center shadow-lg shadow-emerald-500/25">
                {getProfileInitial()}
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-200 font-semibold line-clamp-1">
                  {profile.name}
                </p>
                <p className="text-[11px] sm:text-xs text-emerald-400">
                  Role: {profile.role}
                </p>
              </div>
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-full sm:w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 p-2">
                <Link
                  to="/login"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block w-full text-left text-sm text-slate-200 hover:bg-slate-800 rounded-md px-3 py-2 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block w-full text-left text-sm text-slate-200 hover:bg-slate-800 rounded-md px-3 py-2 transition-colors"
                >
                  Signup
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full text-left text-sm text-red-300 hover:bg-red-950/40 rounded-md px-3 py-2 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          ></div>
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Confirm Logout</h3>
            <p className="text-sm text-slate-300 mb-5">
              Are you sure you want to logout from this account?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-400 hover:to-red-500 transition-all text-sm font-medium"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 relative">
        <div className="py-4 sm:py-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 sm:mb-8 tracking-tight">
            Featured Books
          </h2>
          <div className="mb-5 rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 sm:p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by book, author, category"
                className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="none" className="bg-slate-900">No Filter</option>
                <option value="categories" className="bg-slate-900">Categories</option>
                <option value="authors" className="bg-slate-900">Authors</option>
                <option value="price" className="bg-slate-900">Price</option>
                <option value="trending" className="bg-slate-900">Trending (Most Sales)</option>
              </select>
              <div className="w-full rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-300">
                {filterType === 'authors'
                  ? `${authorOptions.length} authors available`
                  : filterType === 'categories'
                    ? 'Sorted by category name'
                    : filterType === 'price'
                      ? 'Sorted by lowest price first'
                      : filterType === 'trending'
                        ? 'Sorted by most sales (fallback: rating)'
                        : searchText.trim()
                          ? `Search result for "${searchText.trim()}"`
                          : 'Showing default order'}
              </div>
            </div>
          </div>
          {booksLoading && <p className="text-slate-300 mb-4">Loading books...</p>}
          {!booksLoading && booksError && (
            <p className="text-red-300 bg-red-950/30 border border-red-500/40 rounded-lg px-3 py-2 mb-4">
              {booksError}
            </p>
          )}
          {!booksLoading && !booksError && books.length === 0 && (
            <p className="text-slate-300 mb-4">No books found.</p>
          )}
          {!booksLoading && !booksError && books.length > 0 && visibleBooks.length === 0 && (
            <p className="text-slate-300 mb-4">No matching books found.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {booksLoading &&
              Array.from({ length: 8 }).map((_, index) => (
                <BookCardSkeleton key={`book-skeleton-${index}`} />
              ))}
            {!booksLoading &&
              visibleBooks.map((book, index) => (
              <div
                key={book.id}
                className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-800/50 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 hover:shadow-emerald-500/10 group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={
                      book.image ||
                      'https://via.placeholder.com/150/0f172a/e2e8f0?text=Book'
                    }
                    alt={book.title}
                    className="w-full h-40 sm:h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1 line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 mb-3">
                    {book.author_name || 'Unknown Author'}
                  </p>
                  <p className="text-xs sm:text-sm text-emerald-400/90 mb-2">
                    Category: {book.category_name || book.category || 'Unknown Category'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-300 mb-2 line-clamp-2 min-h-10">
                    {book.description || 'No description available.'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 mb-3">
                    Stock: <span className="text-emerald-400 font-medium">{book.stock ?? 0}</span>
                  </p>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                      ${Number(book.price || 0).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      <span className="text-xs sm:text-sm text-slate-400">
                        {Number.isFinite(Number(book.rating))
                          ? Number(book.rating).toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddToCart(book.id)}
                    disabled={!!addingBookIds[book.id]}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-900 py-2 sm:py-2.5 px-4 rounded-lg sm:rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 group text-sm sm:text-base touch-manipulation active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
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
                    {addingBookIds[book.id] ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
              ))}
          </div>
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.6s ease-out 0.2s both;
        }

        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default HomePage;

