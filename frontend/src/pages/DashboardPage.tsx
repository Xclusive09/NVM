import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletRes, transactionsRes, batchesRes] = await Promise.all([
          api.getWalletBalance(),
          api.getWalletTransactions(1, 5),
          api.getDistributionBatches(1, 5),
        ]);
        setWalletBalance(walletRes.balance);
        setRecentTransactions(transactionsRes.transactions || []);
        setRecentBatches(batchesRes.batches || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    refreshUser();
  }, [refreshUser]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
      case 'PROCESSING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's an overview of your wallet and recent activity.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wallet Balance Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Wallet Balance</p>
                <p className="text-3xl font-bold mt-1">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
            <Link
              to="/fund-wallet"
              className="mt-4 inline-block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Fund Wallet
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              <Link
                to="/send"
                className="block w-full text-center bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Send Airtime/Data
              </Link>
              <Link
                to="/logs"
                className="block w-full text-center bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                View Logs
              </Link>
            </div>
          </div>

          {/* Recent Activity Summary */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Batches</span>
                <span className="font-semibold">{recentBatches.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transactions</span>
                <span className="font-semibold">{recentTransactions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Wallet Transactions */}
        <div className="bg-white rounded-xl shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Wallet Transactions
            </h3>
            <Link to="/logs" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTransactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No transactions yet
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'CREDIT' ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {tx.type === 'CREDIT' ? 'Credit' : 'Debit'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tx.description || 'Wallet transaction'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Distribution Batches */}
        <div className="bg-white rounded-xl shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Distributions
            </h3>
            <Link to="/logs" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentBatches.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No distributions yet
              </div>
            ) : (
              recentBatches.map((batch) => (
                <div key={batch.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {batch.network} - {batch.valueType}
                    </p>
                    <p className="text-sm text-gray-500">
                      {batch.recipientCount} recipients • {formatCurrency(batch.totalCost)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(batch.status)}`}>
                      {batch.status}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {batch.successCount}/{batch.recipientCount} success
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
