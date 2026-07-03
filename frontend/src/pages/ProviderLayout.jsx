import ProviderGate from '../components/ProviderGate';
import ProviderDashboard from './ProviderDashboard';

export default function ProviderLayout() {
  return (
    <ProviderGate>
      <ProviderDashboard />
    </ProviderGate>
  );
}
