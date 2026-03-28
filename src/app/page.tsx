'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  DoorOpen,
  Users,
  UtensilsCrossed,
  Receipt,
  BarChart3,
  Grid3X3,
  Landmark,
  UserCog,
  Cookie,
  CreditCard,
  ClipboardList,
  AlertCircle,
  Ticket,
  FileText,
  UserCircle,
  Moon,
  Play,
  Check,
  ChevronRight,
  ArrowRight,
  Shield,
  Crown,
  Briefcase,
  User,
  Star,
  Zap,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Eye,
  Bed,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll animations                   */
/* ------------------------------------------------------------------ */
function useOnScreen(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fallback: make visible after 1.5s in case observer fails
    const fallback = setTimeout(() => setVisible(true), 1500);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          clearTimeout(fallback);
        }
      },
      { threshold, rootMargin: '50px' }
    );
    obs.observe(el);
    return () => { obs.disconnect(); clearTimeout(fallback); };
  }, [threshold]);

  return { ref, visible };
}

/* ------------------------------------------------------------------ */
/*  Animated Section wrapper                                           */
/* ------------------------------------------------------------------ */
function AnimatedSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useOnScreen(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const howItWorksSteps = [
  {
    icon: Building2,
    title: 'Sign Up & Create Hostel',
    description: 'Register as a hostel owner, add your hostel details, and you\'re ready to go.',
  },
  {
    icon: DoorOpen,
    title: 'Set Up Rooms & Beds',
    description: 'Add buildings, floors, rooms with types (Single/Double/Triple). Visual room grid shows availability at a glance.',
  },
  {
    icon: Users,
    title: 'Add Residents',
    description: 'Register residents with CNIC, assign to rooms & beds. Track move-in dates, advances, security deposits.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Manage Food & Staff',
    description: 'Set up daily food menu, residents order meals. Manage security, cooking, cleaning staff with salary tracking.',
  },
  {
    icon: Receipt,
    title: 'Generate Bills & Collect Payments',
    description: 'Auto-generate monthly bills including rent, food, parking. Record payments via Cash, Bank, JazzCash, EasyPaisa.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'View occupancy rates, revenue trends, expense breakdowns. Export to PDF.',
  },
];

const features = [
  { icon: Grid3X3, title: 'Room Grid View', desc: 'Visual room map with real-time bed status and color-coded availability.' },
  { icon: Landmark, title: 'Multi-Hostel', desc: 'Manage multiple hostels from a single dashboard with unified analytics.' },
  { icon: UserCog, title: 'Staff Management', desc: 'Track security, cooking, cleaning staff with salary and attendance.' },
  { icon: Cookie, title: 'Food System', desc: 'Daily menu setup, meal ordering, food cost tracking per resident.' },
  { icon: Receipt, title: 'Billing', desc: 'Auto-generate monthly bills with rent, food, parking breakdowns.' },
  { icon: CreditCard, title: 'Payments', desc: 'Cash, Bank, JazzCash, EasyPaisa -- track every payment with receipts.' },
  { icon: ClipboardList, title: 'Visitor Log', desc: 'Record visitors with check-in/out times, purpose, and photos.' },
  { icon: AlertCircle, title: 'Complaints', desc: 'Residents file complaints, managers resolve and track status.' },
  { icon: Ticket, title: 'Gate Pass', desc: 'Digital gate passes for move-out, luggage, or late-night entry.' },
  { icon: FileText, title: 'Reports', desc: 'Occupancy, revenue, expenses -- export to PDF and Excel.' },
  { icon: UserCircle, title: 'Resident Portal', desc: 'Residents view bills, order food, file complaints from their phone.' },
  { icon: Moon, title: 'Dark Mode', desc: 'Full dark theme support for comfortable night-time management.' },
];

const roomsData = [
  { num: '101', block: 'A', floor: 1, beds: 4, occupied: 0, status: 'vacant' as const },
  { num: '102', block: 'A', floor: 1, beds: 4, occupied: 4, status: 'full' as const },
  { num: '103', block: 'A', floor: 1, beds: 2, occupied: 1, status: 'partial' as const },
  { num: '104', block: 'A', floor: 1, beds: 3, occupied: 0, status: 'reserved' as const },
  { num: '105', block: 'A', floor: 1, beds: 4, occupied: 2, status: 'partial' as const },
  { num: '201', block: 'A', floor: 2, beds: 4, occupied: 4, status: 'full' as const },
  { num: '202', block: 'A', floor: 2, beds: 2, occupied: 0, status: 'vacant' as const },
  { num: '203', block: 'A', floor: 2, beds: 3, occupied: 2, status: 'partial' as const },
  { num: '204', block: 'A', floor: 2, beds: 4, occupied: 4, status: 'full' as const },
  { num: '205', block: 'A', floor: 2, beds: 1, occupied: 0, status: 'vacant' as const },
  { num: '301', block: 'B', floor: 1, beds: 4, occupied: 3, status: 'partial' as const },
  { num: '302', block: 'B', floor: 1, beds: 2, occupied: 2, status: 'full' as const },
  { num: '303', block: 'B', floor: 1, beds: 4, occupied: 0, status: 'vacant' as const },
  { num: '304', block: 'B', floor: 1, beds: 3, occupied: 0, status: 'reserved' as const },
  { num: '305', block: 'B', floor: 1, beds: 4, occupied: 1, status: 'partial' as const },
  { num: '401', block: 'B', floor: 2, beds: 2, occupied: 2, status: 'full' as const },
  { num: '402', block: 'B', floor: 2, beds: 4, occupied: 0, status: 'vacant' as const },
  { num: '403', block: 'B', floor: 2, beds: 3, occupied: 3, status: 'full' as const },
  { num: '404', block: 'B', floor: 2, beds: 4, occupied: 2, status: 'partial' as const },
  { num: '405', block: 'B', floor: 2, beds: 1, occupied: 0, status: 'reserved' as const },
];

const statusColors = {
  vacant: { bg: 'bg-success-light', border: 'border-success', text: 'text-success-dark', dot: 'bg-success', label: 'Vacant' },
  partial: { bg: 'bg-warning-light', border: 'border-warning', text: 'text-warning-dark', dot: 'bg-warning', label: 'Partially Occupied' },
  full: { bg: 'bg-danger-light', border: 'border-danger', text: 'text-danger-dark', dot: 'bg-danger', label: 'Fully Occupied' },
  reserved: { bg: 'bg-primary-light', border: 'border-primary', text: 'text-primary-dark', dot: 'bg-primary', label: 'Reserved' },
};

const pricingPlans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    desc: 'Try HostelHub risk-free. No credit card required.',
    features: ['1 Hostel', '5 Residents', '10 Rooms', '2 Staff', 'Basic Billing', 'Food Menu', 'Complaints'],
    popular: false,
  },
  {
    name: 'Starter',
    price: 'PKR 2,000',
    period: '/month',
    desc: 'Perfect for small hostels getting started.',
    features: ['1 Hostel', '50 Residents', '30 Rooms', '5 Staff', 'Billing & Payments', 'Food Orders', 'Gate Pass & Notices', 'Expenses & Reports'],
    popular: false,
  },
  {
    name: 'Pro',
    price: 'PKR 5,000',
    period: '/month',
    desc: 'For growing hostels that need everything.',
    features: ['3 Hostels', '200 Residents', '100 Rooms', '20 Staff', 'Everything in Starter', 'Multi-Hostel Management', 'Managers & Analytics', 'In-App Messaging', 'Visitor Tracking'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'PKR 10,000',
    period: '/month',
    desc: 'For hostel chains and large operations.',
    features: ['Unlimited Hostels', 'Unlimited Residents', 'Unlimited Rooms', 'Unlimited Staff', 'Everything in Pro', 'API Access', 'Custom Branding', 'Priority Support 24/7'],
    popular: false,
  },
];

