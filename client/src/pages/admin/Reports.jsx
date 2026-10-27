import React, { useState } from 'react';
import api from '../../services/api';
import { FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const REPORT_TYPES = [
  { value: 'applicants', label: 'Applicants Report', desc: 'All applicants with scores and status' },
  { value: 'jobs', label: 'Jobs Report', desc: 'Active jobs with applicant counts' },
];
const FORMATS = [
  { value: 'csv', label: 'CSV', icon: '📄' },
  { value: 'excel', label: 'Excel (.xlsx)', icon: '📊' },
  { value: 'pdf', label: 'PDF', icon: '📑' },
];

export default function Reports() {
  const [type, setType] = useState('applicants');
  const [format, setFormat] = useState('excel');
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/reports/generate', {
        type, format, jobId: jobId || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      }, { responseType: 'blob' });

      const ext = format === 'excel' ? 'xlsx' : format;
      const filename = `${type}_report_${new Date().toISOString().split('T')[0]}.${ext}`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`${filename} downloaded!`);
    } catch (err) {
      toast.error('Failed to generate report. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl yann-stagger-1">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Report Generator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Export recruitment data as CSV, Excel, or PDF</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Report Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPORT_TYPES.map(rt => (
              <button key={rt.value} onClick={() => setType(rt.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  type === rt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}>
                <FileText size={18} className={type === rt.value ? 'text-indigo-600 dark:text-indigo-400 mt-0.5' : 'text-gray-400 mt-0.5'} />
                <div>
                  <p className={`text-sm font-semibold ${type === rt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'}`}>
                    {rt.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rt.desc}</p>
                </div>
                {type === rt.value && <CheckCircle size={16} className="text-indigo-500 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Export Format</label>
          <div className="flex gap-3">
            {FORMATS.map(f => (
              <button key={f.value} onClick={() => setFormat(f.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  format === f.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}>
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        {type === 'applicants' && (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Filters (optional)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <button
          id="generate-report-btn"
          onClick={handleGenerate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> Generating...</>
            : <><Download size={16} /> Generate & Download Report</>}
        </button>
      </div>
    </div>
  );
}
