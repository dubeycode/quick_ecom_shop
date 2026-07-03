import AdminGate from '../components/AdminGate';
import AdminDashboard from './AdminDashboard';

export default function AdminLayout() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}
