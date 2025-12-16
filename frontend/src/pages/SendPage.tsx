import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Network, ValueType, DataPlan } from '../types';

const NETWORKS: { value: Network; label: string; color: string }[] = [
  { value: 'MTN', label: 'MTN', color: 'bg-yellow-400' },
  { value: 'AIRTEL', label: 'Airtel', color: 'bg-red-500' },
  { value: 'GLO', label: 'Glo', color: 'bg-green-500' },
  { value: 'NINE_MOBILE', label: '9mobile', color: 'bg-green-700' },
];

export function SendPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  
  const [network, setNetwork] = useState<Network | ''>('');
  const [valueType, setValueType] = useState<ValueType>('AIRTIME');
  const [amount, setAmount] = useState('');
  const [dataPlanId, setDataPlanId] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await api.getWalletBalance();
        setWalletBalance(res.balance);
      } catch (err) {
        console.error('Failed to fetch balance', err);
      }
    };
    fetchBalance();
  }, []);

  // Fetch data plans when network changes
  useEffect(() => {
    if (network && valueType === 'DATA') {
      fetchDataPlans(network);
    }
  }, [network, valueType]);

  const fetchDataPlans = async (selectedNetwork: Network) => {
    setIsLoadingPlans(true);
    try {
      const plans = await api.getDataPlans(selectedNetwork);
      setDataPlans(plans);
    } catch (err) {
      console.error('Failed to fetch data plans', err);
      setDataPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const parsePhoneNumbers = (input: string): string[] => {
    return input
      .split(/[,\n;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  };

  const phoneNumbers = parsePhoneNumbers(phoneInput);

  const getSelectedPlan = () => {
    return dataPlans.find((p) => p.id === dataPlanId);
  };

  const calculateTotalCost = () => {
    const count = phoneNumbers.length;
    if (count === 0) return 0;

    if (valueType === 'AIRTIME') {
      return count * (parseFloat(amount) || 0);
    } else {
      const plan = getSelectedPlan();
      return count * (plan?.price || 0);
    }
  };

  const totalCost = calculateTotalCost();
  const hasInsufficientBalance = totalCost > walletBalance;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!network) {
      setError('Please select a network');
      return;
    }

    if (phoneNumbers.length === 0) {
      setError('Please enter at least one phone number');
      return;
    }

    if (valueType === 'AIRTIME' && (!amount || parseFloat(amount) < 50)) {
      setError('Minimum airtime amount is ₦50');
      return;
    }

    if (valueType === 'DATA' && !dataPlanId) {
      setError('Please select a data plan');
      return;
    }

    if (hasInsufficientBalance) {
      setError('Insufficient wallet balance');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await api.createDistribution({
        network,
        valueType,
        amount: valueType === 'AIRTIME' ? parseFloat(amount) : undefined,
        dataPlanId: valueType === 'DATA' ? dataPlanId : undefined,
        phoneNumbers,
      });

      await refreshUser();
      
      // Navigate to batch details
      navigate(`/logs?batch=${result.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create distribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Parse CSV - assume single column or comma-separated
      const numbers = content
        .split(/[\n,;]+/)
        .map((line) => line.trim().replace(/['"]/g, ''))
        .filter(Boolean);
      setPhoneInput((prev) => (prev ? prev + '\n' + numbers.join('\n') : numbers.join('\n')));
    };
    reader.readAsText(file);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Send Airtime/Data</h1>
        <p className="text-gray-600 mb-6">
          Distribute airtime or data to multiple recipients at once.
        </p>

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Available Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(walletBalance)}</p>
            </div>
            {hasInsufficientBalance && totalCost > 0 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                Insufficient funds
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Network
            </label>
            <div className="grid grid-cols-4 gap-2">
              {NETWORKS.map((net) => (
                <button
                  key={net.value}
                  type="button"
                  onClick={() => {
                    setNetwork(net.value);
                    setDataPlanId('');
                  }}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                    network === net.value
                      ? 'border-indigo-600 ring-2 ring-indigo-600 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-500'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full ${net.color} mx-auto mb-1`}></div>
                  {net.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setValueType('AIRTIME')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  valueType === 'AIRTIME'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📱 Airtime
              </button>
              <button
                type="button"
                onClick={() => setValueType('DATA')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  valueType === 'DATA'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                📶 Data
              </button>
            </div>
          </div>

          {/* Amount or Data Plan */}
          {valueType === 'AIRTIME' ? (
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Airtime Amount (per recipient)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <input
                  id="amount"
                  type="number"
                  min="50"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter amount"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum: ₦50</p>
            </div>
          ) : (
            <div>
              <label htmlFor="dataPlan" className="block text-sm font-medium text-gray-700 mb-2">
                Select Data Plan
              </label>
              {!network ? (
                <p className="text-sm text-gray-500">Please select a network first</p>
              ) : isLoadingPlans ? (
                <p className="text-sm text-gray-500">Loading data plans...</p>
              ) : (
                <select
                  id="dataPlan"
                  value={dataPlanId}
                  onChange={(e) => setDataPlanId(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a plan</option>
                  {dataPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.dataSize} - {formatCurrency(plan.price)} ({plan.validity})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Phone Numbers Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="phones" className="block text-sm font-medium text-gray-700">
                Phone Numbers
              </label>
              <label className="text-sm text-indigo-600 cursor-pointer hover:text-indigo-800">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                📄 Upload CSV
              </label>
            </div>
            <textarea
              id="phones"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter phone numbers separated by commas or new lines:&#10;08012345678&#10;08098765432&#10;..."
            />
            <p className="mt-1 text-xs text-gray-500">
              {phoneNumbers.length} phone number{phoneNumbers.length !== 1 ? 's' : ''} entered
            </p>
          </div>

          {/* Summary */}
          {phoneNumbers.length > 0 && totalCost > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Recipients</span>
                <span className="font-medium">{phoneNumbers.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount per recipient</span>
                <span className="font-medium">
                  {valueType === 'AIRTIME'
                    ? formatCurrency(parseFloat(amount) || 0)
                    : formatCurrency(getSelectedPlan()?.price || 0)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium text-gray-900">Total Cost</span>
                <span className={`text-lg font-bold ${hasInsufficientBalance ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(totalCost)}
                </span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || hasInsufficientBalance || phoneNumbers.length === 0}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Processing...' : `Send ${valueType === 'AIRTIME' ? 'Airtime' : 'Data'}`}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