const roles = [
  {
    icon: Crown,
    title: 'Super Admin',
    desc: 'Manage all tenants, platform analytics, system configuration.',
    color: 'from-amber-500 to-orange-500',
    capabilities: ['Platform-wide analytics', 'Tenant management', 'System configuration', 'Subscription management'],
  },
  {
    icon: Shield,
    title: 'Hostel Owner',
    desc: 'Multiple hostels, full control over operations and finances.',
    color: 'from-primary to-indigo-600',
    capabilities: ['Multiple hostel management', 'Financial overview', 'Staff management', 'Full reports access'],
  },
  {
    icon: Briefcase,
    title: 'Manager',
    desc: 'Day-to-day operations, room assignments, billing.',
    color: 'from-emerald-500 to-teal-500',
    capabilities: ['Room assignments', 'Billing & collections', 'Visitor management', 'Complaint resolution'],
  },
  {
    icon: User,
    title: 'Resident',
    desc: 'View bills, order food, file complaints from their phone.',
    color: 'from-sky-500 to-blue-500',
    capabilities: ['View & pay bills', 'Order food', 'File complaints', 'Request gate passes'],
  },
];

/* ================================================================== */
/*  MAIN PAGE COMPONENT                                                */
/* ================================================================== */
export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<typeof roomsData[0] | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans overflow-x-hidden">
      {/* ============================================================ */}
      {/*  STICKY NAV                                                   */}
      {/* ============================================================ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-md border-b border-gray-100'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${navScrolled ? 'bg-primary' : 'bg-white/20'}`}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className={`text-lg font-bold ${navScrolled ? 'text-gray-900' : 'text-white'}`}>
              HostelHub
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              ['How It Works', 'how-it-works'],
              ['Features', 'features'],
              ['Room Grid', 'room-grid'],
              ['Pricing', 'pricing'],
              ['Roles', 'roles'],
            ].map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`text-sm font-medium transition-colors ${
                  navScrolled ? 'text-gray-600 hover:text-primary' : 'text-white/80 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                navScrolled ? 'text-gray-600 hover:text-primary' : 'text-white/80 hover:text-white'
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="btn-primary !py-2 !px-4 !text-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  SECTION 1: HERO                                              */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-sidebar via-sidebar-hover to-[#3730A3]">
        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-64 h-64 bg-white/5 rounded-full animate-float" />
          <div className="absolute top-40 right-[15%] w-48 h-48 bg-primary/10 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 left-[20%] w-32 h-32 bg-indigo-400/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[60%] right-[8%] w-20 h-20 bg-white/5 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 right-[30%] w-40 h-40 bg-purple-500/10 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white/80">Trusted by 500+ Hostels in Pakistan</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6 animate-fade-in-up">
                Complete Hostel{' '}
                <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                  Management
                </span>{' '}
                Platform
              </h1>

              <p className="text-lg text-indigo-200 max-w-xl mb-8 animate-fade-in-up delay-200">
                Manage rooms, residents, billing, food, staff -- all in one place.
                Built for hostel owners in Pakistan who want to go digital.
              </p>

              <div className="flex flex-wrap gap-4 animate-fade-in-up delay-300">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="inline-flex items-center gap-2 bg-transparent border-2 border-white/30 hover:border-white/60 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:bg-white/5"
                >
                  <Play className="w-5 h-5" />
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="animate-fade-in-up delay-300 hidden lg:block">
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur-2xl" />

                {/* Mock dashboard */}
                <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Top bar */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="bg-white/10 rounded-md px-12 py-1 text-xs text-white/50">app.hostelhub.pk/dashboard</div>
                    </div>
                  </div>

                  <div className="flex">
                    {/* Mini sidebar */}
                    <div className="w-44 bg-sidebar/80 p-3 space-y-2 border-r border-white/10">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/60 text-white text-xs font-medium">
                        <div className="w-4 h-4 rounded bg-white/20" />
                        Dashboard
                      </div>
                      {['Rooms', 'Residents', 'Billing', 'Food', 'Staff', 'Reports'].map((item) => (
                        <div key={item} className="flex items-center gap-2 px-2 py-1.5 text-indigo-300/60 text-xs">
                          <div className="w-4 h-4 rounded bg-white/5" />
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 space-y-3">
                      {/* Stat cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: 'Total Rooms', val: '48', color: 'bg-primary/30' },
                          { label: 'Residents', val: '156', color: 'bg-success/30' },
                          { label: 'Revenue', val: '2.4M', color: 'bg-amber-500/30' },
                          { label: 'Complaints', val: '3', color: 'bg-red-400/30' },
                        ].map((s) => (
                          <div key={s.label} className={`${s.color} rounded-lg p-2`}>
                            <div className="text-[10px] text-white/60">{s.label}</div>
                            <div className="text-sm font-bold text-white">{s.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Chart area */}
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="text-[10px] text-white/50 mb-2">Monthly Revenue</div>
                        <div className="flex items-end gap-1 h-16">
                          {[40, 55, 35, 70, 60, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-primary to-indigo-400 rounded-t-sm opacity-70"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Room grid mini */}
                      <div className="grid grid-cols-6 gap-1">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const colors = ['bg-success/40', 'bg-warning/40', 'bg-danger/40', 'bg-primary/40'];
                          return (
                            <div
                              key={i}
                              className={`${colors[i % 4]} rounded h-6`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in-up delay-500">
            {[
              { label: 'Hostels', value: '500+' },
              { label: 'Residents', value: '10,000+' },
              { label: 'Managed', value: 'PKR 50M+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-white">{stat.value}</div>
                <div className="text-sm text-indigo-300 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 50L48 45C96 40 192 30 288 33C384 36 480 52 576 58C672 64 768 60 864 52C960 44 1056 32 1152 30C1248 28 1344 36 1392 40L1440 44V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="#F8FAFC"/>
          </svg>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 2: HOW IT WORKS                                      */}
      {/* ============================================================ */}
      <section id="how-it-works" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary font-medium text-sm rounded-full px-4 py-1.5 mb-4">
                <Zap className="w-4 h-4" />
                Simple 6-Step Process
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                How HostelHub Works
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                From sign-up to full hostel management in minutes. Here is the complete flow.
              </p>
            </div>
          </AnimatedSection>

          {/* Stepper tabs */}
          <AnimatedSection delay={100}>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {howItWorksSteps.map((step, i) => {
                const Icon = step.icon;
                const isActive = activeStep === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </AnimatedSection>

          {/* Step content */}
          <AnimatedSection delay={200}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="grid lg:grid-cols-2 min-h-[480px]">
                {/* Left description */}
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-light mb-6">
                    {(() => { const Icon = howItWorksSteps[activeStep].icon; return <Icon className="w-7 h-7 text-primary" />; })()}
                  </div>
                  <div className="text-sm font-semibold text-primary mb-2">Step {activeStep + 1} of 6</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{howItWorksSteps[activeStep].title}</h3>
                  <p className="text-gray-500 leading-relaxed mb-6">{howItWorksSteps[activeStep].description}</p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                      disabled={activeStep === 0}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium disabled:opacity-30 hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setActiveStep(Math.min(5, activeStep + 1))}
                      disabled={activeStep === 5}
                      className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-30 hover:bg-primary-dark transition-colors"
                    >
                      Next Step
                    </button>
                  </div>
                </div>

                {/* Right visual mockup */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 lg:p-12 flex items-center justify-center border-l border-gray-100">
                  {/* Step 0: Registration mockup */}
                  {activeStep === 0 && (
                    <div className="w-full max-w-sm space-y-4">
                      <div className="bg-white rounded-xl p-6 shadow-card border border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                          <Building2 className="w-5 h-5 text-primary" />
                          <span className="font-semibold text-gray-800">Create Your Hostel</span>
                        </div>
                        {['Hostel Name', 'City', 'Address', 'Owner Email'].map((f) => (
                          <div key={f} className="mb-3">
                            <div className="text-xs font-medium text-gray-500 mb-1">{f}</div>
                            <div className="h-9 bg-gray-50 rounded-lg border border-gray-200" />
                          </div>
                        ))}
                        <div className="h-10 bg-primary rounded-lg mt-4 flex items-center justify-center text-white text-sm font-medium">
                          Create Hostel
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1: Room grid mockup */}
                  {activeStep === 1 && (
                    <div className="w-full max-w-md">
                      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-semibold text-gray-800 text-sm">Room Grid - Block A</span>
                          <div className="flex gap-2">
                            {(['vacant', 'partial', 'full'] as const).map((s) => (
                              <div key={s} className="flex items-center gap-1">
                                <div className={`w-2.5 h-2.5 rounded-full ${statusColors[s].dot}`} />
                                <span className="text-[10px] text-gray-500 capitalize">{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { n: '101', s: 'vacant', b: '0/4' },
                            { n: '102', s: 'full', b: '4/4' },
                            { n: '103', s: 'partial', b: '2/3' },
                            { n: '104', s: 'vacant', b: '0/2' },
                            { n: '105', s: 'partial', b: '1/4' },
                            { n: '106', s: 'full', b: '2/2' },
                            { n: '107', s: 'vacant', b: '0/3' },
                            { n: '108', s: 'partial', b: '3/4' },
                          ].map((r) => {
                            const c = statusColors[r.s as keyof typeof statusColors];
                            return (
                              <div key={r.n} className={`${c.bg} border ${c.border} rounded-lg p-2 text-center`}>
                                <div className={`text-sm font-bold ${c.text}`}>{r.n}</div>
                                <div className="text-[10px] text-gray-500">{r.b} Beds</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Resident card mockup */}
                  {activeStep === 2 && (
                    <div className="w-full max-w-sm space-y-3">
                      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">Ahmed Khan</div>
                            <div className="text-xs text-gray-500">CNIC: 35202-1234567-1</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            { l: 'Room', v: 'A-203' },
                            { l: 'Bed', v: 'Bed 2' },
                            { l: 'Move-in', v: '01 Jan 2026' },
                            { l: 'Rent', v: 'PKR 12,000' },
                            { l: 'Advance', v: 'PKR 12,000' },
                            { l: 'Security', v: 'PKR 10,000' },
                          ].map((item) => (
                            <div key={item.l}>
                              <div className="text-[10px] text-gray-400 uppercase tracking-wider">{item.l}</div>
                              <div className="font-medium text-gray-700">{item.v}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          <span className="badge-success">Active</span>
                          <span className="badge-primary">Verified</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Food & Staff mockup */}
                  {activeStep === 3 && (
                    <div className="w-full max-w-md space-y-3">
                      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200">
                        <div className="font-semibold text-gray-800 text-sm mb-3">Today&apos;s Menu</div>
                        <div className="space-y-2">
                          {[
                            { meal: 'Breakfast', items: 'Paratha, Omelette, Chai', price: '150' },
                            { meal: 'Lunch', items: 'Chicken Biryani, Raita', price: '250' },
                            { meal: 'Dinner', items: 'Daal, Roti, Salad', price: '200' },
                          ].map((m) => (
                            <div key={m.meal} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <div>
                                <div className="text-sm font-medium text-gray-800">{m.meal}</div>
                                <div className="text-xs text-gray-400">{m.items}</div>
                              </div>
                              <div className="text-sm font-semibold text-primary">PKR {m.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200">
                        <div className="font-semibold text-gray-800 text-sm mb-3">Staff</div>
                        <div className="space-y-2">
                          {[
                            { name: 'Rahim', role: 'Security Guard', salary: '25,000' },
                            { name: 'Fatima', role: 'Cook', salary: '30,000' },
                          ].map((s) => (
                            <div key={s.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                  {s.name[0]}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-700">{s.name}</div>
                                  <div className="text-[10px] text-gray-400">{s.role}</div>
                                </div>
                              </div>
                              <div className="text-xs font-medium text-gray-500">PKR {s.salary}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Billing mockup */}
                  {activeStep === 4 && (
                    <div className="w-full max-w-sm space-y-3">
                      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="font-semibold text-gray-800 text-sm">Invoice #INV-2026-03</div>
                          <span className="badge-warning">Pending</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          {[
                            { item: 'Room Rent', amt: '12,000' },
                            { item: 'Food (30 meals)', amt: '6,000' },
                            { item: 'Parking', amt: '1,000' },
                            { item: 'Laundry', amt: '500' },
                          ].map((row) => (
                            <div key={row.item} className="flex justify-between py-1 border-b border-gray-50">
                              <span className="text-gray-600">{row.item}</span>
                              <span className="font-medium text-gray-800">PKR {row.amt}</span>
                            </div>
                          ))}
                          <div className="flex justify-between py-2 font-bold text-gray-900 border-t border-gray-200">
                            <span>Total</span>
                            <span>PKR 19,500</span>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="text-xs text-gray-400 mb-2">Payment Method</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {['Cash', 'Bank', 'JazzCash', 'EasyPaisa'].map((m) => (
                              <div
                                key={m}
                                className="text-center py-2 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary-light transition-colors cursor-pointer"
                              >
                                <div className="text-[10px] font-medium text-gray-600">{m}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Reports mockup */}
                  {activeStep === 5 && (
                    <div className="w-full max-w-md space-y-3">
                      <div className="bg-white rounded-xl p-5 shadow-card border border-gray-200">
                        <div className="font-semibold text-gray-800 text-sm mb-4">Revenue Trend</div>
                        <div className="flex items-end gap-2 h-28">
                          {[
                            { month: 'Oct', h: 45 },
                            { month: 'Nov', h: 60 },
                            { month: 'Dec', h: 55 },
                            { month: 'Jan', h: 75 },
                            { month: 'Feb', h: 80 },
                            { month: 'Mar', h: 95 },
                          ].map((bar) => (
                            <div key={bar.month} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-gradient-to-t from-primary to-indigo-400 rounded-t-md transition-all duration-500"
                                style={{ height: `${bar.h}%` }}
                              />
                              <span className="text-[9px] text-gray-400">{bar.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-200">
                          <div className="text-[10px] text-gray-400">Occupancy Rate</div>
                          <div className="text-2xl font-bold text-success">87%</div>
                          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: '87%' }} />
                          </div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-card border border-gray-200">
                          <div className="text-[10px] text-gray-400">Collection Rate</div>
                          <div className="text-2xl font-bold text-primary">92%</div>
                          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: '92%' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 3: FEATURES GRID                                     */}
      {/* ============================================================ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-success-light text-success-dark font-medium text-sm rounded-full px-4 py-1.5 mb-4">
                <Star className="w-4 h-4" />
                Everything You Need
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                Powerful Features for Modern Hostels
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                From room management to analytics, every tool a hostel owner needs.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <AnimatedSection key={feature.title} delay={i * 60}>
                  <div className="group bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                      <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 4: ROOM GRID LIVE PREVIEW                            */}
      {/* ============================================================ */}
      <section id="room-grid" className="py-24 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-warning-light text-warning-dark font-medium text-sm rounded-full px-4 py-1.5 mb-4">
                <Eye className="w-4 h-4" />
                Visual Room Management
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                Live Room Status at a Glance
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                See exactly which rooms are vacant, partial, or full. Click any room to see bed details.
              </p>
            </div>
          </AnimatedSection>

          {/* Legend */}
          <AnimatedSection delay={100}>
            <div className="flex flex-wrap justify-center gap-6 mb-8">
              {(Object.keys(statusColors) as Array<keyof typeof statusColors>).map((key) => {
                const c = statusColors[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full ${c.dot}`} />
                    <span className="text-sm text-gray-600">{c.label}</span>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="grid lg:grid-cols-[1fr_320px] gap-6">
              {/* Room grid */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900">Room Grid - All Blocks</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Click a room to see details</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="text-xs bg-gray-100 rounded-lg px-3 py-1.5 text-gray-500 font-medium">Block A</div>
                    <div className="text-xs bg-gray-100 rounded-lg px-3 py-1.5 text-gray-500 font-medium">Block B</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {roomsData.map((room) => {
                    const c = statusColors[room.status];
                    const isSelected = selectedRoom?.num === room.num;
                    return (
                      <button
                        key={room.num}
                        onClick={() => setSelectedRoom(room)}
                        className={`${c.bg} border-2 ${c.border} rounded-xl p-3 text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-md ${
                          isSelected ? 'ring-2 ring-offset-2 ring-primary scale-[1.03] shadow-md' : ''
                        }`}
                      >
                        <div className={`text-lg font-bold ${c.text}`}>{room.num}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          Block {room.block} - Floor {room.floor}
                        </div>
                        <div className="text-xs font-medium text-gray-600 mt-1">
                          {room.occupied}/{room.beds} Beds
                        </div>
                        <div className="flex gap-1 mt-2">
                          {Array.from({ length: room.beds }).map((_, bi) => (
                            <Bed
                              key={bi}
                              size={14}
                              className={bi < room.occupied ? c.text : 'text-gray-300'}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                  Click any room to see bed details, assign residents, view history
                </p>
              </div>

              {/* Room detail panel */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 h-fit lg:sticky lg:top-24">
                {selectedRoom ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-lg">Room {selectedRoom.num}</h3>
                      <span className={`badge ${
                        selectedRoom.status === 'vacant' ? 'badge-success'
                          : selectedRoom.status === 'partial' ? 'badge-warning'
                          : selectedRoom.status === 'full' ? 'badge-danger'
                          : 'badge-primary'
                      }`}>
                        {statusColors[selectedRoom.status].label}
                      </span>
                    </div>

                    <div className="space-y-3 text-sm mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Block</span>
                        <span className="font-medium text-gray-700">Block {selectedRoom.block}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Floor</span>
                        <span className="font-medium text-gray-700">Floor {selectedRoom.floor}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Beds</span>
                        <span className="font-medium text-gray-700">{selectedRoom.beds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Occupied</span>
                        <span className="font-medium text-gray-700">{selectedRoom.occupied}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bed Status</div>
                      <div className="space-y-2">
                        {Array.from({ length: selectedRoom.beds }).map((_, bi) => {
                          const isOccupied = bi < selectedRoom.occupied;
                          return (
                            <div key={bi} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                              <Bed size={16} className={isOccupied ? 'text-danger' : 'text-success'} />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-700">Bed {bi + 1}</div>
                                <div className="text-[10px] text-gray-400">{isOccupied ? 'Occupied' : 'Vacant'}</div>
                              </div>
                              {isOccupied ? (
                                <div className="text-xs text-gray-500">Resident {bi + 1}</div>
                              ) : (
                                <div className="text-xs text-success font-medium">Available</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button className="w-full mt-4 bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary-dark transition-colors">
                      Manage Room
                    </button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Bed className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <div className="text-sm text-gray-400">Select a room to view details</div>
                  </div>
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 5: PRICING                                           */}
      {/* ============================================================ */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-primary-light text-primary font-medium text-sm rounded-full px-4 py-1.5 mb-4">
                <CreditCard className="w-4 h-4" />
                Simple Pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                Choose Your Plan
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Start free, upgrade when you need. No hidden fees, cancel anytime.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <AnimatedSection key={plan.name} delay={i * 80}>
                <div
                  className={`relative rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    plan.popular
                      ? 'bg-white border-2 border-primary shadow-xl shadow-primary/10 scale-[1.02]'
                      : 'bg-white border border-gray-200 shadow-card hover:shadow-lg'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-indigo-500 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-lg shadow-primary/25">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
                  </div>

                  <div className="mb-5">
                    {plan.price === 'Free' ? (
                      <>
                        <span className="text-3xl font-extrabold text-emerald-500">FREE</span>
                        <span className="text-gray-400 text-xs ml-1.5">{plan.period}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-extrabold text-gray-900">{plan.price}</span>
                        <span className="text-gray-400 text-xs">{plan.period}</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-gray-600">
                        <Check className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className={`block text-center py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20'
                        : plan.price === 'Free'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plan.price === 'Free' ? 'Start Free Trial' : 'Get Started'}
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 6: ROLES                                             */}
      {/* ============================================================ */}
      <section id="roles" className="py-24 bg-gradient-to-b from-[#F8FAFC] to-white">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-danger-light text-danger-dark font-medium text-sm rounded-full px-4 py-1.5 mb-4">
                <Users className="w-4 h-4" />
                Role-Based Access
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                Built for Every Role
              </h2>
              <p className="text-gray-500 max-w-2xl mx-auto">
                Each user sees only what they need. From platform admins to residents.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, i) => {
              const Icon = role.icon;
              return (
                <AnimatedSection key={role.title} delay={i * 100}>
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-5 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{role.title}</h3>
                    <p className="text-sm text-gray-500 mb-4">{role.desc}</p>
                    <ul className="space-y-2">
                      {role.capabilities.map((cap) => (
                        <li key={cap} className="flex items-center gap-2 text-sm text-gray-600">
                          <ChevronRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          {cap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA BANNER                                                   */}
      {/* ============================================================ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sidebar via-sidebar-hover to-[#3730A3] p-12 md:p-16 text-center">
              {/* Decorative shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                  Ready to Digitize Your Hostel?
                </h2>
                <p className="text-indigo-200 max-w-xl mx-auto mb-8">
                  Join 500+ hostel owners who switched to HostelHub. Start your free trial today -- no credit card required.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 bg-white text-sidebar font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition-all shadow-lg active:scale-[0.98]"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => scrollTo('how-it-works')}
                    className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all"
                  >
                    See How It Works
                  </button>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 7: FOOTER                                            */}
      {/* ============================================================ */}
      <footer className="bg-sidebar text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">HostelHub</span>
              </div>
              <p className="text-indigo-300 text-sm leading-relaxed mb-4">
                The complete hostel management platform built for Pakistan. Manage rooms, residents, billing, and more.
              </p>
              <div className="flex gap-3">
                {[ExternalLink, ExternalLink, ExternalLink, ExternalLink].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <Icon className="w-4 h-4 text-indigo-300" />
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-indigo-400">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'Room Grid', 'Food System', 'Billing', 'Reports'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-indigo-300 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-indigo-400">Company</h4>
              <ul className="space-y-2.5">
                {['About Us', 'Blog', 'Careers', 'Contact', 'Privacy Policy', 'Terms of Service'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-indigo-300 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-indigo-400">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-indigo-300">support@hostelhub.pk</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-indigo-300">+92 300 1234567</span>
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-indigo-300">Lahore, Pakistan</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-indigo-400">
              &copy; {new Date().getFullYear()} HostelHub. All rights reserved.
            </p>
            <p className="text-sm text-indigo-400/60">
              Built with Next.js, Tailwind CSS & Lucide Icons
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
