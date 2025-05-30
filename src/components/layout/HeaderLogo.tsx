
import React from 'react';
import { Link } from 'react-router-dom';

const HeaderLogo: React.FC = () => {
  return (
    <div className="flex-shrink-0">
      <Link to="/" className="text-2xl font-bold text-white">
        GoodSignals
      </Link>
    </div>
  );
};

export default HeaderLogo;
