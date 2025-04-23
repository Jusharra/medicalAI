// Stripe redirect URLs
const STRIPE_URLS = {
  SUCCESS: 'https://vitalehealthconcierge.doctor/onboarding',
  CANCEL: 'https://vitalehealthconcierge.doctor/membership',
} as const;

// Membership tiers and their monthly prices
const MEMBERSHIP_TIERS = {
  ESSENTIAL: {
    id: 'tier_essential',
    price: 499,
    name: 'Essential Care',
    features: [
      '24/7 Medical Concierge',
      'Basic AI Health Assistant',
      'Digital Health Records',
      'Emergency Support',
      '20% Off All Services',
      '$200 Hotel Credit',
      'Basic Event Access'
    ]
  },
  EXECUTIVE: {
    id: 'tier_executive',
    price: 2500,
    name: 'VIP Executive',
    features: [
      'All Essential Care features',
      'Personal Physician Access',
      'Advanced AI Doctor Assistant',
      'Family Coverage (up to 4)',
      'Priority Specialist Access',
      'Annual Wellness Retreat',
      '$1,000 Hotel Vouchers',
      'VIP Event Access',
      'Luxury Spa Services'
    ]
  },
  ELITE: {
    id: 'tier_elite',
    price: 10000,
    name: 'Platinum Elite',
    features: [
      'All VIP Executive features',
      'Unlimited Family Coverage',
      'Premium AI Healthcare Suite',
      'Private Medical Transport',
      'Global Coverage',
      'Exclusive Retreats',
      'Custom Wellness Programs',
      'Private Health Concierge',
      'Priority Hospital Access'
    ]
  }
} as const;

// Onboarding flow configuration
export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Vitalé Health',
    description: 'Begin your journey to premium healthcare'
  },
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Help us personalize your experience'
  },
  {
    id: 'health-assessment',
    title: 'Health Assessment',
    description: 'Let\'s understand your health needs'
  },
  {
    id: 'concierge-intro',
    title: 'Meet Your Concierge Team',
    description: 'Connect with your dedicated healthcare team'
  },
  {
    id: 'schedule-consultation',
    title: 'Schedule Your First Consultation',
    description: 'Book your comprehensive health review'
  }
] as const;

// Membership benefits by tier
const TIER_BENEFITS = {
  ESSENTIAL: {
    consultations: 12,
    response_time: '4 hours',
    hotel_credit: 200,
    family_members: 1,
    specialist_access: 'Standard',
    ai_features: 'Basic'
  },
  EXECUTIVE: {
    consultations: 'Unlimited',
    response_time: '1 hour',
    hotel_credit: 1000,
    family_members: 4,
    specialist_access: 'Priority',
    ai_features: 'Advanced'
  },
  ELITE: {
    consultations: 'Unlimited',
    response_time: 'Immediate',
    hotel_credit: 5000,
    family_members: 'Unlimited',
    specialist_access: 'VIP',
    ai_features: 'Premium'
  }
} as const;

// Annual discount percentage
const ANNUAL_DISCOUNT = 20;

// Minimum commitment periods (in months)
const COMMITMENT_PERIODS = {
  ESSENTIAL: 6,
  EXECUTIVE: 12,
  ELITE: 12
} as const;