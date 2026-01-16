
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-700/50">
            <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-500">
                        Dialectical Reader
                    </h1>
                    <p className="hidden md:block text-sm text-gray-400">Iterative Textual Analysis</p>
                </div>
            </div>
        </header>
    );
};

export default Header;
