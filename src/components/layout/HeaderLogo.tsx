
import React from 'react';
import { Link } from 'react-router-dom';

const HeaderLogo: React.FC = () => {
  return (
    <div className="flex-shrink-0">
      <Link to="/" className="flex items-center">
        <img 
          src="/lovable-uploads/73c12031-858d-406a-a679-3b7259c7649d.png" 
          alt="GoodSignals" 
          className="h-8 w-auto"
        />
      </Link>
    </div>
  );
};

export default HeaderLogo;
