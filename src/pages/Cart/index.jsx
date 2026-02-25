import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutAndRedirect } from '../../utils/auth';
import { apiFetch, parseJsonResponse } from '../../utils/api';
import Skeleton, { CartItemSkeleton } from '../../components/Skeleton';

function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingIds, setUpdatingIds] = useState({});
  const [quantityInputs, setQuantityInputs] = useState({});
  const [quantityErrors, setQuantityErrors] = useState({});
  const [serverQuantities, setServerQuantities] = useState({});
  const [showOrderHistoryHighlight, setShowOrderHistoryHighlight] = useState(false);
  const [isProceedingCheckout, setIsProceedingCheckout] = useState(false);

  useEffect(() => {
    if (location.state?.orderPlaced) {
      setShowOrderHistoryHighlight(true);
      const timer = setTimeout(() => {
        setShowOrderHistoryHighlight(false);
      }, 15000);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [location.state]);

  useEffect(() => {
    const fetchCart = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await apiFetch('/api/cart', { method: 'GET' });
        const payload = await parseJsonResponse(response);

        if (response.status === 401) {
          logoutAndRedirect(navigate);
          return;
        }

        if (!response.ok) {
          setError(payload?.error || 'Unable to load cart');
          setCartItems([]);
          return;
        }

        const nextItems = Array.isArray(payload?.items) ? payload.items : [];
        setCartItems(nextItems);
        setServerQuantities(toServerQuantitiesMap(nextItems));
      } catch {
        setError('Unable to connect to server');
        setCartItems([]);
        setServerQuantities({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, []);

  useEffect(() => {
    const nextInputs = {};
    cartItems.forEach((item) => {
      nextInputs[item.id] = String(item.quantity ?? 1);
    });
    setQuantityInputs(nextInputs);
    setQuantityErrors({});
  }, [cartItems]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const total = subtotal + tax + shipping;
  const isAnyItemUpdating = Object.values(updatingIds).some(Boolean);
  const toServerQuantitiesMap = (items) =>
    Object.fromEntries(
      (Array.isArray(items) ? items : []).map((item) => [
        item.id,
        Number(item.quantity ?? 1),
      ])
    );

  const updateQuantity = async (id, newQuantity) => {
    if (newQuantity < 1) return;

    setUpdatingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await apiFetch('/api/cart/quantity', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_id: id,
          quantity: newQuantity,
        }),
      });
      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        logoutAndRedirect(navigate);
        return null;
      }

      if (!response.ok) {
        setError(payload?.error || 'Unable to update quantity');
        return null;
      }

      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setCartItems(nextItems);
      setServerQuantities(toServerQuantitiesMap(nextItems));
      return nextItems;
    } catch {
      setError('Unable to connect to server');
      return null;
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const removeItem = async (id) => {
    setUpdatingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await apiFetch('/api/cart/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          book_id: id,
        }),
      });
      const payload = await parseJsonResponse(response);

      if (response.status === 401) {
        logoutAndRedirect(navigate);
        return null;
      }

      if (!response.ok) {
        setError(payload?.error || 'Unable to remove item');
        return;
      }

      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setCartItems(nextItems);
      setServerQuantities(toServerQuantitiesMap(nextItems));
    } catch {
      setError('Unable to connect to server');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const validateQuantityInput = (item, value) => {
    if (!/^\d+$/.test(value)) return 'Please enter digits only';

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 'Quantity must be at least 1';

    const stock = Number(item.stock);
    if (Number.isFinite(stock) && parsed > stock) {
      return `Only ${stock} in stock`;
    }

    return '';
  };

  const handleQuantityInputChange = (item, value) => {
    setQuantityInputs((prev) => ({ ...prev, [item.id]: value }));

    if (value === '') {
      setQuantityErrors((prev) => ({ ...prev, [item.id]: 'Quantity is required' }));
      return;
    }

    const validationMessage = validateQuantityInput(item, value);
    setQuantityErrors((prev) => ({ ...prev, [item.id]: validationMessage }));
  };

  const applyLocalQuantity = (id, nextQuantity) => {
    setCartItems((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, quantity: nextQuantity } : entry
      )
    );
    setQuantityInputs((prev) => ({ ...prev, [id]: String(nextQuantity) }));
  };

  const commitQuantityInput = (item) => {
    const rawValue = quantityInputs[item.id] ?? String(item.quantity ?? 1);

    const validationMessage = validateQuantityInput(item, rawValue);
    if (validationMessage) {
      setQuantityErrors((prev) => ({ ...prev, [item.id]: validationMessage }));
      setQuantityInputs((prev) => ({
        ...prev,
        [item.id]: String(item.quantity ?? 1),
      }));
      return;
    }

    setQuantityErrors((prev) => ({ ...prev, [item.id]: '' }));

    const parsedQuantity = Number.parseInt(rawValue, 10);
    if (parsedQuantity !== item.quantity) {
      applyLocalQuantity(item.id, parsedQuantity);
    }
  };

  const updateQuantityWithValidation = (item, nextQuantity) => {
    const validationMessage = validateQuantityInput(item, String(nextQuantity));
    if (validationMessage) {
      setQuantityErrors((prev) => ({ ...prev, [item.id]: validationMessage }));
      return;
    }

    setQuantityErrors((prev) => ({ ...prev, [item.id]: '' }));
    applyLocalQuantity(item.id, nextQuantity);
  };

  const syncQuantityInputsBeforeCheckout = async () => {
    let hasValidationError = false;
    const nextErrors = {};

    cartItems.forEach((item) => {
      const rawValue = quantityInputs[item.id] ?? String(item.quantity ?? 1);
      const validationMessage =
        rawValue === ''
          ? 'Quantity is required'
          : validateQuantityInput(item, rawValue);
      nextErrors[item.id] = validationMessage;
      if (validationMessage) {
        hasValidationError = true;
      }
    });

    setQuantityErrors((prev) => ({ ...prev, ...nextErrors }));

    if (hasValidationError) {
      setError('Please fix quantity errors before checkout.');
      return null;
    }

    let latestItems = cartItems;
    for (const item of cartItems) {
      const rawValue = quantityInputs[item.id] ?? String(item.quantity ?? 1);
      const parsedQuantity = Number.parseInt(rawValue, 10);
      const persistedQuantity = Number(serverQuantities[item.id] ?? item.quantity ?? 1);
      if (parsedQuantity !== persistedQuantity) {
        const updatedItems = await updateQuantity(item.id, parsedQuantity);
        if (!Array.isArray(updatedItems)) {
          return null;
        }
        latestItems = updatedItems;
      }
    }

    return latestItems;
  };

  const handleProceedToCheckout = async () => {
    if (isProceedingCheckout || isAnyItemUpdating) {
      return;
    }

    setError('');
    setIsProceedingCheckout(true);
    try {
      const syncedItems = await syncQuantityInputsBeforeCheckout();
      if (!Array.isArray(syncedItems)) {
        return;
      }

      navigate('/checkout', { state: { items: syncedItems } });
    } finally {
      setIsProceedingCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 font-['Outfit',sans-serif]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <header className="bg-slate-900/50 backdrop-blur-xl shadow-2xl border-b border-slate-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-4 md:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center border border-slate-700/50 shadow-lg">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-sm sm:rounded-md rotate-45 shadow-lg shadow-emerald-500/50"></div>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                E-Bookstore
              </h1>
            </Link>
          </div>
          <Link
            to="/"
            className="text-slate-300 hover:text-emerald-400 transition-colors font-medium px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-slate-800/50 text-sm sm:text-base"
          >
            Continue Shopping
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:py-12 px-3 sm:px-4 md:px-6 lg:px-8 relative">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                Shopping Cart
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in
                your cart
              </p>
            </div>
            <Link
              to="/orders"
              state={showOrderHistoryHighlight ? { highlightLatestOrder: true } : undefined}
              className={`relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-slate-800/40 text-slate-200 hover:text-white transition-colors text-sm ${
                showOrderHistoryHighlight
                  ? 'border-emerald-400 text-emerald-200 shadow-[0_0_0_2px_rgba(16,185,129,0.9),0_0_30px_rgba(16,185,129,0.75),0_0_60px_rgba(16,185,129,0.45)]'
                  : 'border-slate-700/60 hover:border-emerald-500/40'
              }`}
            >
              {showOrderHistoryHighlight && (
                <>
                  <span className="pointer-events-none absolute -inset-2 rounded-xl bg-emerald-400/25 blur-md animate-pulse"></span>
                  <span className="pointer-events-none absolute -inset-1 rounded-xl border-2 border-emerald-400/90 animate-pulse"></span>
                </>
              )}
              Order History
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <CartItemSkeleton key={`cart-skeleton-${index}`} />
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-800/50 sticky top-24 space-y-4">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-5 w-2/3 mx-auto" />
              </div>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-4 text-red-300 mb-6">
            <p>{error}</p>
            <Link to="/login" className="inline-block mt-3 text-emerald-400 hover:text-emerald-300">
              Go to Login
            </Link>
          </div>
        )}

        {!isLoading && !error && cartItems.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-800/50 text-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-slate-800/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Your cart is empty</h3>
            <p className="text-slate-400 mb-6 sm:mb-8 text-sm sm:text-base">Add some books to get started!</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-900 font-semibold rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 text-sm sm:text-base"
            >
              Browse Books
            </Link>
          </div>
        ) : null}

        {!isLoading && !error && cartItems.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-300"
                >
                  <div className="flex gap-3 sm:gap-4 md:gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={item.imageUrl || 'https://via.placeholder.com/200/0f172a/e2e8f0?text=Book'}
                        alt={item.title}
                        className="w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 object-cover rounded-lg shadow-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-1 truncate">{item.title}</h3>
                          <p className="text-xs sm:text-sm text-slate-400">{item.author}</p>
                          <p className="text-xs sm:text-sm text-emerald-400/90">
                            Category: {item.category || 'Unknown Category'}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-400">
                            Stock: {Number.isFinite(Number(item.stock)) ? Number(item.stock) : 0}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={!!updatingIds[item.id]}
                          className="text-slate-400 hover:text-red-400 transition-colors p-1 touch-manipulation disabled:opacity-50"
                          aria-label="Remove item"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-3 sm:mt-4">
                        <div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm text-slate-400">Qty:</span>
                            <div
                              className={`relative flex items-center bg-slate-800/50 rounded-lg border ${
                                quantityErrors[item.id]
                                  ? 'border-red-500/60'
                                  : 'border-slate-700/50'
                              }`}
                            >
                            {!!updatingIds[item.id] && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-slate-900/70">
                                <div className="flex items-center gap-2 text-xs text-emerald-300">
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />
                                  Updating...
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                updateQuantityWithValidation(
                                  item,
                                  item.quantity - 1,
                                );
                              }}
                              disabled={!!updatingIds[item.id]}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation disabled:opacity-50"
                              aria-label="Decrease quantity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={quantityInputs[item.id] ?? String(item.quantity ?? 1)}
                              onChange={(event) => handleQuantityInputChange(item, event.target.value)}
                              onBlur={() => {
                                commitQuantityInput(item);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.currentTarget.blur();
                                }
                              }}
                              disabled={!!updatingIds[item.id]}
                              className="w-12 sm:w-14 bg-transparent text-center px-1 py-1 sm:py-1.5 text-white font-medium text-sm sm:text-base outline-none disabled:opacity-50"
                              aria-label="Quantity"
                            />
                            <button
                              onClick={() => {
                                updateQuantityWithValidation(
                                  item,
                                  item.quantity + 1,
                                );
                              }}
                              disabled={!!updatingIds[item.id]}
                              className="px-2 sm:px-3 py-1 sm:py-1.5 text-slate-300 hover:text-emerald-400 transition-colors touch-manipulation disabled:opacity-50"
                              aria-label="Increase quantity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            </div>
                          </div>
                          {quantityErrors[item.id] && (
                            <p className="text-xs text-red-300 mt-1">{quantityErrors[item.id]}</p>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg sm:text-xl font-bold text-emerald-400">${(item.price * item.quantity).toFixed(2)}</span>
                          {item.quantity > 1 && (
                            <span className="text-xs sm:text-sm text-slate-500">(${item.price.toFixed(2)} each)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-800/50 sticky top-24">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Order Summary</h3>
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-white font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Tax (10%)</span>
                    <span className="text-white font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-slate-400">Shipping</span>
                    <span className="text-white font-medium">
                      {shipping === 0 ? <span className="text-emerald-400">FREE</span> : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  {subtotal < 50 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 sm:p-3">
                      <p className="text-xs sm:text-sm text-emerald-400">
                        Add ${(50 - subtotal).toFixed(2)} more for FREE shipping!
                      </p>
                    </div>
                  )}
                  <div className="border-t border-slate-700/50 pt-3 sm:pt-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base sm:text-lg font-semibold text-white">Total</span>
                      <span className="text-2xl sm:text-3xl font-bold text-emerald-400">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleProceedToCheckout();
                  }}
                  disabled={isProceedingCheckout || isAnyItemUpdating}
                  className={`w-full py-3 sm:py-4 px-4 rounded-xl transition-all duration-200 font-semibold shadow-lg flex items-center justify-center gap-2 mb-3 sm:mb-4 text-sm sm:text-base touch-manipulation ${
                    isProceedingCheckout || isAnyItemUpdating
                      ? 'bg-emerald-600/70 text-slate-900/80 cursor-not-allowed shadow-emerald-700/20'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-900 shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/40 active:scale-95'
                  }`}
                >
                  {isProceedingCheckout ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                      Preparing Checkout...
                    </>
                  ) : isAnyItemUpdating ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                      Updating Cart...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>
                <Link
                  to="/"
                  className="block w-full text-center text-slate-400 hover:text-emerald-400 transition-colors text-sm sm:text-base"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default CartPage;

