import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import PlaceOrder from './pages/PlaceOrder';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PlaceOrder />} />
        <Route path="/orders" element={<MyOrders />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
      </Routes>
    </Layout>
  );
}
