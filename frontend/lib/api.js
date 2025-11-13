const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authAPI = {
  login: (email, password) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  getMe: () => apiCall('/auth/me'),
};

// Admin API
export const adminAPI = {
  getUsers: () => apiCall('/admin/users'),
  createDoctor: (doctorData) => apiCall('/admin/doctors', {
    method: 'POST',
    body: JSON.stringify(doctorData),
  }),
  getDoctors: () => apiCall('/admin/doctors'),
  updateDoctor: (id, data) => apiCall(`/admin/doctors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteDoctor: (id) => apiCall(`/admin/doctors/${id}`, {
    method: 'DELETE',
  }),
  createReceptionist: (data) => apiCall('/admin/receptionists', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  createLabStaff: (data) => apiCall('/admin/lab-staff', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getStats: () => apiCall('/admin/stats'),
  getLogs: (limit) => apiCall(`/admin/logs${limit ? `?limit=${limit}` : ''}`),
};

// Patients API
export const patientsAPI = {
  getAll: () => apiCall('/patients'),
  getById: (id) => apiCall(`/patients/${id}`),
  create: (patientData) => apiCall('/patients', {
    method: 'POST',
    body: JSON.stringify(patientData),
  }),
  search: (query) => apiCall(`/patients/search/${query}`),
};

// Appointments API
export const appointmentsAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/appointments?${query}`);
  },
  getWaiting: () => apiCall('/appointments/waiting'),
  callNext: () => apiCall('/appointments/call-next', {
    method: 'POST',
  }),
  complete: (id) => apiCall(`/appointments/${id}/complete`, {
    method: 'POST',
  }),
  getById: (id) => apiCall(`/appointments/${id}`),
};

// Doctors API
export const doctorsAPI = {
  getAll: () => apiCall('/doctors'),
  getById: (id) => apiCall(`/doctors/${id}`),
};

// Lab API
export const labAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/lab?${query}`);
  },
  upload: (formData) => {
    const token = getToken();
    return fetch(`${API_URL}/lab`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(res => res.json());
  },
  getById: (id) => apiCall(`/lab/${id}`),
};

// Prescriptions API
export const prescriptionsAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/prescriptions?${query}`);
  },
  create: (data) => apiCall('/prescriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getById: (id) => apiCall(`/prescriptions/${id}`),
};

// Medical Records API
export const medicalRecordsAPI = {
  getAll: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiCall(`/medical-records?${query}`);
  },
  create: (formData) => {
    const token = getToken();
    return fetch(`${API_URL}/medical-records`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(res => res.json());
  },
  getById: (id) => apiCall(`/medical-records/${id}`),
};

// Queue API
export const queueAPI = {
  getStatus: () => apiCall('/queue/status'),
};

