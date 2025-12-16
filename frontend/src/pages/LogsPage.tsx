import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { api } from '../lib/api';

type TabType = 'wallet' | 'batches' | 'payments';

export function LogsPage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('batches');
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  // Check for batch parameter in URL
  useEffect(() => {
    const batchId = searchParams.get('batch');
    if (batchId) {
      fetchBatchDetails(batchId);
    }
  }, [searchParams]);

  // Fetch data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab, pagination.page]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'wallet':
          const walletRes = await api.getWalletTransactions(pagination.page, 20);
          setWalletTransactions(walletRes.transactions || []);
          setPagination({
            page: walletRes.pagination?.page || 1,
            totalPages: walletRes.pagination?.totalPages || 1,
          });
          break;
        case 'batches':
          const batchRes = await api.getDistributionBatches(pagination.page, 20);
          setBatches(batchRes.batches || []);
          setPagination({
            page: batchRes.pagination?.page || 1,
            totalPages: batchRes.pagination?.totalPages || 1,
          });
          break;
        case 'payments':
          const paymentRes = await api.getPaymentHistory(pagination.page, 20);
          setPayments(paymentRes.payments || []);
          setPagination({
            page: paymentRes.pagination?.page || 1,
            totalPages: paymentRes.pagination?.totalPages || 1,
          });
          break;
      }
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatchDetails = async (batchId: string) => {
    try {
      const batch = await api.getDistributionBatch(batchId);
      setSelectedBatch(batch);
      setActiveTab('batches');
    } catch (error) {
      console.error('Failed to fetch batch details', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
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

  const tabs = [
    { id: 'batches' as const, label: 'Distribution Batches', icon: '📦' },
    { id: 'wallet' as const, label: 'Wallet Transactions', icon: '💳' },
    { id: 'payments' as const, label: 'Payment History', icon: '💰' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transaction Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            View your wallet transactions, distribution batches, and payment history.
          </p>
        </div>

        {/* Batch Details Modal */}
        {selectedBatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Batch Details
                </h3>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Batch Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Network</p>
                      <p className="font-medium">{selectedBatch.network}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="font-medium">{selectedBatch.valueType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="font-medium">{formatCurrency(selectedBatch.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedBatch.status)}`}>
                        {selectedBatch.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Success</p>
                      <p className="font-medium text-green-600">
                        {selectedBatch.successCount}/{selectedBatch.recipientCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Failed</p>
                      <p className="font-medium text-red-600">
                        {selectedBatch.failedCount}/{selectedBatch.recipientCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recipients List */}
                <h4 className="font-medium text-gray-900 mb-3">Recipients</h4>
                <div className="space-y-2">
                  {selectedBatch.recipients?.map((recipient: any) => (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{recipient.phoneNumber}</p>
                        {recipient.errorMessage && (
                          <p className="text-xs text-red-500">{recipient.errorMessage}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{formatCurrency(recipient.amount)}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                            recipient.status
                          )}`}
                        >
                          {recipient.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPagination({ page: 1, totalPages: 1 });
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Wallet Transactions */}
              {activeTab === 'wallet' && (
                <div className="divide-y divide-gray-200">
                  {walletTransactions.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                      No wallet transactions yet
                    </div>
                  ) : (
                    walletTransactions.map((tx) => (
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
                            <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
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
              )}

              {/* Distribution Batches */}
              {activeTab === 'batches' && (
                <div className="divide-y divide-gray-200">
                  {batches.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                      No distribution batches yet
                    </div>
                  ) : (
                    batches.map((batch) => (
                      <div
                        key={batch.id}
                        onClick={() => fetchBatchDetails(batch.id)}
                        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {batch.network} - {batch.valueType}
                          </p>
                          <p className="text-sm text-gray-500">
                            {batch.recipientCount} recipients • {formatCurrency(batch.totalCost)}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(batch.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(batch.status)}`}>
                            {batch.status}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            ✓ {batch.successCount} / ✗ {batch.failedCount}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Payment History */}
              {activeTab === 'payments' && (
                <div className="divide-y divide-gray-200">
                  {payments.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                      No payment history yet
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Wallet Funding via {payment.provider}
                          </p>
                          <p className="text-sm text-gray-500">Ref: {payment.reference}</p>
                          <p className="text-xs text-gray-400">{formatDate(payment.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
