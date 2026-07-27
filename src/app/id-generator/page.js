"use client";
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase'; 

export default function IDGenerator() {
  const [hasMounted, setHasMounted] = useState(false);
  
  // এডমিন এক্সেস স্টেট (ডাটাবেজ ও ব্রাউজার মেমোরি ভিত্তিক)
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminUserId, setAdminUserId] = useState(''); 

  const classOptions = ["Intermediate", "Honours", "Degree"];
  const departmentOptions = [
    "Arts", "Science", "Business Studies", "BMT (Digital)", 
    "BMT (HRM)", "Sociology", "Bangla", "Political Science", 
    "Management", "Islamic History & Culture",
    "B.A", "B.S.S", "B.B.S", "B.Sc"
  ];
  const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    student_name: '', class_roll: '', class_name: '', department: '', session: '', 
    mobile: '', blood_group: '', photo: '', photo_x: 0, photo_y: 0, principal_signature: '',
    print_count: 0 
  });
  
  const [editingId, setEditingId] = useState(null); 
  const [searchRoll, setSearchRoll] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [searchSession, setSearchSession] = useState('');
  
  const [collegeName, setCollegeName] = useState('BIRGANJ GOVT. DEGREE COLLEGE');
  const [collegeAddr, setCollegeAddr] = useState('Birganj, Dinajpur');
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // প্রিন্ট তালিকা
  const [printQueue, setPrintQueue] = useState([]);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setHasMounted(true);
    checkSavedAdminSession();
  }, []);

  // ব্রাউজার মেমোরিতে আগে থেকে লগইন করা আছে কিনা চেক করা (যাতে বারবার লগইন করতে না হয়)
  const checkSavedAdminSession = () => {
    const savedAdmin = localStorage.getItem('id_generator_admin');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
      fetchStudents();
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('id_cards').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { 
        setFormData({ ...formData, [field]: reader.result }); 
        showToast(`${field === 'photo' ? 'Photo' : 'Sig'} Uploaded!`, "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Atomic Dynamic Name Logic ---
  const getNameStyles = (name) => {
    if (!name) return { className: "text-[10.5pt]", style: {} };
    const len = name.length;
    
    if (len <= 15) return { className: "text-[10.5pt] tracking-normal", style: {} };
    if (len <= 21) return { className: "text-[9.8pt] tracking-tighter leading-none", style: {} };
    
    if (len <= 26) return { 
        className: "text-[8.5pt] tracking-tighter", 
        style: { transform: 'scaleX(0.90)', transformOrigin: 'center' } 
    };
    
    if (len <= 32) return { 
        className: "text-[7.5pt] tracking-tighter font-black", 
        style: { transform: 'scaleX(0.75)', transformOrigin: 'center' } 
    };
    
    return { 
        className: "text-[6.5pt] tracking-tighter font-black leading-none", 
        style: { transform: 'scaleX(0.70)', transformOrigin: 'center' } 
    };
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - formData.photo_x, y: e.clientY - formData.photo_y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setFormData(prev => ({ ...prev, photo_x: newX, photo_y: newY }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        let error;
        if (editingId) {
            const res = await supabase.from('id_cards').update(formData).eq('id', editingId);
            error = res.error;
        } else {
            const res = await supabase.from('id_cards').insert([formData]);
            error = res.error;
        }
        if (error) showToast(error.message, "error");
        else {
            showToast(editingId ? "Record Updated!" : "Registration Successful! Thank you.", "success");
            setFormData({ student_name: '', class_roll: '', class_name: '', department: '', session: '', mobile: '', blood_group: '', photo: '', photo_x: 0, photo_y: 0, principal_signature: '', print_count: 0 });
            setEditingId(null); fetchStudents(); setFilteredStudents([]);
        }
    } catch (err) { showToast(err.message, "error"); }
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setFormData({ ...student });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Editing mode", "warning");
  };

  const handleSearch = () => {
    const result = students.filter(s => 
      s.class_roll?.toString().trim() === searchRoll.trim() && 
      s.class_name === searchClass &&
      s.session?.toLowerCase().includes(searchSession.toLowerCase().trim())
    );
    setFilteredStudents(result);
    if (result.length === 0) showToast("Not found!", "error");
  };

  const confirmDelete = async () => {
    const { error } = await supabase.from('id_cards').delete().eq('id', studentToDelete.id);
    if (!error) { 
        setFilteredStudents(prev => prev.filter(s => s.id !== studentToDelete.id)); 
        fetchStudents(); setIsModalOpen(false); showToast("Deleted!", "success");
        setPrintQueue(prev => prev.filter(s => s.id !== studentToDelete.id));
    }
  };

  const handleAddToQueue = (student) => {
    if (printQueue.some(s => s.id === student.id)) {
      showToast("Student already in print list", "warning");
      return;
    }
    setPrintQueue(prev => [...prev, student]);
    showToast("Added to print list!", "success");
  };

  const handleRemoveFromQueue = (id) => {
    setPrintQueue(prev => prev.filter(s => s.id !== id));
    showToast("Removed from list", "warning");
  };

  // প্রিন্ট রেকর্ড ডাটাবেজে সেভ করে প্রিন্টার ওপেন করার ফাংশন
  const handlePrintAndRecord = async () => {
    try {
      showToast("Recording prints in database...", "warning");
      
      const updatePromises = printQueue.map(student => {
        const currentCount = student.print_count || 0;
        return supabase
          .from('id_cards')
          .update({ print_count: currentCount + 1 })
          .eq('id', student.id);
      });

      await Promise.all(updatePromises);
      await fetchStudents();
      setFilteredStudents([]); // প্রিভিউ রিসেট করা
      
      showToast("Print records updated successfully!", "success");
      
      setTimeout(() => {
        window.print();
        setPrintQueue([]); // প্রিন্ট কিউ খালি করা
      }, 500);

    } catch (err) {
      showToast("Database update failed: " + err.message, "error");
    }
  };

  // ডাটাবেজ টেবিল থেকে ইউজার আইডি ভেরিফাই করে লগইন করার ফাংশন
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      showToast("Verifying Admin ID...", "warning");
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .eq('admin_id', adminUserId);

      if (error) {
        showToast(error.message, "error");
      } else if (data && data.length > 0) {
        setIsAdmin(true);
        localStorage.setItem('id_generator_admin', 'true');
        setShowLoginModal(false);
        setAdminUserId('');
        fetchStudents();
        showToast("Admin access unlocked!", "success");
      } else {
        showToast("Invalid Admin User ID!", "error");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // এডমিন লগআউট হ্যান্ডলার
  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('id_generator_admin');
    setFilteredStudents([]);
    setPrintQueue([]);
    showToast("Logged out from admin panel", "info");
  };

  const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  if (!hasMounted) return null;

  const printBatches = chunkArray(printQueue, 9);

  // কমন ইনপুট স্টাইল - স্পষ্ট প্লেসহোল্ডার ও মোবাইল ফ্রেন্ডলি টচ রেসপন্স
  const inputStyle = "w-full border border-slate-300 p-3 rounded-xl text-base sm:text-sm text-slate-900 font-medium placeholder:text-slate-600 placeholder:opacity-100 placeholder:font-normal focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 outline-none bg-white transition-all";

  return (
    <div className="p-3 sm:p-4 bg-slate-100 min-h-screen font-sans flex flex-col justify-between">
      
      {/* --- সাধারণ ব্রাউজার ভিউ --- */}
      <div className="print:hidden w-full flex-grow">
        
        {toast.show && (
          <div className={`fixed top-4 left-4 right-4 sm:left-auto sm:right-5 z-[200] p-4 rounded-xl shadow-2xl transition-all text-center sm:text-left` +
            ` ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-amber-500'} text-white`}>
            <p className="font-bold text-xs uppercase tracking-wider">{toast.message}</p>
          </div>
        )}

        {/* এডমিন মোডে থাকলে রিমাইন্ডার এবং লগআউট বাটন প্রদর্শন */}
        {isAdmin && (
          <div className="max-w-xl mx-auto mb-4 bg-indigo-950 text-white p-3 rounded-xl flex justify-between items-center shadow-lg">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">🔒 Database Secured Admin Panel</span>
            <button onClick={handleAdminLogout} className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-black uppercase transition-colors cursor-pointer active:scale-95">Logout</button>
          </div>
        )}

        <div className="max-w-xl mx-auto mb-8 space-y-6">
          
          {/* Student Entry Form */}
          <div className={`bg-white p-4 sm:p-6 rounded-2xl shadow-xl border-t-8 ${editingId ? 'border-yellow-500' : 'border-indigo-800'}`}>
            <h2 className="text-lg sm:text-xl font-black mb-6 text-center uppercase tracking-tighter text-slate-800">Student Registration Form</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
              
              {isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-dashed border-indigo-200 animate-in slide-in-from-top-4">
                    <input className={inputStyle} placeholder="COLLEGE NAME" value={collegeName} onChange={e => setCollegeName(e.target.value)} />
                    <input className={inputStyle} placeholder="Address" value={collegeAddr} onChange={e => setCollegeAddr(e.target.value)} />
                </div>
              )}
              
              {/* ফটো ও সিগনেচার আপলোড */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 transition-colors p-4 rounded-xl border-2 border-dotted border-indigo-300 flex flex-col items-center justify-center text-center h-24">
                      <span className="text-xs font-extrabold uppercase text-indigo-900 tracking-wider">Upload Student Photo</span>
                      <span className="text-[10px] text-indigo-600 font-bold mt-1">Select Image File</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'photo')} className="hidden" required={!editingId} />
                  </label>
                  
                  {isAdmin ? (
                    <label className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 transition-colors p-4 rounded-xl border-2 border-dotted border-indigo-300 flex flex-col items-center justify-center text-center h-24 animate-in fade-in">
                        <span className="text-xs font-extrabold uppercase text-indigo-900 tracking-wider">Principal Sig.</span>
                        <span className="text-[10px] text-indigo-600 font-bold mt-1">Select Signature File</span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'principal_signature')} className="hidden" />
                    </label>
                  ) : (
                    <div className="hidden sm:flex bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 flex-col items-center justify-center text-center h-24 text-slate-400">
                      <span className="text-xs font-bold uppercase">Authorized Use Only</span>
                      <span className="text-[10px] mt-1">College logo & signatures will be generated automatically.</span>
                    </div>
                  )}
              </div>
              
              <input className={inputStyle} placeholder="Full Student Name" value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} required />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className={inputStyle} placeholder="Roll No" value={formData.class_roll} onChange={e => setFormData({...formData, class_roll: e.target.value})} required />
                <select className={inputStyle} value={formData.class_name} onChange={e => setFormData({...formData, class_name: e.target.value})} required>
                  <option value="" className="text-slate-500">Select Class</option>
                  {classOptions.map(opt => <option key={opt} value={opt} className="text-slate-900">{opt}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className={inputStyle} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} required>
                  <option value="" className="text-slate-500">Select Department/Group/Course</option>
                  {departmentOptions.map(opt => <option key={opt} value={opt} className="text-slate-900">{opt}</option>)}
                </select>
                <input className={inputStyle} placeholder="Session" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})} required />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <input className={inputStyle} placeholder="Mobile No" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} required />
                 <select className={inputStyle} value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})} required>
                   <option value="" className="text-slate-500">Select Blood Group</option>
                   {bloodGroups.map(bg => <option key={bg} value={bg} className="text-slate-900">{bg}</option>)}
                 </select>
              </div>
              <button type="submit" className="p-3.5 mt-2 rounded-xl font-black uppercase text-white shadow-lg transition-all bg-indigo-700 hover:bg-indigo-800 active:scale-[0.99] cursor-pointer text-sm tracking-wider">
                  Submit Information
              </button>
            </form>
          </div>

          {/* --- সার্চ এবং প্রিন্ট কিউ উইজেট --- */}
          {isAdmin && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Search Student */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border-t-8 border-emerald-600">
                  <h2 className="text-lg sm:text-xl font-black mb-6 text-center uppercase text-emerald-800 tracking-tighter">🔍 Search Student</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input className={inputStyle} placeholder="Roll" value={searchRoll} onChange={e => setSearchRoll(e.target.value)} />
                      <select className={inputStyle} value={searchClass} onChange={e => setSearchClass(e.target.value)}>
                          <option value="" className="text-slate-500">Class</option>
                          {classOptions.map(opt => <option key={opt} value={opt} className="text-slate-900">{opt}</option>)}
                      </select>
                      <input className={inputStyle} placeholder="Session" value={searchSession} onChange={e => setSearchSession(e.target.value)} />
                  </div>
                  <button onClick={handleSearch} className="w-full mt-4 p-3.5 rounded-xl font-black uppercase text-white bg-emerald-600 active:scale-[0.99] shadow-lg cursor-pointer text-sm">Search Student</button>
              </div>

              {/* Print List Widget */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border-t-8 border-rose-500">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4">
                    <h2 className="text-base sm:text-lg font-black uppercase text-rose-800 tracking-tighter">📋 Print List ({printQueue.length})</h2>
                    {printQueue.length > 0 && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => setPrintQueue([])} className="flex-1 sm:flex-none bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer">Clear</button>
                        <button onClick={handlePrintAndRecord} className="flex-1 sm:flex-none bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase shadow-md animate-pulse cursor-pointer">Print {printQueue.length} Cards</button>
                      </div>
                    )}
                  </div>
                  
                  {printQueue.length === 0 ? (
                    <p className="text-slate-400 text-xs italic text-center py-4 uppercase font-bold">List is empty. Add students below to print.</p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto border rounded-xl divide-y text-xs">
                      {printQueue.map((student, idx) => (
                        <div key={student.id} className="flex justify-between items-center p-2.5 hover:bg-slate-50">
                          <div>
                            <span className="font-bold text-slate-800">{idx+1}. {student.student_name}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({student.class_name} - Roll: {student.class_roll})</span>
                          </div>
                          <button onClick={() => handleRemoveFromQueue(student.id)} className="text-red-500 font-bold hover:underline uppercase text-[10px] cursor-pointer">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {printQueue.length > 0 && (
                    <p className="text-[10px] text-slate-400 mt-2 font-semibold italic text-right">💡 Press Ctrl + P on your keyboard to Print.</p>
                  )}
              </div>

            </div>
          )}

        </div>

        {/* --- লাইভ আইডি কার্ড প্রিভিউ এরিয়া --- */}
        {isAdmin && filteredStudents.length > 0 && (
          <div className="max-w-2xl mx-auto mb-20 bg-white p-4 sm:p-6 rounded-3xl shadow-xl border-2 border-indigo-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setFilteredStudents([])} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-black text-lg p-2 transition-colors cursor-pointer z-30"
              title="Close Preview"
            >
              ✕
            </button>

            <h3 className="text-base sm:text-lg font-black text-center text-indigo-900 uppercase tracking-tighter mb-6 border-b pb-2">👁️ Live ID Card Preview</h3>
            
            <div className="flex flex-col gap-10 items-center">
              {filteredStudents.map((student) => {
                const nameStyle = getNameStyles(student.student_name);
                return (
                  <div key={`preview-${student.id}`} className="flex flex-col items-center border-b last:border-0 pb-8 last:pb-0 w-full overflow-hidden">
                    
                    {student.print_count > 0 ? (
                      <div className="w-full bg-red-100 text-red-800 border border-red-300 rounded-xl px-4 py-3 text-xs font-black text-center uppercase mb-6 animate-pulse">
                        ⚠️ Re-issue Card (Collect 100 TK Fee) | Printed: {student.print_count} times
                      </div>
                    ) : (
                      <div className="w-full bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl px-4 py-3 text-xs font-black text-center uppercase mb-6">
                        🆕 First Time Print (No Fee)
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-6 justify-center items-center w-full overflow-x-auto py-2">
                      
                      {/* প্রিভিউ ফ্রন্ট সাইড */}
                      <div className="id-card portrait relative overflow-hidden bg-white border border-slate-300 shadow-md flex-shrink-0 scale-95 xs:scale-100">
                        <div className="relative z-20 bg-indigo-800 text-white text-center h-[52pt] flex flex-col items-center justify-start pt-1.5 px-1">
                          <img src="/logo.png" alt="L" className="h-[34px] w-auto object-contain mb-0.5" />
                          <h2 className="font-black text-[9.8pt] uppercase tracking-tighter leading-none">{collegeName}</h2>
                          <p className="text-[5.5pt] font-black tracking-[0.22em] uppercase leading-none mt-1">{collegeAddr}</p>
                        </div>
                        <div className="relative z-10 flex flex-col items-center h-[186pt] py-2 px-3">
                           <div className="relative w-full flex justify-center items-center h-[88px] mb-0.5">
                              <div className="absolute left-[2pt] top-1/2 -translate-y-1/2 font-black text-indigo-950 text-[6.5pt] uppercase [writing-mode:vertical-lr] rotate-180 tracking-[0.25em] whitespace-nowrap opacity-95">
                                STUDENT ID
                              </div>
                              <div className="relative z-20 w-[74px] h-[88px] bg-white border border-indigo-800 rounded overflow-hidden flex items-center justify-center cursor-move shadow-sm"
                                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                              >
                                 <img src={student.id === editingId ? formData.photo : student.photo} 
                                   style={{ transform: `translate(${student.id === editingId ? formData.photo_x : (student.photo_x || 0)}px, ${student.id === editingId ? formData.photo_y : (student.photo_y || 0)}px)`, width: '100%', height: 'auto', minHeight: '100%', position: 'absolute' }} draggable="false" />
                              </div>
                           </div>
                           <div className="relative z-20 w-full border-b border-indigo-600 mb-0.5 mt-1 flex items-center justify-center min-h-[14pt]">
                              <h3 className={`font-black text-indigo-900 uppercase text-center w-full whitespace-nowrap overflow-visible ${nameStyle.className}`} style={nameStyle.style}>
                                {student.student_name}
                              </h3>
                           </div>
                           <div className="relative z-20 data-grid text-[8.2pt] font-bold text-slate-800 w-full pt-1">
                              <span>Roll</span> <span>:</span> <span className="text-black font-medium">{student.class_roll}</span>
                              <span>Class</span> <span>:</span> <span className="text-black font-medium">{student.class_name}</span>
                              <span className="flex items-start">
                                {student.class_name === 'Intermediate' ? 'Group' : student.class_name === 'Degree' ? 'Course' : 'Dept.'}
                              </span> 
                              <span>:</span> 
                              <span className="text-black font-medium text-[7.8pt] tracking-tighter leading-[1.2]">{student.department}</span>
                              <span>Session</span> <span>:</span> <span className="text-black font-medium">{student.session}</span>
                              <span>Mobile</span> <span>:</span> <span className="text-black font-medium">{student.mobile}</span>
                              <span>Blood</span> <span>:</span> <span className="text-red-700 font-extrabold">{student.blood_group}</span>
                           </div>
                        </div>
                        <div className="absolute bottom-0 w-full h-[10pt] bg-gradient-to-r from-green-800 via-emerald-500 to-green-900 border-t border-yellow-400"></div>
                      </div>

                      {/* প্রিভিউ ব্যাক সাইড */}
                      <div className="id-card portrait relative overflow-hidden bg-white border border-slate-300 shadow-md flex-shrink-0 scale-95 xs:scale-100">
                         <div className="relative z-10 bg-indigo-800 h-[30pt] flex items-center justify-center text-white font-bold text-[7.5pt] uppercase italic tracking-widest">General Instructions</div>
                         <div className="relative z-10 p-4 h-[208pt] flex flex-col justify-between items-center text-center">
                            <div className="w-full">
                              <h4 className="font-bold border-b border-indigo-200 pb-1 mb-3 text-[8.5pt] text-indigo-800 uppercase tracking-tighter">Rules & Regulations</h4>
                              <ul className="text-[7.2pt] font-bold text-slate-700 space-y-2 list-none text-left">
                                <li>• Please carry this card during college hours.</li>
                                <li>• If found anywhere, please return to office.</li>
                                <li>• It is a non-transferable identity document.</li>
                                <li className="text-red-600 uppercase font-black italic border-t border-red-100 pt-1 text-[6.2pt] whitespace-nowrap overflow-hidden leading-none">
                                    • Validity expires with the session.
                                </li>
                              </ul>
                            </div>
                            <div className="text-center w-full mb-6 relative flex flex-col items-center">
                               {(student.principal_signature || (student.id === editingId && formData.principal_signature)) && (
                                 <img src={student.id === editingId ? formData.principal_signature : student.principal_signature} className="h-8 w-auto mb-[-3px] relative z-10 mix-blend-multiply" alt="Sig" />
                               )}
                               <div className="w-16 border-t border-slate-800 mx-auto"></div>
                               <p className="text-[6.5pt] font-medium mt-0.5 uppercase italic tracking-tighter">Principal Signature</p>
                            </div>
                         </div>
                         <div className="absolute bottom-0 w-full bg-indigo-800 text-white text-[5.2pt] text-center py-2 font-bold tracking-widest lowercase">www.birganjgovtcollege.edu.bd</div>
                      </div>

                    </div>

                    {/* প্রিভিউ এর একশন বাটনসমূহ */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center w-full sm:w-auto">
                      <button onClick={() => handleAddToQueue(student)} className="flex-1 sm:flex-none bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase shadow-md transition-colors cursor-pointer active:scale-95">Add to Print List</button>
                      <button onClick={() => handleEdit(student)} className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2.5 rounded-full font-bold text-xs uppercase shadow-md transition-colors cursor-pointer active:scale-95">Edit</button>
                      <button onClick={() => { setStudentToDelete(student); setIsModalOpen(true); }} className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase shadow-md transition-colors cursor-pointer active:scale-95">Delete</button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* --- ২য় অংশ: প্রিন্ট-অনলি ৩x৩ গ্রিড এরিয়া --- */}
      {isAdmin && (
        <div className="hidden print:block">
          {printBatches.map((batch, batchIdx) => {
            
            const paddedBatch = [...batch];
            while (paddedBatch.length < 9) {
              paddedBatch.push(null);
            }

            // সাধারণ গ্রিড অর্ডার (১ থেকে ৯ পরপর)
            const frontIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            
            // পাতা উল্টে (Flip Horizontal/Long-Edge) প্রিন্ট করার জন্য সঠিক ব্যাক-অর্ডার
            const backIndices = [2, 1, 0, 5, 4, 3, 8, 7, 6];

            const frontBatchOrdered = frontIndices.map(idx => paddedBatch[idx]);
            const backBatchOrdered = backIndices.map(idx => paddedBatch[idx]);

            return (
              <div key={batchIdx} className="batch-container">
                
                {/* ফ্রন্ট সাইড পেজ */}
                <div className="print-page">
                  {frontBatchOrdered.map((student, idx) => {
                    if (!student) return <div key={`empty-front-${idx}`} className="empty-card-spacer"></div>;
                    const nameStyle = getNameStyles(student.student_name);
                    
                    return (
                      <div key={`front-${student.id}`} className="id-card portrait relative overflow-hidden bg-white border border-slate-400">
                        <div className="relative z-20 bg-indigo-800 text-white text-center h-[52pt] flex flex-col items-center justify-start pt-1.5 shadow-md px-1">
                          <img src="/logo.png" alt="L" className="h-[34px] w-auto object-contain mb-0.5" />
                          <h2 className="font-black text-[9.8pt] uppercase tracking-tighter leading-none">{collegeName}</h2>
                          <p className="text-[5.5pt] font-black tracking-[0.22em] uppercase leading-none mt-1">{collegeAddr}</p>
                        </div>

                        <div className="relative z-10 flex flex-col items-center h-[186pt] py-2 px-3">
                           <div className="relative w-full flex justify-center items-center h-[88px] mb-0.5">
                              <div className="absolute left-[2pt] top-1/2 -translate-y-1/2 font-black text-indigo-950 text-[6.5pt] uppercase [writing-mode:vertical-lr] rotate-180 tracking-[0.25em] whitespace-nowrap opacity-95">
                                STUDENT ID
                              </div>
                              <div className="relative z-20 w-[74px] h-[88px] bg-white border border-indigo-800 rounded overflow-hidden flex items-center justify-center shadow-sm">
                                 <img src={student.photo} 
                                   style={{ transform: `translate(${(student.photo_x || 0)}px, ${(student.photo_y || 0)}px)`, width: '100%', height: 'auto', minHeight: '100%', position: 'absolute' }} draggable="false" />
                              </div>
                           </div>

                           <div className="relative z-20 w-full border-b border-indigo-600 mb-0.5 mt-1 flex items-center justify-center min-h-[14pt]">
                              <h3 className={`font-black text-indigo-900 uppercase text-center w-full whitespace-nowrap overflow-visible ${nameStyle.className}`} style={nameStyle.style}>
                                {student.student_name}
                              </h3>
                           </div>
                           
                           <div className="relative z-20 data-grid text-[8.2pt] font-bold text-slate-800 w-full pt-1">
                              <span>Roll</span> <span>:</span> <span className="text-black font-medium">{student.class_roll}</span>
                              <span>Class</span> <span>:</span> <span className="text-black font-medium">{student.class_name}</span>
                              <span className="flex items-start">
                                {student.class_name === 'Intermediate' ? 'Group' : student.class_name === 'Degree' ? 'Course' : 'Dept.'}
                              </span> 
                              <span>:</span> 
                              <span className="text-black font-medium text-[7.8pt] tracking-tighter leading-[1.2]">{student.department}</span>
                              <span>Session</span> <span>:</span> <span className="text-black font-medium">{student.session}</span>
                              <span>Mobile</span> <span>:</span> <span className="text-black font-medium">{student.mobile}</span>
                              <span>Blood</span> <span>:</span> <span className="text-red-700 font-extrabold">{student.blood_group}</span>
                           </div>
                        </div>
                        <div className="absolute bottom-0 w-full h-[10pt] bg-gradient-to-r from-green-800 via-emerald-500 to-green-900 border-t border-yellow-400"></div>
                      </div>
                    );
                  })}
                </div>

                {/* ব্যাক সাইড পেজ */}
                <div className="print-page">
                  {backBatchOrdered.map((student, idx) => {
                    if (!student) return <div key={`empty-back-${idx}`} className="empty-card-spacer"></div>;

                    return (
                      <div key={`back-${student.id}`} className="id-card portrait relative overflow-hidden bg-white border border-slate-400 text-black">
                         <div className="relative z-10 bg-indigo-800 h-[30pt] flex items-center justify-center text-white font-bold text-[7.5pt] uppercase italic tracking-widest">General Instructions</div>
                         <div className="relative z-10 p-4 h-[208pt] flex flex-col justify-between items-center text-center">
                            <div className="w-full">
                              <h4 className="font-bold border-b border-indigo-200 pb-1 mb-3 text-[8.5pt] text-indigo-800 uppercase tracking-tighter">Rules & Regulations</h4>
                              <ul className="text-[7.2pt] font-bold text-slate-700 space-y-2 list-none">
                                <li>• Please carry this card during college hours.</li>
                                <li>• If found anywhere, please return to office.</li>
                                <li>• It is a non-transferable identity document.</li>
                                <li className="text-red-600 uppercase font-black italic border-t border-red-100 pt-1 text-[6.2pt] whitespace-nowrap overflow-hidden leading-none">
                                    • Validity expires with the session.
                                </li>
                              </ul>
                            </div>
                            <div className="text-center w-full mb-6 relative flex flex-col items-center">
                               {student.principal_signature && (
                                 <img src={student.principal_signature} className="h-8 w-auto mb-[-3px] relative z-10 mix-blend-multiply" alt="Sig" />
                               )}
                               <div className="w-16 border-t-2 border-slate-900 mx-auto"></div>
                               <p className="text-[7.5pt] font-black mt-1 uppercase italic tracking-tighter">Principal Signature</p>
                            </div>
                         </div>
                         <div className="absolute bottom-0 w-full bg-indigo-800 text-white text-[5.2pt] text-center py-2 font-bold tracking-widest lowercase">www.birganjgovtcollege.edu.bd</div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* --- ফুটার: এডমিন লগইন লিংক --- */}
      <footer className="print:hidden w-full text-center py-6 mt-10 border-t border-slate-200">
        {!isAdmin && (
          <button 
            onClick={() => setShowLoginModal(true)} 
            className="text-slate-400 hover:text-indigo-800 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            🔒 Admin Dashboard Login
          </button>
        )}
      </footer>

      {/* --- এডমিন লগইন মোডাল --- */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border-4 border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => { setShowLoginModal(false); setAdminUserId(''); }} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Enter Admin User ID</h3>
            <p className="text-slate-500 text-xs mb-6 uppercase font-bold italic">Authorized Personnel Only</p>
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <input 
                type="password" 
                placeholder="User ID" 
                value={adminUserId}
                onChange={e => setAdminUserId(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-center font-bold text-base tracking-widest focus:border-indigo-600 outline-none placeholder:text-slate-500 placeholder:opacity-100"
                required
                autoFocus
              />
              <button type="submit" className="w-full bg-indigo-800 hover:bg-indigo-900 active:scale-[0.99] text-white font-bold p-3.5 rounded-xl uppercase text-xs tracking-wider transition-colors shadow-md cursor-pointer">
                Unlock Dashboard
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 no-print animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl border-4 border-slate-100">
                <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter underline decoration-red-500">Wait!</h3>
                <p className="text-slate-500 text-sm mb-8 font-bold italic uppercase">Permanently delete this record?</p>
                <div className="flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-2xl font-black uppercase text-xs text-slate-600 active:scale-95">Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-black uppercase text-xs shadow-lg cursor-pointer active:scale-95">Delete</button>
                </div>
            </div>
        </div>
      )}

      {/* Precise CSS Styles for Pixel-Perfect A4 Alignment */}
      <style jsx>{`
        .id-card { 
          width: 146pt; 
          height: 238pt; 
          box-sizing: border-box; 
          background-color: white; 
          border-radius: 4pt; 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
        }
        .empty-card-spacer {
          width: 146pt; 
          height: 238pt;
          visibility: hidden;
        }
        .data-grid { 
          display: grid; 
          grid-template-columns: 42px 10px 1fr; 
          row-gap: 3.5px; 
          align-items: start; 
          line-height: 1.3; 
        }
        
        @media print { 
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { 
            display: none !important; 
          }
          .batch-container {
            display: block;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            display: grid !important;
            grid-template-columns: repeat(3, 146pt) !important;
            grid-template-rows: repeat(3, 238pt) !important;
            gap: 12pt 15pt !important;
            justify-content: center !important;
            align-content: center !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          .print-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
          }
          .id-card { 
            border: 0.5pt solid #000 !important; 
            border-radius: 0 !important; 
            box-shadow: none !important; 
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </div>
  );
}