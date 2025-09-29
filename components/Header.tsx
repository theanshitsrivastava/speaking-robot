import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm p-4 flex items-center justify-center border-b border-slate-700 shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-fuchsia-400">Chat with Radha</h1>
        <p className="text-sm text-slate-400 mt-1">Your friendly and supportive AI companion</p>
      </div>
    </header>
  );
};

export default Header;
