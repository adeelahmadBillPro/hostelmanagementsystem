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
  ArrowUp,
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
  LogOut,
  Clock,
  CalendarCheck,
  Import,
  MessageSquare,
  Megaphone,
  PlusCircle,
  Map,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animated Section — triggers only when scrolled INTO view          */
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
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Negative rootMargin: element must be 60px inside viewport to trigger
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px) scale(1)' : 'translateY(44px) scale(0.97)',
        transition: visible
          ? `opacity 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.75s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
          : 'none',
      }}
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
  { icon: Map, title: 'Bed Map View', desc: 'Visual bed map with resident names — instantly see who is in which bed across all rooms.' },
  { icon: Landmark, title: 'Multi-Hostel', desc: 'Manage multiple hostels from a single dashboard with unified analytics.' },
  { icon: UserCog, title: 'Manager Messaging', desc: 'Admin sends personal messages to individual managers or broadcast to all. Managers can reply.' },
  { icon: Cookie, title: 'Food System', desc: 'Daily menu, meal ordering with countdown timers, per-hostel custom ordering hours.' },
  { icon: Receipt, title: 'Smart Billing', desc: 'Monthly, weekly, daily & per-night billing with auto-recalculate, pro-rating & PDF invoices.' },
  { icon: PlusCircle, title: 'Custom Charges', desc: 'Set recurring extra charges per hostel — AC, laundry, generator. Auto-added to every bill.' },
  { icon: CreditCard, title: 'Payments', desc: 'Cash, Bank, JazzCash, EasyPaisa -- proof upload, duplicate blocking, reversal.' },
  { icon: CalendarCheck, title: 'Checkout Settlement', desc: 'Hotel-style checkout with full financial breakdown, deposit refund & damage deductions.' },
  { icon: LogOut, title: 'Leave Notices', desc: 'Residents submit departure notices, managers acknowledge & auto-checkout on completion.' },
  { icon: Megaphone, title: 'Targeted Notices', desc: 'Send notices to all residents, a specific person, or a specific room.' },
  { icon: ClipboardList, title: 'Visitor Log', desc: 'Record visitors with check-in/out times, purpose, and photos.' },
  { icon: AlertCircle, title: 'Complaints & Disputes', desc: 'Residents file complaints or bill disputes. Managers resolve, adjust bills & close.' },
  { icon: Ticket, title: 'Gate Pass', desc: 'Digital gate passes for move-out, luggage, or late-night entry.' },
  { icon: FileText, title: 'Reports & Invoices', desc: 'Occupancy, revenue, expenses — export PDF invoices with hostel logo and branding.' },
  { icon: UserCircle, title: 'Resident Portal', desc: 'View bills, order food, pay online, file complaints, read targeted notices, chat with management.' },
  { icon: Import, title: 'Import / Export', desc: 'Bulk import residents, rooms, food menu from Excel. Export everything to spreadsheets.' },
  { icon: UserCog, title: 'Staff Management', desc: 'Track security, cooking, cleaning staff with salary, attendance & portal login.' },
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
    features: ['1 Hostel', '5 Residents', '10 Rooms', '2 Staff', 'Basic Billing', 'Food Menu', 'Complaints', 'Leave Notices'],
    popular: false,
  },
  {
    name: 'Starter',
    price: 'PKR 2,000',
    period: '/month',
    desc: 'Perfect for small hostels getting started.',
    features: ['1 Hostel', '50 Residents', '30 Rooms', '5 Staff', 'Smart Billing', 'Food Orders', 'Gate Pass & Notices', 'Checkout Settlements', 'Custom Meal Times'],
    popular: false,
  },
  {
    name: 'Pro',
    price: 'PKR 5,000',
    period: '/month',
    desc: 'For growing hostels that need everything.',
    features: ['3 Hostels', '200 Residents', '100 Rooms', '20 Staff', 'Everything in Starter', 'Multi-Hostel Management', 'Managers & Analytics', 'In-App Messaging', 'Leave Notices & Settlements', 'Excel Import/Export'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'PKR 10,000',
    period: '/month',
    desc: 'For hostel chains and large operations.',
    features: ['Unlimited Hostels', 'Unlimited Residents', 'Unlimited Rooms', 'Unlimited Staff', 'Everything in Pro', 'Per-Night & Daily Billing', 'Email Notifications', 'Priority Support 24/7'],
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
    color: 'from-teal-500 to-emerald-600',
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
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 40);
      setShowScrollTop(window.scrollY > 400);
    };
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${navScrolled ? 'bg-primary' : 'bg-white/20'}`}>
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className={`text-base sm:text-lg font-bold ${navScrolled ? 'text-gray-900' : 'text-white'}`}>
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

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={`hidden sm:inline-flex text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                navScrolled ? 'text-gray-600 hover:text-primary' : 'text-white/80 hover:text-white'
              }`}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={`text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 whitespace-nowrap ${
                navScrolled
                  ? 'bg-primary text-white hover:bg-primary-dark shadow-sm'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
              }`}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  SECTION 1: HERO                                              */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-sidebar via-sidebar-hover to-[#0F766E]">
        {/* Floating shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-64 h-64 bg-white/5 rounded-full animate-float" />
          <div className="absolute top-40 right-[15%] w-48 h-48 bg-primary/10 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 left-[20%] w-32 h-32 bg-teal-400/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[60%] right-[8%] w-20 h-20 bg-white/5 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute bottom-20 right-[30%] w-40 h-40 bg-emerald-500/10 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
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
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6"
                style={{ opacity: 0, animation: 'heroReveal 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s forwards' }}>
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white/80">Trusted by 500+ Hostels in Pakistan</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] mb-6"
                style={{ opacity: 0, animation: 'heroReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.25s forwards' }}>
                Complete Hostel{' '}
                <span className="bg-gradient-to-r from-teal-300 via-emerald-200 to-teal-300 bg-clip-text text-transparent" style={{ backgroundSize: '200%', animation: 'shimmerText 3s linear infinite' }}>
                  Management
                </span>{' '}
                Platform
              </h1>

              <p className="text-lg text-teal-100 max-w-xl mb-8"
                style={{ opacity: 0, animation: 'heroReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s forwards' }}>
                Manage rooms, residents, billing, food, staff -- all in one place.
                Built for hostel owners in Pakistan who want to go digital.
              </p>

              <div className="flex flex-wrap gap-4"
                style={{ opacity: 0, animation: 'heroReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.55s forwards' }}>
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
            <div className="hidden lg:block" style={{ opacity: 0, animation: 'heroReveal 1s cubic-bezier(0.16,1,0.3,1) 0.4s forwards' }}>
              <div className="relative">
                {/* Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-3xl blur-2xl" />

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
                      {['Rooms', 'Residents', 'Billing', 'Food', 'Staff', 'Settlements', 'Reports'].map((item) => (
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
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
            style={{ opacity: 0, animation: 'heroReveal 1s cubic-bezier(0.16,1,0.3,1) 0.7s forwards' }}>
            {[
              { label: 'Hostels', value: '500+' },
              { label: 'Residents', value: '10,000+' },
              { label: 'Managed', value: 'PKR 50M+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="text-3xl md:text-4xl font-extrabold text-white group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
                <div className="text-sm text-teal-200 mt-1">{stat.label}</div>
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
      <section id="how-it-works" className="py-24 bg-[#F8FAFC] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '32px 32px' }} />
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
      <section id="features" className="py-24 bg-gradient-to-b from-white via-[#f0fdf9] to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />
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
      <section id="pricing" className="py-24 bg-gradient-to-b from-[#F8FAFC] to-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)', backgroundSize: '28px 28px' }} />
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
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-lg shadow-primary/25">
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
      <footer className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0B1929 0%, #060f1c 100%)" }}>
        {/* Top glow line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #10B981 30%, #10B981 70%, transparent)" }} />
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse, #10B981 0%, transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-8">

          {/* Top section — brand + links */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/[0.07]">

            {/* Brand — spans 2 cols on lg */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Hostel<span className="text-emerald-400">Hub</span></span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-5 max-w-[280px]">
                Pakistan ka complete hostel management platform. Rooms, residents, billing, food — sab ek jagah.
              </p>

              {/* Social icons — proper SVGs */}
              <div className="flex gap-2">
                {/* WhatsApp */}
                <a href="#" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 flex items-center justify-center transition-all duration-200 group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-400 group-hover:fill-emerald-400 transition-colors">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                {/* Facebook */}
                <a href="#" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/30 flex items-center justify-center transition-all duration-200 group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-400 group-hover:fill-blue-400 transition-colors">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                {/* LinkedIn */}
                <a href="#" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-sky-500/20 border border-white/5 hover:border-sky-500/30 flex items-center justify-center transition-all duration-200 group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-400 group-hover:fill-sky-400 transition-colors">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                {/* Instagram */}
                <a href="#" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/5 hover:border-pink-500/30 flex items-center justify-center transition-all duration-200 group">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-400 group-hover:fill-pink-400 transition-colors">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 mb-4">Product</p>
              <ul className="space-y-2.5">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'Room Grid', href: '#' },
                  { label: 'Food System', href: '#' },
                  { label: 'Billing', href: '#' },
                  { label: 'Reports', href: '#' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-slate-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block">{label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 mb-4">Company</p>
              <ul className="space-y-2.5">
                {['About Us', 'Careers', 'Privacy Policy', 'Terms of Service', 'Refund Policy'].map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 mb-4">Contact</p>
              <ul className="space-y-3.5">
                <li>
                  <a href="mailto:support@hostelhub.pk" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">support@hostelhub.pk</span>
                  </a>
                </li>
                <li>
                  <a href="tel:+923001234567" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-400 group-hover:text-white transition-colors">+92 300 123 4567</span>
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-400">Lahore, Pakistan</span>
                </li>
              </ul>

              {/* Login CTA */}
              <div className="mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 text-sm font-medium transition-all duration-200"
                >
                  Get Started Free
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600 order-2 sm:order-1">
              &copy; {new Date().getFullYear()} HostelHub. All rights reserved. Built for Pakistan 🇵🇰
            </p>
            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500">All systems operational</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-5 z-50 w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-primary-dark hover:scale-110 ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="Scroll to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
}
