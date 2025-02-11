import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../components/Login';
import { Register } from '../components/Register';
import { Game } from '../components/Game';
import { Dashboard } from '../components/Dashboard';
import { PrivateRoute } from './PrivateRoute';
import { authService } from '../services/authService';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/game"
        element={
          <PrivateRoute>
            <Game />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/"
        element={
          authService.isAuthenticated() ? 
            <Navigate to="/game" replace /> : 
            <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};
