import api from './api';

export const usersService = {
  async getUser(uid) {
    try {
      const res = await api.get(`/users/${uid}`);
      return res.data;
    } catch (e) {
      return null;
    }
  },
  async createUser(uid, data) {
    return api.post('/users', { id: uid, ...data });
  },
  async updateUser(uid, data) {
    return api.put(`/users/${uid}`, data);
  }
};

export const jobsService = {
  async getJobs(params = {}) {
    const res = await api.get('/jobs', { params });
    return res.data;
  },
  async getPublicJobs(filters = {}, pageSize = 20, lastDoc = null) {
    try {
      const params = {
        status: 'active',
        limit: pageSize
      };
      if (filters?.department) params.department = filters.department;
      if (filters?.employmentType) params.employmentType = filters.employmentType;
      if (filters?.search) params.search = filters.search;

      const res = await api.get('/jobs', { params });
      const jobs = res.data.jobs || [];
      return {
        jobs,
        total: res.data.pagination?.total ?? jobs.length,
        lastDoc: null
      };
    } catch (e) {
      console.error('getPublicJobs error:', e);
      return { jobs: [], total: 0, lastDoc: null };
    }
  },
  async getJob(id) {
    const res = await api.get(`/jobs/${id}`);
    return res.data;
  },
  async createJob(data) {
    return api.post('/jobs', data);
  },
  async updateJob(id, data) {
    return api.put(`/jobs/${id}`, data);
  },
  async deleteJob(id) {
    return api.delete(`/jobs/${id}`);
  },
  async getDepartments() {
    try {
      const res = await api.get('/jobs/departments');
      return res.data || [];
    } catch (e) {
      console.error('getDepartments error:', e);
      return [];
    }
  }
};

export const resumesService = {
  async getResume(uid) {
    try {
      const res = await api.get('/resumes/my');
      return res.data;
    } catch (e) {
      return null;
    }
  },
  async saveResume(uid, data) {
    return api.post('/resumes', data);
  },
  async createResume(data) {
    return api.post('/resumes', data);
  },
  async updateResume(id, data) {
    return api.post('/resumes', data);
  }
};

export const applicationsService = {
  async getUserApplications(uid) {
    try {
      const res = await api.get('/applicants/my');
      return res.data.applications || [];
    } catch (e) {
      console.error('Error fetching user applications:', e);
      return [];
    }
  },
  async hasApplied(uid, jobId) {
    try {
      const res = await api.get('/applicants/my');
      const apps = res.data.applications || [];
      return apps.some(a => 
        (String(a.jobId) === String(jobId) || String(a.job_id) === String(jobId)) && 
        a.status !== 'rejected'
      );
    } catch (e) {
      return false;
    }
  },
  async getApplications(params = {}) {
    try {
      const res = await api.get('/applicants', { params });
      return { applications: res.data.applicants || [] };
    } catch (e) {
      return { applications: [] };
    }
  },
  async getApplication(id) {
    const res = await api.get(`/applicants/${id}`);
    return res.data;
  },
  async submitApplication(data) {
    return api.post('/applicants', data);
  }
};

export const notificationsService = {
  async getNotifications(uid, limit = 50) {
    try {
      const res = await api.get('/notifications');
      return res.data || [];
    } catch (e) {
      return [];
    }
  },
  async getUnreadCount(uid) {
    try {
      const res = await api.get('/notifications/unread-count');
      return res.data?.count || 0;
    } catch (e) {
      return 0;
    }
  },
  async markAsRead(id) {
    try {
      return await api.patch(`/notifications/${id}/read`);
    } catch (e) {
      return null;
    }
  },
  async markAllRead(uid) {
    try {
      return await api.patch('/notifications/read-all');
    } catch (e) {
      return null;
    }
  }
};

export default {
  usersService,
  jobsService,
  resumesService,
  applicationsService,
  notificationsService
};
