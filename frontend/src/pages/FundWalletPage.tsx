import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function FundWalletPage() {
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  // Handle payment callback
  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference) {
      verifyPayment(reference);
    }
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await api.verifyPayment(reference);
      if (result.status === 'success') {
        setSuccess('Payment successful! Your wallet has been credited.');
        await refreshUser();
        // Clear URL params
        navigate('/fund-wallet', { replace: true });
      } else {
        setError('Payment verification failed. Please contact support.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      setError('Minimum amount is ₦100');
      return;
    }

    setIsLoading(true);

    try {
      const callbackUrl = `${window.location.origin}/fund-wallet`;
      const result = await api.initializePayment(numAmount, callbackUrl);
      
      // Redirect to Paystack payment page
      window.location.href = result.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fund Wallet</h1>
        <p className="text-gray-600 mb-6">
          Add money to your wallet to start distributing airtime and data.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm mb-4">
            {success}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preset amounts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Select
              </label>
              <div className="grid grid-cols-3 gap-2">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      amount === preset.toString()
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-500'
                    }`}
                  >
                    {formatCurrency(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount (NGN)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <input
                  id="amount"
                  type="number"
                  min="100"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum: ₦100</p>
            </div>

            {/* Summary */}
            {amount && parseFloat(amount) >= 100 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount to fund</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(amount))}
                  </span>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) < 100}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Pay with Paystack'}
            </button>
          </form>

          {/* Payment info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Methods</h4>
            <p className="text-sm text-gray-500">
              We accept cards, bank transfers, and USSD payments via Paystack.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <span className="text-2xl">💳</span>
              <span className="text-2xl">🏦</span>
              <span className="text-2xl">📱</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
