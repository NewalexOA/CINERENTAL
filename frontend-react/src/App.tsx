import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/sonner';
import { CartProvider } from './context/CartContext';
import ClientsPage from './features/clients/pages/ClientsPage';
import CategoriesPage from './features/categories/pages/CategoriesPage';
import EquipmentPage from './features/equipment/pages/EquipmentPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';
import ProjectDetailsPage from './features/projects/pages/ProjectDetailsPage';
import ScannerPage from './features/scanner/pages/ScannerPage';

// Placeholder pages
const BookingsPage = () => <div className="p-4">Bookings Page Content</div>;

function App() {
  return (
    <Router>
      <CartProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/equipment" replace />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
          </Route>
        </Routes>
        <Toaster />
      </CartProvider>
    </Router>
  );
}

export default App;
