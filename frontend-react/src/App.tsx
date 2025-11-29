import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/sonner';
import { CartProvider } from './context/CartContext';
import ClientsPage from './features/clients/pages/ClientsPage';
import ClientDetailsPage from './features/clients/pages/ClientDetailsPage';
import CategoriesPage from './features/categories/pages/CategoriesPage';
import EquipmentPage from './features/equipment/pages/EquipmentPage';
import EquipmentDetailsPage from './features/equipment/pages/EquipmentDetailsPage';
import ProjectsPage from './features/projects/pages/ProjectsPage';
import NewProjectPage from './features/projects/pages/NewProjectPage';
import ProjectDetailsPage from './features/projects/pages/ProjectDetailsPage';
import ScannerPage from './features/scanner/pages/ScannerPage';
import BookingsPage from './features/bookings/pages/BookingsPage';

function App() {
  return (
    <Router>
      <CartProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/equipment" replace />} />
            
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailsPage />} />
            
            <Route path="/categories" element={<CategoriesPage />} />
            
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:id" element={<ClientDetailsPage />} />
            
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
