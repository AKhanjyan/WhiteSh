'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { Card, Button, Input } from '@shop/ui';
import { apiClient } from '../../../lib/api-client';

export default function PriceFilterSettingsPage() {
  const { isLoggedIn, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [stepSize, setStepSize] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Храним предыдущее значение stepSize для расчета разницы
  const prevStepSizeRef = useRef<string>('');
  const isUpdatingRef = useRef<boolean>(false);

  const fetchSettings = useCallback(async () => {
    try {
      console.log('⚙️ [PRICE FILTER SETTINGS] Fetching settings...');
      setLoading(true);
      const response = await apiClient.get<{ minPrice?: number; maxPrice?: number; stepSize?: number }>('/api/v1/admin/settings/price-filter');
      const minPriceStr = response.minPrice?.toString() || '';
      const maxPriceStr = response.maxPrice?.toString() || '';
      const stepSizeStr = response.stepSize?.toString() || '';
      
      setMinPrice(minPriceStr);
      setMaxPrice(maxPriceStr);
      setStepSize(stepSizeStr);
      prevStepSizeRef.current = stepSizeStr;
      
      console.log('✅ [PRICE FILTER SETTINGS] Settings loaded:', response);
    } catch (err: any) {
      console.error('❌ [PRICE FILTER SETTINGS] Error fetching settings:', err);
      // If settings don't exist, use empty values
      setMinPrice('');
      setMaxPrice('');
      setStepSize('');
      prevStepSizeRef.current = '';
    } finally {
      setLoading(false);
    }
  }, []);

  // Обработчик изменения Step Size - синхронизирует minPrice и maxPrice
  const handleStepSizeChange = (newValue: string) => {
    if (isUpdatingRef.current) return;
    
    const prevStep = prevStepSizeRef.current;
    
    // Если предыдущее значение пустое, просто обновляем
    if (!prevStep) {
      prevStepSizeRef.current = newValue;
      setStepSize(newValue);
      return;
    }
    
    const prevStepNum = parseFloat(prevStep);
    const newStepNum = parseFloat(newValue);
    
    // Если новое значение невалидно, просто обновляем stepSize
    if (isNaN(newStepNum) || newValue.trim() === '') {
      prevStepSizeRef.current = newValue;
      setStepSize(newValue);
      return;
    }
    
    // Вычисляем разницу
    const difference = newStepNum - prevStepNum;
    
    // Применяем разницу к minPrice и maxPrice, если они заполнены
    const prevMin = minPrice.trim();
    const prevMax = maxPrice.trim();
    
    if (prevMin && prevMax) {
      const prevMinNum = parseFloat(prevMin);
      const prevMaxNum = parseFloat(prevMax);
      
      if (!isNaN(prevMinNum) && !isNaN(prevMaxNum)) {
        const newMinNum = prevMinNum + difference;
        const newMaxNum = prevMaxNum + difference;
        
        // Обновляем все значения
        isUpdatingRef.current = true;
        setStepSize(newValue);
        setMinPrice(newMinNum > 0 ? newMinNum.toString() : '');
        setMaxPrice(newMaxNum > 0 ? newMaxNum.toString() : '');
        prevStepSizeRef.current = newValue;
        
        console.log('🔄 [PRICE FILTER] StepSize changed:', {
          prevStep: prevStepNum,
          newStep: newStepNum,
          difference,
          prevMin: prevMinNum,
          newMin: newMinNum,
          prevMax: prevMaxNum,
          newMax: newMaxNum
        });
        
        // Сбрасываем флаг после небольшой задержки
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
        return;
      }
    }
    
    // Если min/max не заполнены, просто обновляем stepSize
    prevStepSizeRef.current = newValue;
    setStepSize(newValue);
  };

  const handleSave = async () => {
    const minValue = minPrice.trim() ? parseFloat(minPrice) : null;
    const maxValue = maxPrice.trim() ? parseFloat(maxPrice) : null;
    const stepValue = stepSize.trim() ? parseFloat(stepSize) : null;

    if (minValue !== null && (isNaN(minValue) || minValue < 0)) {
      alert('Min Price must be a valid positive number');
      return;
    }

    if (maxValue !== null && (isNaN(maxValue) || maxValue < 0)) {
      alert('Max Price must be a valid positive number');
      return;
    }

    if (stepValue !== null && (isNaN(stepValue) || stepValue <= 0)) {
      alert('Step Size must be a valid positive number');
      return;
    }

    if (minValue !== null && maxValue !== null && minValue >= maxValue) {
      alert('Min Price must be less than Max Price');
      return;
    }

    setSaving(true);
    try {
      console.log('⚙️ [PRICE FILTER SETTINGS] Saving settings...', { minValue, maxValue, stepValue });
      await apiClient.put('/api/v1/admin/settings/price-filter', {
        minPrice: minValue,
        maxPrice: maxValue,
        stepSize: stepValue,
      });
      
      alert('Price filter settings saved successfully!');
      console.log('✅ [PRICE FILTER SETTINGS] Settings saved');
    } catch (err: any) {
      console.error('❌ [PRICE FILTER SETTINGS] Error saving settings:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save';
      alert(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isLoggedIn && isAdmin) {
      fetchSettings();
    }
  }, [isLoading, isLoggedIn, isAdmin, fetchSettings]);

  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        console.log('❌ [PRICE FILTER SETTINGS] User not logged in, redirecting to login...');
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        console.log('❌ [PRICE FILTER SETTINGS] User is not admin, redirecting to home...');
        router.push('/');
        return;
      }
    }
  }, [isLoggedIn, isAdmin, isLoading, router]);

  // Get current path to highlight active tab
  const [currentPath, setCurrentPath] = useState(pathname || '/admin');
  
  useEffect(() => {
    if (pathname) {
      setCurrentPath(pathname);
    }
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null; // Will redirect
  }

  const adminTabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: 'Orders',
      path: '/admin/orders',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'products',
      label: 'Products',
      path: '/admin/products',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      id: 'categories',
      label: 'Categories',
      path: '/admin/categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: 'brands',
      label: 'Brands',
      path: '/admin/brands',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
    {
      id: 'users',
      label: 'Users',
      path: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'quick-settings',
      label: 'Quick Settings',
      path: '/admin/quick-settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'price-filter-settings',
      label: 'Filter by Price',
      path: '/admin/price-filter-settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/admin/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Panel
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Filter by Price Settings</h1>
              <p className="text-gray-600 mt-2">Configure default price range and step size for products page filter</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              {adminTabs.map((tab) => {
                const isActive = currentPath === tab.path || 
                  (tab.path === '/admin' && currentPath === '/admin') ||
                  (tab.path !== '/admin' && currentPath.startsWith(tab.path));
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      router.push(tab.path);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                      {tab.icon}
                    </span>
                    <span className="text-left">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Price Filter Default Range</h2>
                <p className="text-sm text-gray-600">
                  Set the default price range and step size for the products page filter. 
                  When Step Size changes, Min Price and Max Price will adjust automatically by the same amount.
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading settings...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Price (USD)
                      </label>
                      <Input
                        type="number"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="100"
                        min="0"
                        step="1"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum price for the filter range (leave empty to use product minimum)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price (USD)
                      </label>
                      <Input
                        type="number"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="1000"
                        min="0"
                        step="1"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum price for the filter range (leave empty to use product maximum)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Step Size (USD)
                      </label>
                      <Input
                        type="number"
                        value={stepSize}
                        onChange={(e) => handleStepSizeChange(e.target.value)}
                        placeholder="100"
                        min="1"
                        step="1"
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Slider step size (e.g., 100 = slider moves in increments of 100). Changing this will adjust Min and Max prices by the same amount.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">How it works:</p>
                        <ul className="list-disc list-inside space-y-1 text-blue-700">
                          <li>These values set the default range shown on the products page price filter</li>
                          <li>If left empty, the filter will use the actual min/max prices from products</li>
                          <li>Step Size controls how the slider moves (e.g., 100 = increments of 100)</li>
                          <li>When Step Size changes, Min Price and Max Price will adjust automatically by the same amount</li>
                          <li>Users can still adjust the range using the slider on the products page</li>
                          <li>Changes take effect immediately after saving</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleSave}
                      disabled={saving}
                      className="px-6"
                    >
                      {saving ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </div>
                      ) : (
                        'Save Settings'
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMinPrice('');
                        setMaxPrice('');
                        setStepSize('');
                        prevStepSizeRef.current = '';
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

