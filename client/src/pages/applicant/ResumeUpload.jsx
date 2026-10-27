import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { resumesService } from '../../services/firestore';
import { uploadResume, validateResumeFile } from '../../services/storage';
import { UploadCloud, File, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import CaptchaWidget from '../../components/common/CaptchaWidget';

const ResumeUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaError, setCaptchaError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (selectedFile) => {
    setError(null);
    setCaptchaError('');
    const validation = validateResumeFile(selectedFile);
    
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    if (!isCaptchaVerified) {
      setCaptchaError('Please verify that you are not a robot before submitting your resume.');
      return;
    }
    setCaptchaError('');
    
    setUploading(true);
    setError(null);
    
    try {
      // 1. Upload to Firebase Storage
      const { storagePath, downloadUrl, fileName, fileSize, fileType } = await uploadResume(
        file, 
        user.uid,
        (p) => setProgress(p)
      );

      // Check if resume already exists
      const existingResume = await resumesService.getResume(user.uid);
      
      const resumeData = {
        userId: user.uid,
        storagePath,
        storageUrl: downloadUrl,
        fileName,
        fileSize,
        fileType,
        isParsed: false
      };

      // Since the backend already handles parsing and metadata updates inside `/resumes/upload`, 
      // we don't need to call undefined resumesService methods here.


      setSuccess(true);
      toast.success('Resume uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || 'Failed to upload resume. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Resume</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Upload your CV in PDF or DOCX format to apply for jobs.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-8">
        
        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Complete!</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Your resume has been securely saved. You can now edit its contents directly in our Word-style editor or return to your profile.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate('/applicant/resume/edit')}
                className="btn bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Open in Word Editor
              </button>
              <button
                onClick={() => navigate('/applicant/profile')}
                className="btn btn-secondary px-6 py-2.5 rounded-xl border transition-all cursor-pointer"
              >
                Go to Profile
              </button>
            </div>
          </div>
        ) : (
          <>
            <form 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragActive 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : file ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleChange}
              />

              {!file ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-full shadow-sm flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <UploadCloud size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">Drag and drop your resume here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to browse your files</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                  >
                    Select File
                  </button>
                  <p className="text-xs text-gray-400 mt-4">Supported formats: PDF, DOC, DOCX. Max size: 5MB.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl shadow-sm flex items-center justify-center text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                    <File size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  
                  {!uploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setError(null);
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <X size={16} /> Remove File
                    </button>
                  )}
                </div>
              )}
            </form>

            {error && (
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {uploading && (
              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span>Uploading...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* reCAPTCHA Verification before submitting resume */}
            {file && !uploading && (
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                <CaptchaWidget 
                  onVerify={(val) => {
                    setIsCaptchaVerified(val);
                    setCaptchaError('');
                  }}
                  isVerified={isCaptchaVerified}
                  error={captchaError}
                />
              </div>
            )}

            <div className="mt-8 flex justify-end gap-4 border-t border-gray-100 dark:border-gray-700 pt-6">
              <button
                type="button"
                onClick={() => navigate('/applicant/profile')}
                disabled={uploading}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-8 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing</>
                ) : (
                  <><UploadCloud size={16} /> Submit Resume</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;
