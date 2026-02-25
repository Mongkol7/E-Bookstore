import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';
import Skeleton from '../../components/Skeleton';
import StoreNavbar from '../../components/StoreNavbar';

const FALLBACK_IMAGE = 'https://via.placeholder.com/600x800/0f172a/e2e8f0?text=Book';

function formatPublishedDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function ProductDetailPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedTab, setSelectedTab] = useState('description');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchBookDetails = async () => {
      setIsLoading(true);
      setError('');
      setBook(null);
      setRelatedBooks([]);
      setQuantity(1);

      try {
        const bookResponse = await apiFetch(`/api/books/${encodeURIComponent(bookId)}`, {
          method: 'GET',
        });
        const bookPayload = await parseJsonResponse(bookResponse);

        if (!bookResponse.ok) {
          if (!isCancelled) {
            setError(bookPayload?.error || 'Unable to load book details.');
          }
          return;
        }

        const normalizedBook = bookPayload && typeof bookPayload === 'object' ? bookPayload : null;
        if (!normalizedBook) {
          if (!isCancelled) {
            setError('Book data is invalid.');
          }
          return;
        }

        if (!isCancelled) {
          setBook(normalizedBook);
        }

        const booksResponse = await apiFetch('/api/books', { method: 'GET' });
        const booksPayload = await parseJsonResponse(booksResponse);

        if (!booksResponse.ok || !Array.isArray(booksPayload)) {
          return;
        }

        const nextRelated = booksPayload
          .filter((item) => Number(item.id) !== Number(normalizedBook.id))
          .filter((item) => {
            if (normalizedBook.category_id != null && item.category_id != null) {
              return Number(item.category_id) === Number(normalizedBook.category_id);
            }
            return String(item.category_name || '').toLowerCase() === String(normalizedBook.category_name || '').toLowerCase();
          })
          .slice(0, 4);

        if (!isCancelled) {
          setRelatedBooks(nextRelated);
        }
      } catch {
        if (!isCancelled) {
          setError('Unable to connect to server.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchBookDetails();

    return () => {
      isCancelled = true;
    };
  }, [bookId]);

  const stock = Number(book?.stock ?? 0);
  const rating = Number(book?.rating ?? 0);
  const salesCount = Number(book?.sales_count ?? 0);

  const canIncreaseQuantity = useMemo(() => stock > 0 && quantity < stock, [quantity, stock]);
  const canDecreaseQuantity = quantity > 1;

  const handleQuantityChange = (delta) => {
    const nextQuantity = quantity + delta;
    if (nextQuantity < 1) return;
    if (stock > 0 && nextQuantity > stock) return;
    setQuantity(nextQuantity);
  };

  const handleAddToCart = async () => {
    if (!book?.id || stock < 1 || isAddingToCart) {
      return;
    }

    setIsAddingToCart(true);
    try {
      const response = await apiFetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_id: Number(book.id),
          quantity,
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
          text: payload?.error || 'Unable to add this book to cart.',
          background: '#0f172a',
          color: '#e2e8f0',
          confirmButtonColor: '#10b981',
        });
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Added to Cart',
        text: `${quantity} item(s) added successfully.`,
        timer: 1400,
        showConfirmButton: false,
        background: '#0f172a',
        color: '#e2e8f0',
      });
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Unable to connect to server.',
        background: '#0f172a',
        color: '#e2e8f0',
        confirmButtonColor: '#10b981',
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <StoreNavbar />

      <main className="max-w-7xl mx-auto py-6 sm:py-12 px-3 sm:px-4 md:px-6 lg:px-8 relative">
        {isLoading && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              <div className="w-full max-w-[15rem] sm:max-w-sm lg:max-w-md mx-auto bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-slate-800/50">
                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
              </div>
              <div className="space-y-5">
                <Skeleton className="h-10 w-5/6" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
                <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/50 space-y-3">
                  <Skeleton className="h-12 w-40" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-12 w-56 rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-800/50 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-10 w-28 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-11/12" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4 text-red-300">
            <p>{error}</p>
            <Link to="/" className="inline-block mt-2 text-emerald-400 hover:text-emerald-300">
              Go back to books
            </Link>
          </div>
        )}

        {!isLoading && !error && book && (
          <>
            <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
              <Link to="/" className="hover:text-emerald-400 transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-white">{book.category_name || 'Books'}</span>
              <span>/</span>
              <span className="text-white truncate">{book.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-7 lg:gap-10 mb-12">
              <div className="w-full max-w-[15rem] sm:max-w-sm lg:max-w-md mx-auto bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-slate-800/50">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                  <img
                    src={book.image || FALLBACK_IMAGE}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2.5 leading-tight">{book.title}</h1>
                  <p className="text-base sm:text-lg text-slate-300">
                    by <span className="text-emerald-400 font-medium">{book.author_name || 'Unknown Author'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-300">
                  <span className="text-emerald-400 font-semibold">
                    {Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'N/A'}
                  </span>
                  <span>Rating</span>
                  <span className="text-slate-600">|</span>
                  <span>{Number.isFinite(salesCount) ? salesCount.toLocaleString() : 0} sold</span>
                </div>

                <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-5 border border-slate-700/50">
                  <div className="text-3xl sm:text-4xl font-bold text-emerald-400">${Number(book.price || 0).toFixed(2)}</div>
                  <p className="mt-2 text-slate-400 text-sm">
                    Stock: {stock > 0 ? stock : 0} {stock > 0 ? 'available' : 'out of stock'}
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-300 text-sm font-medium">Quantity:</span>
                    <div className="flex items-center bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={!canDecreaseQuantity || isAddingToCart}
                        className="px-3 py-2 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="px-4 py-2 text-white font-bold text-base min-w-12 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(1)}
                        disabled={!canIncreaseQuantity || isAddingToCart}
                        className="px-3 py-2 text-slate-300 hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void handleAddToCart();
                    }}
                    disabled={stock < 1 || isAddingToCart}
                    className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-900 font-bold rounded-lg transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 text-xs sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isAddingToCart ? 'Adding...' : stock < 1 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-800/50 mb-12">
              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800/50 pb-4">
                {['description', 'details'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedTab(tab)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all capitalize ${
                      selectedTab === tab
                        ? 'bg-emerald-500 text-slate-900'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {selectedTab === 'description' && (
                <div className="text-slate-300 leading-relaxed">
                  {book.description || 'No description available.'}
                </div>
              )}

              {selectedTab === 'details' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Author', value: book.author_name || 'Unknown' },
                    { label: 'Category', value: book.category_name || 'Unknown' },
                    { label: 'Published Date', value: formatPublishedDate(book.published_date) },
                    { label: 'Stock', value: Number.isFinite(stock) ? stock : 0 },
                    { label: 'Sales Count', value: Number.isFinite(salesCount) ? salesCount : 0 },
                    {
                      label: 'Rating',
                      value: Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'N/A',
                    },
                  ].map((detail) => (
                    <div key={detail.label} className="flex justify-between items-center p-4 bg-slate-800/30 rounded-xl">
                      <span className="text-slate-400 font-medium">{detail.label}</span>
                      <span className="text-white font-semibold">{detail.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">You May Also Like</h2>
              {relatedBooks.length === 0 ? (
                <p className="text-slate-400">No related books available.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {relatedBooks.map((relatedBook) => (
                    <Link
                      key={relatedBook.id}
                      to={`/product/${relatedBook.id}`}
                      className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 border border-slate-800/50 hover:border-emerald-500/50 transition-all duration-300 hover:scale-105 group"
                    >
                      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-3">
                        <img
                          src={relatedBook.image || FALLBACK_IMAGE}
                          alt={relatedBook.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <h3 className="font-semibold text-white text-sm sm:text-base mb-1 line-clamp-2">{relatedBook.title}</h3>
                      <p className="text-slate-400 text-xs sm:text-sm mb-2">{relatedBook.author_name || 'Unknown Author'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold text-sm sm:text-base">${Number(relatedBook.price || 0).toFixed(2)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

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

export default ProductDetailPage;
