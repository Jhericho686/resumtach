import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ResumeUpload = () => {
  const [files, setFiles] = useState([]);
  const [jobId, setJobId] = useState('');
  const [jobs, setJobs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const navigate = useNavigate();

  const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await api.get('/jobs?status=active');
        setJobs(response.data.jobs || []);
      } catch (error) {
        toast.error('Failed to load jobs');
      }
    };
    fetchJobs();
  }, []);

  // Sync overall batch progress bar to real-time average of ALL files being processed
  useEffect(() => {
    if (!uploading || totalFilesToProcess === 0) return;
    
    // Sum up progress of all files that are currently processing or finished
    const sum = files.reduce((acc, f) => {
      if (f.status === 'uploading' || f.status === 'success' || f.status === 'error') {
        return acc + (f.progress || 0);
      }
      return acc;
    }, 0);
    
    // Divide by the total number of files we INTENDED to process, not just the active batch
    const avg = sum / totalFilesToProcess;
    setOverallProgress(Math.round(avg));
  }, [files, uploading, totalFilesToProcess]);


  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (uploading) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(droppedFiles);
  };

  const handleFileChange = (e) => {
    if (uploading) return;
    const selectedFiles = Array.from(e.target.files);
    validateAndAddFiles(selectedFiles);
  };

  const validateAndAddFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    const newFiles = selectedFiles.filter(file => {
      const isValidType = validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.docx');
      const isValidSize = file.size <= 5 * 1024 * 1024;

      if (!isValidType) toast.error(`File ${file.name} is not a PDF or DOCX`);
      if (!isValidSize) toast.error(`File ${file.name} exceeds 5MB limit`);

      // Prevent duplicates by checking name and size
      const isDuplicate = files.some(f => f.file.name === file.name && f.file.size === file.size);
      if (isDuplicate) toast.error(`File ${file.name} is already added`);

      return isValidType && isValidSize && !isDuplicate;
    }).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      result: null,
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id) => {
    if (uploading) return;
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearCompleted = () => {
    if (uploading) return;
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const updateFileState = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadSingleFile = async (currentFile) => {
    updateFileState(currentFile.id, { status: 'uploading', progress: 10 });

    const formData = new FormData();
    formData.append('resume', currentFile.file);
    formData.append('jobId', jobId);

    // Simulate progress while uploading
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
        if (f.id === currentFile.id && f.status === 'uploading' && f.progress < 85) {
          return { ...f, progress: f.progress + 10 };
        }
        return f;
      }));
    }, 800);

    try {
      const response = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      clearInterval(progressInterval);
      updateFileState(currentFile.id, {
        status: 'success',
        progress: 100,
        result: response.data.applicant
      });
      return true;
    } catch (error) {
      clearInterval(progressInterval);
      updateFileState(currentFile.id, {
        status: 'error',
        progress: 0,
        error: error.response?.data?.message || 'Failed to process resume'
      });
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');

    if (pendingFiles.length === 0) {
      toast.error('Please add new resumes to upload');
      return;
    }
    if (!jobId) {
      toast.error('Please select a job position');
      return;
    }

    setTotalFilesToProcess(pendingFiles.length);
    setUploading(true);

    // Process in parallel batches of 5 at a time (avoids rate limits)
    const BATCH_SIZE = 5;
    let successCount = 0;
    const results = [];

    for (let i = 0; i < pendingFiles.length; i += BATCH_SIZE) {
      const batch = pendingFiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(f => uploadSingleFile(f)));
      results.push(...batchResults);
      successCount += batchResults.filter(Boolean).length;
    }

    setOverallProgress(100);

    setUploading(false);

    if (successCount === pendingFiles.length) {
      toast.success(`✅ All ${successCount} resumes processed successfully!`);
    } else if (successCount > 0) {
      toast.warning(`Processed ${successCount} of ${pendingFiles.length} resumes. ${pendingFiles.length - successCount} failed.`);
    } else {
      toast.error('All resume uploads failed. Please check your connection.');
    }

    setTimeout(() => setOverallProgress(0), 3000);
  };


  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Resume Upload</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Select multiple resumes to process. The AI engine will parse and score each candidate sequentially.
        </p>
      </div>

      <div className="card p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Job Position *
            </label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="input-field p-3 border rounded-lg w-full"
              required
              disabled={uploading}
            >
              <option value="">-- Select a Job Opening --</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.title} ({job.department})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Resumes (PDF or DOCX) *
            </label>
            <div
              className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-xl transition-colors ${files.length > 0 ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/5' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
                }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="space-y-2 text-center w-full">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 dark:text-primary-400">
                    <span>Select multiple files</span>
                    <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleFileChange} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                  </label>
                  <p className="pl-1">or drag and drop them here</p>
                </div>
                <p className="text-xs text-gray-500">PDF, DOCX up to 5MB per file</p>
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {files.length} File{files.length !== 1 && 's'} Selected
                </h3>
                {files.some(f => f.status === 'success') && !uploading && (
                  <button type="button" onClick={clearCompleted} className="text-xs text-gray-500 hover:text-primary-600">
                    Clear Completed
                  </button>
                )}
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
                {files.map((fileObj) => (
                  <li key={fileObj.id} className="p-3 bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="text-gray-400 flex-shrink-0" size={20} />
                        <div className="min-w-0 flex-1 flex flex-col">
                          {fileObj.status === 'success' && fileObj.result?.id ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/applicants/${fileObj.result.id}`)}
                              className="text-left text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400 truncate"
                              title="Click to view applicant profile"
                            >
                              {fileObj.file?.name || 'Unknown File'}
                            </button>
                          ) : (
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={fileObj.file?.name || 'Unknown File'}>
                              {fileObj.file?.name || 'Unknown File'}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatFileSize(fileObj.file?.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        {fileObj.status === 'uploading' && (
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div className="bg-primary-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${fileObj.progress}%` }}></div>
                          </div>
                        )}

                        {fileObj.status === 'success' && (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                              Score: {fileObj.result?.score != null ? fileObj.result.score : 'N/A'}
                            </span>
                            <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                            {fileObj.result?.id && (
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/applicants/${fileObj.result.id}`)}
                                title="View Applicant Details"
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-primary-50 text-gray-600 hover:text-primary-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 transition-colors"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                          </div>
                        )}

                        {fileObj.status === 'error' && (
                          <div className="text-red-500 flex items-center gap-1 text-xs" title={fileObj.error}>
                            <AlertCircle size={16} /> <span className="hidden sm:inline w-24 truncate">{fileObj.error}</span>
                          </div>
                        )}

                        {(fileObj.status === 'pending' || fileObj.status === 'error') && !uploading && (
                          <button type="button" onClick={() => removeFile(fileObj.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {uploading && (
            <div className="space-y-2 pt-4">
              <div className="flex justify-between text-sm text-primary-600 dark:text-primary-400 font-medium">
                <span>Processing Batch...</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setFiles([]); setJobId(''); }}
              disabled={uploading}
            >
              Clear All
            </button>
            <button
              type="submit"
              className={`btn ${!jobId ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'btn-primary'}`}
              disabled={files.filter(f => f.status === 'pending' || f.status === 'error').length === 0 || !jobId || uploading}
            >
              {!jobId ? 'Select Job Position First' : uploading ? 'Processing Resumes...' : 'Process Batch Resumes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResumeUpload;
