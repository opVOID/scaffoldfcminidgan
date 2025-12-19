
import React from 'react';
import { Home, Trophy, Gift, CreditCard, Dices } from 'lucide-react';
import { PageType } from '../types';
import { NAV_ITEMS } from '../constants';

interface NavBarProps {
  activePage: PageType;
  setPage: (page: PageType) => void;
}

const NavBar: React.FC<NavBarProps> = ({ activePage, setPage }) => {
  const getIcon = (iconName: string, isActive: boolean) => {
    const props = { 
      size: 24, 
      className: `${isActive ? 'text-neon' : 'text-gray-500'} transition-colors duration-200` 
    };
    
    switch (iconName) {
      case 'Home': return <Home {...props} />;
      case 'Trophy': return <Trophy {...props} />;
      case 'Gift': return <Gift {...props} />;
      case 'CreditCard': return <CreditCard {...props} />;
      case 'Dices': return <Dices {...props} />;
      default: return null;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-6 py-4 pb-8 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id as PageType)}
              className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer group"
            >
              {getIcon(item.icon, isActive)}
              <span className={`text-[10px] font-bold ${isActive ? 'text-neon' : 'text-gray-600'} tracking-wider`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NavBar;
