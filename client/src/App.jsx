// client/src/App.jsx
import React, { useState, useEffect } from 'react'; // Ensure useEffect is imported
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid'; 
import axios from 'axios';
import Dashboard from './Dashboard'; // Import the Dashboard component - verify this path!

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); 
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false); 
  const [loggedInUser, setLoggedInUser] = useState(null); // Stores the user object if logged in

  const API_BASE_URL = 'http://localhost:5000'; // Your backend server URL

  // Effect to check if a user is already logged in (e.g., from a previous session cookie)
  // This runs once when the App component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      try {
        // Attempt to hit a protected route on the backend to check if the session is active.
        // The backend's `isAuthenticated` middleware will tell us if a valid session exists.
        const response = await axios.get(`${API_BASE_URL}/protected`, {
          withCredentials: true // Crucial for sending the existing session cookie to the backend
        });
        
        // If the protected route returns a 200 status, the user is authenticated.
        if (response.status === 200) {
          setLoggedInUser(response.data.user); // Set the logged-in user state
          setMessage(`Welcome back, ${response.data.user.username}!`); // Display a welcome message
        }
      } catch (error) {
        // If an error (e.g., 401 Unauthorized) occurs, the user is not authenticated.
        setLoggedInUser(null); // Clear the logged-in user state
        // console.log('Not authenticated:', error.response?.data?.message || error.message); // Log for debugging
      } finally {
        setIsLoading(false); // End loading state
      }
    };

    checkAuthStatus(); // Run this check once when the App component mounts
  }, []); // Empty dependency array ensures this effect runs only once

  /**
   * Handles user login or registration form submission.
   * Based on `isRegistering` state, it calls the appropriate backend API.
   * @param {Event} e - The form submission event.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(''); // Clear any previous messages

    try {
      let response;
      if (isRegistering) {
        // Registration API call to the backend
        response = await axios.post(`${API_BASE_URL}/auth/register`, {
          username,
          email,
          password,
        }, {
          withCredentials: true // Important for sending/receiving cookies (session management)
        });
      } else {
        // Login API call to the backend
        response = await axios.post(`${API_BASE_URL}/auth/login`, {
          username,
          password,
        }, {
          withCredentials: true // Important for sending/receiving cookies (session management)
        });
      }

      setMessage(response.data.message); // Display success message from backend
      setLoggedInUser(response.data.user); // Store the logged-in user data received from backend
      
      // Clear form fields after successful submission
      setUsername('');
      setPassword('');
      setEmail('');

    } catch (error) {
      // Handle API errors
      console.error('Authentication error:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'An unexpected error occurred. Please try again.');
      setLoggedInUser(null); // Ensure user is not logged in on error
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  /**
   * Toggles the visibility of the password input field.
   */
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  /**
   * Toggles between the login and registration form views.
   * Also clears messages and form fields when switching views.
   */
  const toggleFormView = () => {
    setIsRegistering(!isRegistering);
    setMessage(''); 
    setUsername('');
    setPassword('');
    setEmail('');
  };

  /**
   * Handles user logout. Sends a request to the backend's logout endpoint.
   */
  const handleLogout = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        withCredentials: true // Crucial for sending the session cookie to terminate it
      });
      setMessage(response.data.message); // Display logout success message
      setLoggedInUser(null); // Clear logged-in user data, returning to auth form
    } catch (error) {
      console.error('Logout error:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'An error occurred during logout.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Conditional Rendering ---
  // If `loggedInUser` state has data, it means the user is authenticated.
  // In this case, render the Dashboard component and pass necessary props.
  if (loggedInUser) {
    return <Dashboard loggedInUser={loggedInUser} handleLogout={handleLogout} />;
  }

  // If not logged in, display the Login/Register form.
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 font-[Poppins] text-gray-800">
      <header className="text-center mb-10">
        <h1 className="text-5xl font-extrabold text-blue-900 tracking-tight leading-tight drop-shadow-md">
          Team Task Manager
        </h1>
        <p className="mt-4 text-xl text-gray-700 font-light">
          {isRegistering ? 'Join our community!' : 'Welcome back! Please login to your account.'}
        </p>
      </header>

      <main className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-200 transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <h2 className="text-3xl text-center text-gray-800 font-bold mb-8">
          {isRegistering ? 'Register' : 'Sign In'}
        </h2>
        {message && (
          <div className={`mb-4 p-3 rounded-md text-sm text-center 
            ${message.includes('successfully') || message.includes('Welcome back') ? 'bg-green-100 border border-green-300 text-green-800' : 'bg-red-100 border border-red-300 text-red-800'}`
          }>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          {/* Username Input Field */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:outline-none focus:border-blue-500 text-base placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          {/* Email Input Field (only for Registration) */}
          {isRegistering && (
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:outline-none focus:border-blue-500 text-base placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          )}
          {/* Password Input Field with Toggle */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="mt-1 block w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:outline-none focus:border-blue-500 text-base placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {/* Submit Button (Login or Register) */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white py-3 rounded-lg font-bold text-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isRegistering ? 'Registering...' : 'Logging In...'}
                </span>
              ) : (
                isRegistering ? 'Register' : 'Login'
              )}
            </button>
          </div>
          {/* Toggle between Login and Register */}
          <p className="text-center text-base text-gray-600 mt-4">
            {isRegistering ? 'Already have an account?' : 'Don’t have an account?'}{' '}
            <button
              type="button"
              onClick={toggleFormView}
              disabled={isLoading}
              className="text-sky-600 hover:underline font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 rounded px-1 -mx-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegistering ? 'Login here' : 'Register Now'}
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

export default App;
