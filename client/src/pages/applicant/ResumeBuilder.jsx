import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { uploadResume } from '../../services/storage';
import { resumesService } from '../../services/firestore';
import { jsPDF } from 'jspdf';
import { 
  User, Briefcase, GraduationCap, Code, Award, 
  ChevronRight, ChevronLeft, Save, Loader2, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { capitalizeFirstLetter } from '../../utils/formatters';

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Experience', icon: Briefcase },
  { id: 3, title: 'Education', icon: GraduationCap },
  { id: 4, title: 'Skills', icon: Code },
  { id: 5, title: 'Preview & Save', icon: Award }
];

const ResumeBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    personal: {
      fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      email: user?.email || '',
      phone: user?.phone || '',
      location: user?.location || '',
      summary: user?.summary || ''
    },
    experience: [],
    education: [],
    skills: ''
  });

  // Handlers for dynamic lists
  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', startDate: '', endDate: '', description: '' }]
    }));
  };

  const updateExperience = (index, field, value) => {
    const newExp = [...formData.experience];
    newExp[index][field] = value;
    setFormData(prev => ({ ...prev, experience: newExp }));
  };

  const removeExperience = (index) => {
    const newExp = [...formData.experience];
    newExp.splice(index, 1);
    setFormData(prev => ({ ...prev, experience: newExp }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', school: '', year: '' }]
    }));
  };

  const updateEducation = (index, field, value) => {
    const newEdu = [...formData.education];
    newEdu[index][field] = value;
    setFormData(prev => ({ ...prev, education: newEdu }));
  };

  const removeEducation = (index) => {
    const newEdu = [...formData.education];
    newEdu.splice(index, 1);
    setFormData(prev => ({ ...prev, education: newEdu }));
  };

  // PDF Generation & Upload
  const handleGenerateAndSave = async () => {
    setIsGenerating(true);
    
    try {
      // 1. Generate PDF using jsPDF
      const doc = new jsPDF();
      let y = 20;
      
      // Styling helpers
      const addTitle = (text) => {
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(text, 20, y);
        y += 10;
      };
      
      const addSectionHeader = (text) => {
        y += 5;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175); // Primary color
        doc.text(text, 20, y);
        doc.setLineWidth(0.5);
        doc.line(20, y + 2, 190, y + 2);
        doc.setTextColor(0, 0, 0);
        y += 10;
      };

      const addText = (text, size = 10, isBold = false, x = 20) => {
        if (!text) return;
        doc.setFontSize(size);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        // Handle long text wrapping
        const splitText = doc.splitTextToSize(text, 170 - (x - 20));
        doc.text(splitText, x, y);
        y += (splitText.length * 5) + 2;
        
        // Check page break
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      };

      // Header
      addTitle(formData.personal.fullName);
      addText(`${formData.personal.email} | ${formData.personal.phone} | ${formData.personal.location}`);
      y += 5;

      // Summary
      if (formData.personal.summary) {
        addSectionHeader('Professional Summary');
        addText(formData.personal.summary);
      }

      // Experience
      if (formData.experience.length > 0) {
        addSectionHeader('Experience');
        formData.experience.forEach(exp => {
          if (exp.title || exp.company) {
            addText(`${exp.title} at ${exp.company}`, 12, true);
            addText(`${exp.startDate} - ${exp.endDate}`, 10, false, 20);
            if (exp.description) {
               y += 2;
               addText(exp.description, 10, false, 25);
            }
            y += 4;
          }
        });
      }

      // Education
      if (formData.education.length > 0) {
        addSectionHeader('Education');
        formData.education.forEach(edu => {
          if (edu.degree || edu.school) {
            addText(edu.degree, 12, true);
            addText(`${edu.school} | ${edu.year}`);
            y += 4;
          }
        });
      }

      // Skills
      if (formData.skills) {
        addSectionHeader('Skills');
        addText(formData.skills);
      }

      // 2. Convert to Blob
      const pdfBlob = doc.output('blob');
      
      // 3. Create File object
      const fileName = `${formData.personal.fullName.replace(/\s+/g, '_')}_Resume.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      
      // 4. Upload & register resume in database
      await uploadResume(file, user.uid);

      setSuccess(true);
      toast.success('Resume created and saved successfully!');
      
      setTimeout(() => {
        navigate('/applicant/profile');
      }, 2000);

    } catch (error) {
      console.error('Error generating resume:', error);
      toast.error('Failed to generate or upload resume.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Renderers for different steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.personal.fullName}
                  onChange={e => setFormData(p => ({ ...p, personal: { ...p.personal, fullName: capitalizeFirstLetter(e.target.value) } }))}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                  type="email" 
                  value={formData.personal.email}
                  onChange={e => setFormData(p => ({ ...p, personal: { ...p.personal, email: e.target.value } }))}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                <input 
                  type="tel" 
                  value={formData.personal.phone}
                  onChange={e => setFormData(p => ({ ...p, personal: { ...p.personal, phone: e.target.value } }))}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input 
                  type="text" 
                  value={formData.personal.location}
                  onChange={e => setFormData(p => ({ ...p, personal: { ...p.personal, location: e.target.value } }))}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Professional Summary</label>
                <textarea 
                  rows={4}
                  value={formData.personal.summary}
                  onChange={e => setFormData(p => ({ ...p, personal: { ...p.personal, summary: e.target.value } }))}
                  className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="A brief summary of your career objectives..."
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Work Experience</h3>
              <button 
                onClick={addExperience}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add Experience
              </button>
            </div>
            
            {formData.experience.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No experience added yet. Click "+ Add Experience".</p>
            ) : (
              formData.experience.map((exp, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl relative border border-gray-200 dark:border-gray-700">
                  <button onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm">Remove</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-16">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                      <input type="text" value={exp.title} onChange={e => updateExperience(idx, 'title', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                      <input type="text" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                      <input 
                        type="month" 
                        value={exp.startDateRaw || ''} 
                        onChange={e => {
                          const raw = e.target.value;
                          const [y, m] = raw ? raw.split('-') : ['', ''];
                          const formatted = raw ? `${m}/${y}` : '';
                          updateExperience(idx, 'startDateRaw', raw);
                          updateExperience(idx, 'startDate', formatted);
                        }} 
                        className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">End Date</label>
                        <label className="flex items-center gap-1 cursor-pointer text-xs text-primary-600 dark:text-primary-400 font-medium">
                          <input 
                            type="checkbox"
                            checked={exp.isCurrentlyWorking || exp.endDate === 'Present'}
                            onChange={e => {
                              const checked = e.target.checked;
                              updateExperience(idx, 'isCurrentlyWorking', checked);
                              updateExperience(idx, 'endDate', checked ? 'Present' : '');
                            }}
                            className="rounded text-primary-600 focus:ring-primary-500"
                          />
                          Present
                        </label>
                      </div>
                      {exp.isCurrentlyWorking || exp.endDate === 'Present' ? (
                        <input 
                          type="text" 
                          disabled 
                          value="Present" 
                          className="w-full px-3 py-1.5 text-sm border rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed" 
                        />
                      ) : (
                        <input 
                          type="month" 
                          value={exp.endDateRaw || ''} 
                          onChange={e => {
                            const raw = e.target.value;
                            const [y, m] = raw ? raw.split('-') : ['', ''];
                            const formatted = raw ? `${m}/${y}` : '';
                            updateExperience(idx, 'endDateRaw', raw);
                            updateExperience(idx, 'endDate', formatted);
                          }} 
                          className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        />
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Bullet points recommended)</label>
                      <textarea rows={3} value={exp.description} onChange={e => updateExperience(idx, 'description', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Education</h3>
              <button onClick={addEducation} className="text-sm text-primary-600 font-medium">+ Add Education</button>
            </div>
            
            {formData.education.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No education added yet.</p>
            ) : (
              formData.education.map((edu, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl relative border border-gray-200 dark:border-gray-700">
                  <button onClick={() => removeEducation(idx)} className="absolute top-4 right-4 text-red-500 text-sm">Remove</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-16">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Degree / Certificate</label>
                      <input type="text" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">School / Institution</label>
                      <input type="text" value={edu.school} onChange={e => updateEducation(idx, 'school', e.target.value)} className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Graduation Year</label>
                      <select 
                        value={edu.year} 
                        onChange={e => updateEducation(idx, 'year', e.target.value)} 
                        className="w-full px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select Year</option>
                        {Array.from({ length: 55 }, (_, i) => 2030 - i).map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Skills</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key Skills (comma separated)</label>
              <textarea 
                rows={5}
                value={formData.skills}
                onChange={e => setFormData(p => ({ ...p, skills: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="JavaScript, React, Node.js, Project Management..."
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in text-center py-8">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to generate your resume!</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              We will compile your information into a professional PDF and save it to your profile.
            </p>
          </div>
        );
      default: return null;
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Resume Generated!</h2>
        <p className="text-gray-500 mb-8">Redirecting to your profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resume Builder</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Create an ATS-friendly resume in minutes.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Progress Tracker */}
        <div className="flex justify-between border-b border-gray-100 dark:border-gray-700">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div 
                key={step.id} 
                className={`flex-1 py-4 text-center border-b-2 transition-colors ${
                  isActive ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 
                  isCompleted ? 'border-green-500 bg-gray-50 dark:bg-gray-800' : 'border-transparent'
                }`}
              >
                <div className={`mx-auto flex justify-center mb-1 ${
                  isActive ? 'text-primary-600' : isCompleted ? 'text-green-500' : 'text-gray-400'
                }`}>
                  <Icon size={20} />
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                   isActive ? 'text-primary-700 dark:text-primary-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <div className="p-8 min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between">
          <button
            onClick={() => setCurrentStep(p => Math.max(1, p - 1))}
            disabled={currentStep === 1 || isGenerating}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(p => Math.min(5, p + 1))}
              className="px-6 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleGenerateAndSave}
              disabled={isGenerating}
              className="px-8 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm flex items-center gap-2 transition-all hover:shadow-lg disabled:opacity-50"
            >
              {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Save size={16} /> Generate PDF & Save</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
