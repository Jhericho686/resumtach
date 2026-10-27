import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, List, ListOrdered, Undo2, Redo2,
  Save, Download, Loader2, ArrowLeft, AlignLeft, AlignCenter,
  AlignRight, Type, AlertCircle, FileText, CheckCircle2, Clock,
  Upload, ExternalLink, Sparkles, Eye
} from "lucide-react";

/* Toolbar Button */
const ToolBtn = ({ onClick, title, active, children }) => (
  <button
    type="button"
    onMouseDown={(e) => { e.preventDefault(); onClick(); }}
    title={title}
    className={`p-2 rounded-lg transition-all text-sm font-medium select-none cursor-pointer ${
      active
        ? "bg-indigo-600 text-white shadow-md"
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    }`}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />;

const BASE = import.meta.env.MODE === "production"
  ? "https://resumatchvc3.onrender.com"
  : "http://localhost:5000";

const ResumeEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applicantId = searchParams.get('applicantId');
  const editorRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState("resume");
  const [canEdit, setCanEdit] = useState(false);
  const [docHtml, setDocHtml] = useState("");
  const [convertedFromPdf, setConvertedFromPdf] = useState(false);
  const [showOriginalPdf, setShowOriginalPdf] = useState(false);
  const [fileExt, setFileExt] = useState("");
  const [fileUrl, setFileUrl] = useState(null); 
  const [wordCount, setWordCount] = useState(0);

  const updateWordCount = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || "";
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    }
  }, []);

  const cleanHtml = (raw) => {
    if (!raw) return "";
    return raw
      .replaceAll(String.fromCharCode(92) + 'n', '')
      .replaceAll(String.fromCharCode(92) + 'r', '')
      .replaceAll(String.fromCharCode(92) + 't', ' ')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, '')
      .trim();
  };

  const setEditorRef = useCallback((node) => {
    editorRef.current = node;
    if (node && docHtml) {
      node.innerHTML = cleanHtml(docHtml);
      updateWordCount();
    }
  }, [docHtml, updateWordCount]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const url = applicantId ? `/resumes/edit-html?applicantId=${applicantId}` : "/resumes/edit-html";
        const meta = await api.get(url);
        if (!mounted) return;
        const { html, fileName: fn, ext, canEdit: ce, convertedFromPdf: cfp, fileUrl: fu } = meta.data;
        setFileName(fn || "resume");
        setFileExt(ext || "");
        setCanEdit(ce === true);
        setConvertedFromPdf(cfp === true);
        setDocHtml(cleanHtml(html));
        
        if (fu) {
          const fullUrl = fu.startsWith("http://") || fu.startsWith("https://")
            ? fu
            : `${BASE}/${fu.replace(/^\//, "")}`;
          setFileUrl(fullUrl);
        }
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || "Could not load resume.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    const t = setTimeout(load, 80);
    return () => { mounted = false; clearTimeout(t); };
  }, [applicantId]);

  useEffect(() => {
    if (!loading && canEdit && editorRef.current && docHtml) {
      editorRef.current.innerHTML = docHtml;
      updateWordCount();
    }
  }, [loading, canEdit, docHtml, updateWordCount]);

  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    updateWordCount();
  }, [updateWordCount]);

  const isActive = (cmd) => { try { return document.queryCommandState(cmd); } catch { return false; } };

  const handleSave = async () => {
    if (!editorRef.current || saving) return;
    setSaving(true);
    try {
      await api.post("/resumes/save-edited", { 
        html: editorRef.current.innerHTML,
        applicantId: applicantId || undefined
      });
      setSavedAt(new Date());
      toast.success("Resume saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    try {
      const res = await api.post("/resumes/save-edited", { 
        html: editorRef.current.innerHTML,
        applicantId: applicantId || undefined
      });
      setSavedAt(new Date());
      const fp = res.data?.filePath;
      if (fp) {
        window.open(`${BASE}/${fp}`, "_blank");
      }
      toast.success("Saved! Downloading DOCX…");
    } catch { toast.error("Download failed."); }
    finally { setSaving(false); }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "s") { e.preventDefault(); handleSave(); }
      if (e.key === "b") { e.preventDefault(); exec("bold"); }
      if (e.key === "i") { e.preventDefault(); exec("italic"); }
      if (e.key === "u") { e.preventDefault(); exec("underline"); }
    }
    updateWordCount();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <FileText className="absolute inset-0 m-auto text-indigo-400" size={28} />
      </div>
      <p className="mt-6 text-indigo-300 font-medium text-lg">Loading your resume…</p>
      <p className="mt-1 text-slate-400 text-sm">Preparing document view</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
      <div className="bg-slate-800/80 border border-red-500/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="text-red-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Resume Not Found</h2>
        <p className="text-slate-400 mb-8">{error}</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate("/applicant/resume/upload")}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">
            Upload Resume
          </button>
          <button onClick={() => navigate("/applicant/profile")}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors">
            Back to Profile
          </button>
        </div>
      </div>
    </div>
  );

  const isPdf = !canEdit && fileExt === ".pdf";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => applicantId ? navigate(`/admin/applicants/${applicantId}`) : navigate("/applicant/profile")}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
              title="Go Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-white font-bold text-lg leading-tight truncate">
                  {fileName.replace(/\.(docx|pdf|doc)$/i, "") || "My Resume"}
                </h1>
                {convertedFromPdf && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <Sparkles size={11} className="text-emerald-400" /> Converted to Word Format
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                {canEdit ? (
                  savedAt
                    ? <><CheckCircle2 size={11} className="text-green-400" />Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                    : <><Clock size={11} />{wordCount} words · Ctrl+S to save</>
                ) : (
                  <><ExternalLink size={11} />Viewing {(fileExt || "").toUpperCase()} document</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {fileUrl && (
              <button 
                type="button"
                onClick={() => setShowOriginalPdf(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-xs sm:text-sm font-medium transition-all"
              >
                <Eye size={15} />
                <span className="hidden sm:inline">{showOriginalPdf ? "Word Editor" : "Original PDF"}</span>
              </button>
            )}
            {canEdit && !showOriginalPdf && (
              <>
                <button onClick={handleDownload} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-all disabled:opacity-50">
                  <Download size={16} /><span className="hidden sm:inline">Download DOCX</span>
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* DOCX Formatting Toolbar */}
        {canEdit && !showOriginalPdf && (
          <div className="border-t border-white/10 bg-slate-900/60">
            <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-0.5 flex-wrap">
              <ToolBtn onClick={() => exec("undo")} title="Undo"><Undo2 size={16} /></ToolBtn>
              <ToolBtn onClick={() => exec("redo")} title="Redo"><Redo2 size={16} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => exec("formatBlock","h1")} title="Heading 1"><span className="text-xs font-extrabold">H1</span></ToolBtn>
              <ToolBtn onClick={() => exec("formatBlock","h2")} title="Heading 2"><span className="text-xs font-bold">H2</span></ToolBtn>
              <ToolBtn onClick={() => exec("formatBlock","h3")} title="Heading 3"><span className="text-xs font-semibold">H3</span></ToolBtn>
              <ToolBtn onClick={() => exec("formatBlock","p")} title="Normal"><Type size={15} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => exec("bold")} title="Bold (Ctrl+B)" active={isActive("bold")}><Bold size={16} /></ToolBtn>
              <ToolBtn onClick={() => exec("italic")} title="Italic (Ctrl+I)" active={isActive("italic")}><Italic size={16} /></ToolBtn>
              <ToolBtn onClick={() => exec("underline")} title="Underline (Ctrl+U)" active={isActive("underline")}><Underline size={16} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => exec("justifyLeft")} title="Left"><AlignLeft size={16} /></ToolBtn>
              <ToolBtn onClick={() => exec("justifyCenter")} title="Center"><AlignCenter size={16} /></ToolBtn>
              <ToolBtn onClick={() => exec("justifyRight")} title="Right"><AlignRight size={16} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => exec("insertUnorderedList")} title="Bullets"><List size={16} /></ToolBtn>
              <ToolBtn onClick={() => exec("insertOrderedList")} title="Numbers"><ListOrdered size={16} /></ToolBtn>
              <Sep />
              {[["S","2"],["M","3"],["L","5"]].map(([l,v]) => (
                <ToolBtn key={v} onClick={() => exec("fontSize",v)} title={l}>
                  <span className="text-xs font-bold w-4 text-center">{l}</span>
                </ToolBtn>
              ))}
            </div>
          </div>
        )}

        {/* PDF notice banner if not editable */}
        {isPdf && !canEdit && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <p className="text-amber-300 text-xs font-medium">
                This is a <strong>PDF</strong> document view.
              </p>
              <button onClick={() => navigate("/applicant/resume/upload")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-lg text-xs font-semibold transition-colors flex-shrink-0">
                <Upload size={13} /> Upload New Version
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Document Area */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Original PDF view if toggled OR if document is a non-editable PDF */}
        {(showOriginalPdf || (isPdf && !canEdit)) && fileUrl && (
          <iframe
            src={fileUrl}
            title="Resume Document"
            className="flex-1 w-full border-0 bg-gray-100"
            style={{ height: "calc(100vh - 120px)", minHeight: "600px" }}
          />
        )}

        {/* DOC fallback */}
        {!canEdit && !isPdf && fileUrl && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-slate-800/60 border border-slate-600 rounded-2xl p-10 max-w-md text-center">
              <FileText className="mx-auto text-indigo-400 mb-4" size={48} />
              <h2 className="text-xl font-bold text-white mb-2">Document</h2>
              <p className="text-slate-400 text-sm mb-6">
                This file format cannot be edited directly in the browser.
              </p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">
                <ExternalLink size={16} /> Open Document
              </a>
            </div>
          </div>
        )}

        {/* DOCX EDITOR — rich text editor */}
        {canEdit && !showOriginalPdf && (
          <div className="flex-1 flex justify-center px-4 py-8 overflow-y-auto">
            <div style={{ maxWidth: "860px", width: "100%" }}>
              <div
                ref={setEditorRef}
                id="resume-editor-doc"
                contentEditable
                suppressContentEditableWarning
                onInput={updateWordCount}
                onKeyDown={handleKeyDown}
                spellCheck
                className="min-h-[1056px] w-full bg-white text-gray-900 rounded-xl shadow-2xl shadow-black/60 px-14 py-12 outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all cursor-text"
                style={{ fontFamily: "'Calibri', Georgia, serif", fontSize: "11pt", lineHeight: "1.5" }}
              />
              <p className="text-center text-slate-500 text-xs mt-4 select-none">
                Click to edit · Ctrl+S to save
              </p>
            </div>
          </div>
        )}

      </main>

      <style>{`
        #resume-editor-doc h1 { font-size:22pt;font-weight:800;color:#1e1b4b;border-bottom:2.5px solid #6366f1;padding-bottom:4px;margin:0 0 6px;letter-spacing:-0.5px; }
        #resume-editor-doc h2 { font-size:13pt;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 4px;border-bottom:1px solid #dbeafe;padding-bottom:2px; }
        #resume-editor-doc h3 { font-size:11pt;font-weight:700;color:#1e3a8a;margin:10px 0 2px; }
        #resume-editor-doc p { margin:3px 0;font-size:10.5pt; }
        #resume-editor-doc ul,#resume-editor-doc ol { padding-left:18px;margin:4px 0; }
        #resume-editor-doc li { margin:2px 0;font-size:10.5pt; }
        #resume-editor-doc strong { font-weight:700; }
        #resume-editor-doc em { font-style:italic; }
        #resume-editor-doc a { color:#4f46e5; }
        #resume-editor-doc table { border-collapse:collapse;width:100%;margin:6px 0; }
        #resume-editor-doc td,#resume-editor-doc th { border:1px solid #e5e7eb;padding:5px 8px;font-size:10pt; }
      `}</style>
    </div>
  );
};

export default ResumeEditor;
