export type PageKey = "overview" | "support" | "appointments" | "credits" | "resources" | "settings";
export type AppointmentStatus = "Requested" | "Confirmed" | "Completed" | "Cancelled" | "No-show";

export type Appointment = {
  id: string;
  service: string;
  professional: string;
  date: string;
  time: string;
  format: "Online" | "In person" | "Phone";
  status: AppointmentStatus;
  createdAt: string;
};

export type Credit = {
  id: string;
  sponsor: string;
  amount: number;
  purpose: string;
  remaining: number;
};

export type AppData = {
  appointments: Appointment[];
  credits: Credit[];
  privacy: {
    shareAnonymousInsights: boolean;
    emailUpdates: boolean;
  };
};
