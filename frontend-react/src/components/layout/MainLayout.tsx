import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Camera, 
  Tags, 
  Users, 
  CalendarDays, 
  FolderKanban, 
  ScanBarcode, 
  QrCode,
  Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useMemo } from 'react';

// Navigation items configuration
const navItems = [
  { href: '/equipment', label: 'Оборудование', icon: Camera },
  { href: '/categories', label: 'Категории', icon: Tags },
  { href: '/clients', label: 'Клиенты', icon: Users },
  { href: '/bookings', label: 'Бронирования', icon: CalendarDays },
  { href: '/projects', label: 'Проекты', icon: FolderKanban },
  { href: '/scanner', label: 'Сканер', icon: ScanBarcode },
];

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const currentPath = location.pathname;
    
    // Check for exact matches or prefix matches
    const activeItem = navItems.find(item => 
      currentPath === item.href || currentPath.startsWith(item.href + '/')
    );

    if (activeItem) return activeItem.label;
    
    // Specific overrides if needed
    if (currentPath === '/') return 'Оборудование';
    
    return 'ACT Rental';
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-card border-r transition-all duration-300 ease-in-out flex flex-col",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="h-14 border-b flex items-center px-4 justify-between">
          <div className={cn("font-bold text-lg truncate", !isSidebarOpen && "hidden")}>
            ACT Rental
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-accent rounded-md"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground",
                      !isSidebarOpen && "justify-center px-2"
                    )
                  }
                  title={!isSidebarOpen ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {isSidebarOpen && <span>{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t">
           <button 
            className={cn(
              "flex items-center gap-2 w-full justify-center rounded-md bg-secondary p-2 text-secondary-foreground hover:bg-secondary/80",
              !isSidebarOpen && "px-0"
            )}
            title="Быстрое сканирование"
           >
             <QrCode className="h-4 w-4" />
             {isSidebarOpen && <span className="text-sm font-medium">Скан</span>}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b bg-card flex items-center px-6 justify-between shrink-0">
          <h1 className="text-lg font-semibold">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-accent"></div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
