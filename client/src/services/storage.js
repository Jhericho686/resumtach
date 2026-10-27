import api from './api';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Allowed extensions
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const validateResumeFile = (file) => {
  const errors = [];

  if (!file) {
    errors.push('No file selected.');
    return { valid: false, errors };
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    errors.push('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
  }

  const fileName = file.name.toLowerCase();
  const ext = '.' + fileName.split('.').pop();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push('Invalid file extension. Only .pdf, .doc, and .docx are allowed.');
  }

  const parts = fileName.split('.');
  if (parts.length > 2) {
    const suspiciousExtensions = ['.exe', '.php', '.js', '.html', '.bat', '.cmd', '.sh', '.ps1'];
    for (const part of parts.slice(0, -1)) {
      if (suspiciousExtensions.includes('.' + part)) {
        errors.push('Suspicious file name detected. Please rename the file.');
        break;
      }
    }
  }

  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    errors.push('Invalid file name.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const uploadResume = async (file, userId, onProgress = null) => {
  const validation = validateResumeFile(file);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  const formData = new FormData();
  formData.append('resume', file);
  // Add a dummy job ID to pass the controller check if it's strictly required
  formData.append('jobId', 'profile');

  try {
    const response = await api.post('/resumes/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });

    const fileUrl = response.data.applicant?.resume_file || 'uploads/resume.pdf';

    return {
      storagePath: fileUrl,
      downloadUrl: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    };
  } catch (error) {
    console.error('API Upload Error:', error);
    const msg = error.response?.data?.message || error.message || 'Failed to upload resume to server.';
    throw new Error(msg);
  }
};

export const getResumeDownloadUrl = async (storagePath) => {
  return storagePath;
};

export const deleteResume = async (storagePath) => {
  // Not implemented in backend yet, ignore
};

export const getResumeFileUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('blob:')) {
    return pathOrUrl;
  }
  const cleanPath = pathOrUrl.replace(/\\/g, '/').replace(/^\/?/, '');
  const baseUrl = import.meta.env.MODE === 'production'
    ? 'https://resumatchvc3.onrender.com'
    : 'http://localhost:5000';
  return `${baseUrl}/${cleanPath}`;
};

export const openResumeUrl = (url, fileName = 'resume.pdf', applicantId = null) => {
  if (!url && !applicantId) {
    console.warn('Resume URL or applicantId not available');
    return;
  }
  const params = new URLSearchParams();
  if (url) params.set('url', url);
  if (fileName) params.set('fileName', fileName);
  if (applicantId) params.set('applicantId', applicantId);

  // Open the view-only Document & Google Docs viewer in a brand new tab
  window.open(`/resume/view?${params.toString()}`, '_blank', 'noopener,noreferrer');
};

export const storageService = {
  validateResumeFile,
  uploadResume,
  getResumeDownloadUrl,
  deleteResume,
  openResumeUrl,
  getResumeFileUrl
};

export default storageService;


