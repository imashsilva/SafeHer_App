import type { AppData } from "./types";

export const initialData: AppData = {
  appointments: [
    {
      id: "SH-1048",
      service: "Legal consultation",
      professional: "A verified professional will be assigned",
      date: "2026-11-14",
      time: "10:30",
      format: "Online",
      status: "Requested",
      createdAt: "2026-11-10T08:00:00.000Z",
    },
    {
      id: "SH-1032",
      service: "Psychosocial support",
      professional: "A verified professional will be assigned",
      date: "2026-11-18",
      time: "14:00",
      format: "Online",
      status: "Confirmed",
      createdAt: "2026-11-09T08:00:00.000Z",
    },
  ],
  credits: [
    { id: "CR-01", sponsor: "Community Support Fund", amount: 2500, purpose: "Legal consultation", remaining: 2500 },
    { id: "CR-02", sponsor: "Women’s Wellbeing Initiative", amount: 1800, purpose: "Psychosocial support", remaining: 1200 },
  ],
  privacy: { shareAnonymousInsights: false, emailUpdates: true },
};

export const services = [
  {
    title: "Legal support",
    description: "Understand your options and request a confidential consultation with a legal professional.",
    icon: "scale" as const,
    tag: "Legal guidance",
  },
  {
    title: "Psychosocial support",
    description: "Connect with a counsellor or trained support professional for a supportive conversation.",
    icon: "heart-handshake" as const,
    tag: "Emotional wellbeing",
  },
  {
    title: "Community support",
    description: "Explore trusted organisations, practical assistance and referral pathways.",
    icon: "users" as const,
    tag: "Practical help",
  },
];

export const resources = [
  { category: "Know your options", title: "Preparing for a legal consultation", description: "A simple guide to organising questions and information before speaking with a legal professional.", read: "5 min read" },
  { category: "Wellbeing", title: "Finding the right kind of support", description: "Learn about different forms of psychosocial support and what to expect from an initial conversation.", read: "4 min read" },
  { category: "Privacy", title: "Your privacy on SafeHer", description: "Understand what a prototype can and cannot protect, and how information should be handled.", read: "3 min read" },
  { category: "Getting started", title: "Using sponsored support credits", description: "An overview of how sponsored credits may help cover eligible support services.", read: "4 min read" },
];
