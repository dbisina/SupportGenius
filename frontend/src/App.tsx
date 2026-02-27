import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Agents from './pages/Agents';
import Analytics from './pages/Analytics';
import Products from './pages/Products';
import Customers from './pages/Customers';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/products" element={<Products />} />
        <Route path="/customers" element={<Customers />} />
      </Routes>
    </Layout>
  );
}

export default App;
