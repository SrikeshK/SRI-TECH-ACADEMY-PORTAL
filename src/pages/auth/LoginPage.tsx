import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getFirebaseErrorMessage } from '../../services/firebaseAuthService';
import PageWrapper from '../../components/ui/PageWrapper';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import { 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Code, 
  Laptop, 
  Award, 
  GraduationCap, 
  Database
} from 'lucide-react';

// Lightweight canvas background for floating particles & connection lines
const TechCanvasBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Disable on small screens for performance
    const isMobile = width < 768;
    if (isMobile) {
      // Draw static tech grid and exit animation
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      return;
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      isBinary: boolean;
      binaryValue: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.45;
        this.vy = (Math.random() - 0.5) * 0.45;
        this.radius = Math.random() * 1.8 + 0.8;
        this.color = Math.random() > 0.4 ? 'rgba(212, 175, 55, 0.18)' : 'rgba(14, 165, 233, 0.15)'; // Gold and Cyan accents
        this.isBinary = Math.random() > 0.88;
        this.binaryValue = Math.random() > 0.5 ? '0' : '1';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx = -this.vx;
        if (this.y < 0 || this.y > height) this.vy = -this.vy;
      }

      draw() {
        if (!ctx) return;
        if (this.isBinary) {
          ctx.font = '9px monospace';
          ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
          ctx.fillText(this.binaryValue, this.x, this.y);
        } else {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.fill();
        }
      }
    }

    const particles: Particle[] = [];
    const particleCount = Math.min(55, Math.floor((width * height) / 28000));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const drawLines = () => {
      if (!ctx) return;
      const maxDistance = 125;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.08;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle tech grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
      ctx.lineWidth = 1;
      const gridSize = 65;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      drawLines();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 bg-[#02040a]" />;
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const userProfile = await login(email, password);
      if (userProfile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      // Map Firebase error codes to friendly messages.
      // err.message is already mapped by firebaseAuthService, but
      // getFirebaseErrorMessage handles any raw Firebase errors too.
      const message = err?.code
        ? getFirebaseErrorMessage(err)
        : (err?.message || 'Login failed. Please check your credentials.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };


  // Tech tags floating slowly in the background
  const techTags = [
    { text: '</>', top: '12%', left: '14%', delay: 0 },
    { text: '{}', top: '78%', left: '7%', delay: 3 },
    { text: 'Python', top: '22%', left: '38%', delay: 1 },
    { text: 'Java', top: '82%', left: '46%', delay: 4.5 },
    { text: 'C++', top: '48%', left: '22%', delay: 2 },
    { text: 'Database', top: '18%', left: '78%', delay: 3.5 },
    { text: 'Cloud', top: '72%', left: '88%', delay: 0.5 },
    { text: 'const gate = true', top: '55%', left: '6%', delay: 5.5 },
    { text: 'await auth()', top: '38%', left: '84%', delay: 2.5 },
  ];

  return (
    <PageWrapper className="min-h-screen flex relative overflow-hidden bg-black text-slate-100 font-sans">
      {/* 1. Animated Tech Canvas Background */}
      <TechCanvasBackground />

      {/* Ambient glow nodes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-950/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 2. Floating technology text/symbols (desktop only) */}
      <div className="absolute inset-0 pointer-events-none hidden md:block z-0 overflow-hidden">
        {techTags.map((tag, idx) => (
          <motion.div
            key={idx}
            className="absolute text-[11px] font-mono text-slate-600/35 tracking-wider select-none font-bold"
            style={{ top: tag.top, left: tag.left }}
            animate={{
              y: [-12, 12, -12],
              x: [-6, 6, -6],
            }}
            transition={{
              duration: 8 + idx * 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: tag.delay
            }}
          >
            {tag.text}
          </motion.div>
        ))}
      </div>

      <div className="w-full min-h-screen flex flex-col md:flex-row relative z-10">
        
        {/* ========================================================
            LEFT COLUMN: HERO WELCOME AREA (DESKTOP ONLY)
           ======================================================== */}
        <div className="hidden md:flex md:w-1/2 flex-col justify-between p-16 select-none relative">
          {/* Logo / Brand Header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center font-display font-extrabold text-black text-base shadow-[0_0_20px_rgba(212,175,55,0.4)]">
              STA
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm tracking-widest text-white leading-none">
                SRI TECH
              </span>
              <span className="font-sans font-medium text-[9px] tracking-widest text-gold mt-0.5">
                ACADEMY
              </span>
            </div>
          </div>

          {/* Welcome and animated text reveal */}
          <div className="my-auto max-w-lg space-y-8 relative">
            
            {/* Soft decorative blur nodes specifically behind left text */}
            <div className="absolute -left-10 -top-10 w-48 h-48 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-3">
              <motion.span 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-xs font-display font-bold tracking-widest text-gold block uppercase"
              >
                Welcome To
              </motion.span>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="text-4xl lg:text-5xl font-display font-extrabold text-white leading-tight tracking-tight"
              >
                SRI TECH ACADEMY
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="text-slate-400 font-display font-medium text-lg"
              >
                Academy Management Portal
              </motion.p>
            </div>

            {/* Feature Reveal Items */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              {[
                { label: 'Manage Learning', desc: 'Browse courses, modules, and schedules' },
                { label: 'Track Progress', desc: 'Monitor study guides and syllabus completion' },
                { label: 'Monitor Attendance', desc: 'Log live class attendance check-ins' },
                { label: 'Access Materials', desc: 'Download textbooks, codes, and lectures' }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + idx * 0.1, ease: "easeOut" }}
                  className="flex items-start gap-4 group"
                >
                  <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gold group-hover:border-gold/35 group-hover:bg-gold/5 transition-all mt-0.5 shadow-sm">
                    <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-slate-200 group-hover:text-white transition-colors">
                      {item.label}
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Copyright footer */}
          <div className="text-xs text-slate-600 font-sans">
            &copy; {new Date().getFullYear()} Sri Tech Academy. Dedicated Management Portal.
          </div>

          {/* Floating Subtle welcome graphics (desktop only) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { icon: Code, top: '25%', right: '15%', scale: 0.9, delay: 0.5 },
              { icon: Laptop, top: '65%', right: '10%', scale: 0.85, delay: 1.5 },
              { icon: Award, top: '45%', right: '25%', scale: 0.95, delay: 2.5 },
              { icon: GraduationCap, top: '10%', right: '35%', scale: 0.8, delay: 3.5 },
              { icon: Database, top: '80%', right: '28%', scale: 0.9, delay: 4.5 }
            ].map((element, idx) => {
              const FloatingIcon = element.icon;
              return (
                <motion.div
                  key={idx}
                  className="absolute text-slate-700/20"
                  style={{ top: element.top, right: element.right }}
                  animate={{
                    y: [-15, 15, -15],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 10 + idx * 3,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                    delay: element.delay
                  }}
                >
                  <FloatingIcon className="h-10 w-10 stroke-[1.2]" />
                </motion.div>
              );
            })}
          </div>

        </div>

        {/* ========================================================
            RIGHT COLUMN: LOGIN FORM & CARD
           ======================================================== */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 relative min-h-screen">
          
          {/* Mobile-only logo */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center font-display font-extrabold text-black text-sm shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              STA
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm tracking-widest text-white leading-none">
                SRI TECH
              </span>
              <span className="font-sans font-bold text-[8px] tracking-widest text-gold mt-0.5">
                ACADEMY PORTAL
              </span>
            </div>
          </div>

          {/* Glow wrapper with animated pulsing box shadow */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              // Smooth float animation on desktop, static on mobile
              y: window.innerWidth >= 768 ? [-4, 4, -4] : 0
            }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 0.5 },
              y: {
                duration: 6,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }
            }}
            className="w-full max-w-md relative group/card"
          >
            {/* Futuristic Animated Border Glow background layer */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gold/30 via-sky-600/20 to-gold/30 rounded-2xl blur-md opacity-75 group-hover/card:opacity-100 transition duration-1000 group-hover/card:duration-200 animate-pulse-slow pointer-events-none" />

            {/* The actual Card with Glassmorphism */}
            <div className="relative bg-slate-950/75 border border-white/10 rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
              
              {/* Soft logo in form header */}
              <div className="flex flex-col items-center mb-6">
                <h2 className="text-xl font-display font-bold text-white tracking-wide text-center">
                  Academy Portal
                </h2>
                <p className="text-xs text-slate-400 text-center mt-1">
                  Choose role and enter credentials to sign in
                </p>
              </div>

              {/* Role Selection Tabs */}
              <div className="grid grid-cols-2 p-1.5 rounded-xl bg-white/5 border border-white/5 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    setError(null);
                    setEmail('');
                    setPassword('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-display font-bold transition-all duration-300 ${
                    role === 'student'
                      ? 'bg-gold text-black shadow-lg shadow-gold/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Student Portal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('admin');
                    setError(null);
                    setEmail('');
                    setPassword('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-display font-bold transition-all duration-300 ${
                    role === 'admin'
                      ? 'bg-gold text-black shadow-lg shadow-gold/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Portal
                </button>
              </div>

              {/* Error messages with animation */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs mb-5 overflow-hidden"
                  >
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-display">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. name@sritechacademy.edu"
                      className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-sm w-full"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400 font-display">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="glass-input pl-10 pr-10 py-2.5 rounded-xl text-slate-100 placeholder-slate-600 text-sm w-full"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Sign In Button */}
                <Button
                  type="submit"
                  variant="gold"
                  isLoading={isLoading}
                  className="font-bold py-3 mt-3 rounded-xl text-black shadow-lg shadow-gold/20 hover:shadow-gold/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  Sign In to Portal
                </Button>
              </form>

              {/* Forgot Password Placeholder */}
              <div className="border-t border-white/5 pt-4 mt-6 text-center">
                <button
                  type="button"
                  className="text-[11px] text-slate-500 hover:text-slate-300 font-display transition-colors py-1"
                  onClick={() => {}}
                >
                  Forgot Password? Contact your administrator.
                </button>
              </div>

            </div>
          </motion.div>
        </div>

      </div>
    </PageWrapper>
  );
};

export default LoginPage;
