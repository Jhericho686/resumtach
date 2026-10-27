import React, { useState, useEffect, useRef } from 'react';
import { Check, Loader2, ShieldCheck, RefreshCw, X, Puzzle } from 'lucide-react';

const CaptchaWidget = ({ onVerify, isVerified = false, error = '' }) => {
  const [checked, setChecked] = useState(isVerified);
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [targetX, setTargetX] = useState(140);
  const [sliderX, setSliderX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [puzzleError, setPuzzleError] = useState(false);
  const [puzzleSuccess, setPuzzleSuccess] = useState(false);
  
  const containerRef = useRef(null);

  // Generate random target puzzle slot position whenever puzzle opens or resets
  const resetPuzzlePosition = () => {
    // Range between 90px and 220px inside a 280px wide container
    const randomPos = Math.floor(Math.random() * 130) + 90;
    setTargetX(randomPos);
    setSliderX(0);
    setPuzzleError(false);
    setPuzzleSuccess(false);
  };

  const handleStartVerification = () => {
    if (checked) return;
    resetPuzzlePosition();
    setShowPuzzle(true);
  };

  const handleSliderChange = (e) => {
    setSliderX(Number(e.target.value));
  };

  const handleCheckPuzzle = () => {
    const diff = Math.abs(sliderX - targetX);
    if (diff <= 8) {
      // Success snap!
      setPuzzleSuccess(true);
      setPuzzleError(false);
      setTimeout(() => {
        setShowPuzzle(false);
        setChecked(true);
        if (onVerify) onVerify(true);
      }, 700);
    } else {
      // Failed attempt
      setPuzzleError(true);
      setTimeout(() => {
        resetPuzzlePosition();
      }, 900);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* CAPTCHA Card Trigger */}
      <div 
        onClick={handleStartVerification}
        className={`w-full max-w-[330px] bg-white dark:bg-gray-800 border-2 rounded-xl p-3.5 flex items-center justify-between shadow-sm cursor-pointer select-none transition-all ${
          error && !checked 
            ? 'border-red-400 dark:border-red-500 ring-2 ring-red-400/20' 
            : checked 
              ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Human verification puzzle"
            onClick={(e) => {
              e.stopPropagation();
              handleStartVerification();
            }}
            disabled={checked}
            className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              checked 
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm scale-105' 
                : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 hover:border-blue-500'
            }`}
          >
            {checked ? (
              <Check size={18} strokeWidth={3} className="animate-in zoom-in-75 duration-200" />
            ) : (
              <Puzzle size={14} className="text-gray-400 dark:text-gray-400" />
            )}
          </button>

          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
            {checked ? "Verified Human" : "Solve Puzzle Verification"}
          </span>
        </div>

        {/* Brand Badge */}
        <div className="flex flex-col items-center justify-center pl-3 border-l border-gray-200 dark:border-gray-700">
          <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-0.5" />
          <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 leading-tight">
            reCAPTCHA
          </span>
        </div>
      </div>

      {error && !checked && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center mt-1.5 font-medium">
          {error}
        </p>
      )}

      {/* PUZZLE SLIDER MODAL */}
      {showPuzzle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-[320px] p-5 relative overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Security Puzzle Check
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPuzzle(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Drag the slider to fit the puzzle piece into place.
            </p>

            {/* PUZZLE CANVAS CANVAS CONTAINER */}
            <div className="relative w-full h-[150px] rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 select-none">
              
              {/* Background Geometric Pattern */}
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="absolute top-4 left-4 text-white text-[11px] font-bold tracking-wider opacity-80 uppercase">
                ResuMatch Guard
              </div>

              {/* TARGET CUTOUT SLOT */}
              <div 
                style={{ left: `${targetX}px` }}
                className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-black/50 border-2 border-dashed border-white/80 shadow-inner flex items-center justify-center transition-transform"
              >
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>

              {/* SLIDING PUZZLE PIECE */}
              <div 
                style={{ left: `${sliderX}px` }}
                className={`absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-white/90 dark:bg-gray-900/90 border-2 shadow-xl flex items-center justify-center transition-all ${
                  puzzleSuccess 
                    ? 'border-emerald-500 bg-emerald-500 text-white scale-110 shadow-emerald-500/50' 
                    : puzzleError
                      ? 'border-red-500 bg-red-500 text-white animate-shake'
                      : 'border-primary-500 text-primary-600 dark:text-primary-400'
                }`}
              >
                {puzzleSuccess ? (
                  <Check size={22} strokeWidth={3} />
                ) : puzzleError ? (
                  <X size={20} strokeWidth={3} />
                ) : (
                  <Puzzle size={20} />
                )}
              </div>

              {/* Status overlay */}
              {puzzleSuccess && (
                <div className="absolute inset-0 bg-emerald-600/85 backdrop-blur-xs flex flex-col items-center justify-center text-white font-bold text-sm animate-in zoom-in-75">
                  <Check size={36} strokeWidth={3} className="mb-1" />
                  <span>Verification Complete!</span>
                </div>
              )}
            </div>

            {/* SLIDER CONTROL */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                <span>Slide to match</span>
                <button
                  type="button"
                  onClick={resetPuzzlePosition}
                  className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                >
                  <RefreshCw size={12} /> Reset
                </button>
              </div>

              <input
                type="range"
                min="0"
                max="240"
                value={sliderX}
                disabled={puzzleSuccess}
                onChange={handleSliderChange}
                onMouseUp={handleCheckPuzzle}
                onTouchEnd={handleCheckPuzzle}
                className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600 focus:outline-none"
              />
            </div>

            {puzzleError && (
              <p className="text-xs text-red-500 font-medium text-center mt-2 animate-bounce">
                Puzzle misplaced! Try again.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptchaWidget;
