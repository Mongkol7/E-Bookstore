import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Homepage from './pages/Home/Homepage';
import CartPage from './pages/Cart';
import CheckoutPage from './pages/Checkout';
import OrderDetailPage from './pages/Orderdetail/Orderdetailpage';
import OrdersPage from './pages/Orders';
import ProductDetailPage from './pages/Productdetail/Productdetail';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/product/:bookId" element={<ProductDetailPage />} />
            <Route path="/" element={<Homepage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
