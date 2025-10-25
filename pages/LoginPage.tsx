import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';

interface LoginPageProps {
  onLogin: (id: string, role: UserRole) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hardcoded credentials for demo purposes
    if (email.toLowerCase() === 'admin@example.com' && password === 'admin') {
      onLogin('admin@example.com', UserRole.ADMIN);
    } else if (email.toLowerCase() === 'student@example.com' && password === 'student') {
      onLogin('student@example.com', UserRole.USER);
    } else {
      setError('Invalid credentials. Please use the demo accounts.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-950 px-4">
      <Card className={`max-w-md w-full transition-all duration-500 ease-out ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <h2 className="text-3xl font-bold text-center text-white mb-6">Attendance Portal</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Email Address"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="e.g., admin@example.com"
            autoComplete="email"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </div>
        </form>
         <div className="mt-6 pt-4 border-t border-gray-700 text-center text-sm text-gray-400">
            <p className="font-semibold mb-2">Demo Credentials:</p>
            <p>Admin: <b className="text-gray-300 font-mono">admin@example.com</b> / <b className="text-gray-300 font-mono">admin</b></p>
            <p>Student: <b className="text-gray-300 font-mono">student@example.com</b> / <b className="text-gray-300 font-mono">student</b></p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;