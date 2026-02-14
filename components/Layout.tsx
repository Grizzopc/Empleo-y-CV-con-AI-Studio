
import React from 'react';
import { Briefcase, Github, Mail } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onLogoClick?: () => void;
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogoClick, onLoginClick, isLoggedIn }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={onLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="bg-blue-600 p-2 rounded-lg">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Empleo <span className="text-blue-600">y CV</span>
                <span className="text-xs ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">ARG</span>
              </span>
            </button>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={onLoginClick}
                className="bg-white border border-slate-200 text-slate-700 px-5 py-2 rounded-full text-sm font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 active:scale-95"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/pwa/google.svg" className="w-4 h-4" alt="Google" />
                {isLoggedIn ? 'Mi Cuenta' : 'Conectarse con Google'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex justify-center gap-6 mb-8">
            <Github className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
            <Mail className="w-5 h-5 cursor-pointer hover:text-white transition-colors" />
          </div>
          <p className="text-sm">© 2024 Empleo y CV Argentina. Hecho con ❤️ para la comunidad laboral argentina.</p>
          <div className="mt-4 flex justify-center gap-4 text-xs">
            <a href="#" className="hover:underline">Privacidad</a>
            <a href="#" className="hover:underline">Términos</a>
            <a href="#" className="hover:underline">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
