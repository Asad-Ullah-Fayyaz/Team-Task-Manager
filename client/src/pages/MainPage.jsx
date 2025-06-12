import React from 'react';
import { Link } from 'react-router-dom';

const MainPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center mb-12">
          Welcome to Task Manager
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Login Card */}
          <div className="bg-white rounded-lg shadow-xl p-8 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Login</h2>
            <p className="text-gray-600 mb-6">
              Already have an account? Sign in to access your tasks and projects.
            </p>
            <Link
              to="/login"
              className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
            >
              Login
            </Link>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-lg shadow-xl p-8 transform hover:scale-105 transition-transform duration-300">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Register</h2>
            <p className="text-gray-600 mb-6">
              New to Task Manager? Create an account to get started.
            </p>
            <Link
              to="/register"
              className="block w-full bg-purple-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-300"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage; 