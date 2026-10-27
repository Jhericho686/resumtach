import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  Eye, 
  Download, 
  Printer, 
  ArrowLeft, 
  Edit3, 
  FileText, 
  Sparkles, 
  Globe, 
  ExternalLink,
  AlertCircle,
  RefreshCw,
  X
} from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

const ResumeViewer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const applicantId = searchParams.get("applicantId");
  const rawUrl = searchParams.get("url") || "";
  const paramFileName = searchParams.get("fileName") || "";

  const [loading, setLoading] = useState(true);
  const [docHtml, setDocHtml] = useState("");
  const [fileName, setFileName] = useState(paramFileName || "Resume Document");
  const [fileExt, setFileExt] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [convertedFromPdf, setConvertedFromPdf] = useState(false);
  const [viewMode, setViewMode] = useState("document"); // 'document' | 'gdocs'
  const [error, setError] = useState(null);

  // Determine if a public URL exists for Google Docs Viewer
  const isPublicUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      (lower.startsWith("http://") || lower.startsWith("https://")) &&
      !lower.includes("localhost") &&
      !lower.includes("127.0.0.1")
    );
  };

  const loadDocument = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (applicantId) params.applicantId = applicantId;
      if (rawUrl) params.url = rawUrl;
      if (paramFileName) params.fileName = paramFileName;

      const res = await api.get("/resumes/edit-html", { params });
      const data = res.data || {};

      setDocHtml(data.html || "");
      if (data.fileName) setFileName(data.fileName);
      if (data.ext) setFileExt(data.ext);
      if (data.canEdit !== undefined) setCanEdit(data.canEdit);
      if (data.convertedFromPdf !== undefined) setConvertedFromPdf(data.convertedFromPdf);

      // Resolve full file url
      let resolvedUrl = data.fileUrl || rawUrl || "";
      if (resolvedUrl && !resolvedUrl.startsWith("http")) {
        const cleanPath = resolvedUrl.replace(/\\/g, "/").replace(/^\/?/, "");
        const baseUrl = import.meta.env.MODE === "production"
          ? "https://resumatchvc3.onrender.com"
          : "http://localhost:5000";
        resolvedUrl = `${baseUrl}/${cleanPath}`;
      }
      setFileUrl(resolvedUrl);

    } catch (err) {
      console.error("Failed to load resume document:", err);
      setError(err.response?.data?.message || "Failed to load document preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [applicantId, rawUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName || "resume";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } else {
      toast.error("File download link not available.");
    }
  };

  const handleOpenEditor = () => {
    if (applicantId && isAdmin) {
      navigate(`/admin/resume/edit?applicantId=${applicantId}`);
    } else {
      navigate("/applicant/resume/edit");
    }
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      window.close();
      // Fallback if window.close() is blocked by browser for tabs not opened via window.open()
      navigate(-1);
    } else {
      window.close();
    }
  };

  const hasPublicDoc = isPublicUrl(fileUrl);
  const googleDocsEmbedUrl = hasPublicDoc
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar (Hidden when printing) */}
      <header className="no-print sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Left: Close/Back & File Details */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Viewer"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <FileText size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-semibold text-white truncate max-w-[200px] sm:max-w-md">
                    {fileName.replace(/\.(docx|pdf|doc)$/i, "")}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <Eye size={11} /> View Only
                  </span>
                  {convertedFromPdf && (
                    <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <Sparkles size={11} /> Converted from PDF
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {fileExt ? fileExt.toUpperCase().replace(".", "") + " Document" : "Resume Preview"}
                </p>
              </div>
            </div>
          </div>

          {/* Center: Mode Selector (If Google Docs Viewer is available) */}
          {hasPublicDoc && (
            <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setViewMode("document")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "document"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Document Reader
              </button>
              <button
                onClick={() => setViewMode("gdocs")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "gdocs"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe size={13} /> Google Docs Viewer
              </button>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && (
              <button
                onClick={handleOpenEditor}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
                title="Edit this document"
              >
                <Edit3 size={15} />
                <span className="hidden sm:inline">Edit Resume</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition-all"
              title="Print or Save as PDF"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition-all"
              title="Download File"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Document Viewer Canvas */}
      <main className="flex-1 flex flex-col items-center justify-start overflow-y-auto bg-slate-950/70 p-4 sm:p-8">
        
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-4" />
            <h3 className="text-white font-medium text-base mb-1">Loading Document Preview...</h3>
            <p className="text-slate-400 text-xs">Preparing view-only document render</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center max-w-md">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl mb-4 border border-red-500/20">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Unable to Load Preview</h3>
            <p className="text-slate-400 text-sm mb-6">{error}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDocument}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all"
              >
                <RefreshCw size={15} /> Try Again
              </button>
              {fileUrl && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all"
                >
                  <Download size={15} /> Download Directly
                </button>
              )}
            </div>
          </div>
        )}

        {/* View Mode: Google Docs Viewer Iframe */}
        {!loading && !error && viewMode === "gdocs" && googleDocsEmbedUrl && (
          <div className="w-full h-full flex-1 max-w-5xl rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-white">
            <iframe
              src={googleDocsEmbedUrl}
              title="Google Docs Viewer"
              className="w-full h-[85vh] border-0"
            />
          </div>
        )}

        {/* View Mode: Document Reader (Word/PDF HTML Render) */}
        {!loading && !error && viewMode === "document" && (
          <>
            {/* If docHtml is available, render formatted document */}
            {docHtml ? (
              <div className="w-full max-w-[860px] pb-12 animate-fade-in">
                {/* Paper Canvas */}
                <div 
                  id="resume-viewer-canvas"
                  className="bg-white text-gray-900 rounded-xl shadow-2xl shadow-black/60 px-8 sm:px-14 py-12 select-text"
                  style={{
                    minHeight: "1056px",
                    fontFamily: "'Calibri', Georgia, serif",
                    fontSize: "11pt",
                    lineHeight: "1.5"
                  }}
                  dangerouslySetInnerHTML={{ __html: docHtml }}
                />

                <p className="no-print text-center text-slate-500 text-xs mt-6 select-none">
                  Document View-Only Mode · Use Print button to export to PDF
                </p>
              </div>
            ) : fileExt === ".pdf" && fileUrl ? (
              /* Fallback PDF iframe */
              <div className="w-full h-[85vh] max-w-5xl rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
                <iframe
                  src={fileUrl}
                  title="PDF Viewer"
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              /* Fallback if no HTML or PDF */
              <div className="text-center py-20 text-slate-400">
                <FileText size={48} className="mx-auto mb-3 text-slate-600" />
                <p>No preview content available for this document.</p>
              </div>
            )}
          </>
        )}

      </main>

      {/* Scoped CSS for Document Typography and Print Mode */}
      <style>{`
        #resume-viewer-canvas h1 {
          font-size: 22pt;
          font-weight: 800;
          color: #1e1b4b;
          border-bottom: 2.5px solid #6366f1;
          padding-bottom: 4px;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }
        #resume-viewer-canvas h2 {
          font-size: 13pt;
          font-weight: 700;
          color: #1d4ed8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 16px 0 6px;
          border-bottom: 1px solid #dbeafe;
          padding-bottom: 2px;
        }
        #resume-viewer-canvas h3 {
          font-size: 11pt;
          font-weight: 700;
          color: #1e3a8a;
          margin: 10px 0 2px;
        }
        #resume-viewer-canvas p {
          margin: 4px 0;
          font-size: 10.5pt;
        }
        #resume-viewer-canvas ul, #resume-viewer-canvas ol {
          padding-left: 20px;
          margin: 6px 0;
        }
        #resume-viewer-canvas li {
          margin: 3px 0;
          font-size: 10.5pt;
        }
        #resume-viewer-canvas strong {
          font-weight: 700;
        }
        #resume-viewer-canvas em {
          font-style: italic;
        }
        #resume-viewer-canvas a {
          color: #4f46e5;
          text-decoration: underline;
        }
        #resume-viewer-canvas table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
        }
        #resume-viewer-canvas td, #resume-viewer-canvas th {
          border: 1px solid #e5e7eb;
          padding: 6px 10px;
          font-size: 10pt;
        }

        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            background: white !important;
          }
          #resume-viewer-canvas {
            box-shadow: none !important;
            padding: 0 !important;
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResumeViewer;
