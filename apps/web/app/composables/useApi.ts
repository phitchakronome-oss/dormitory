export const useApi = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase || 'http://localhost:4000/api';

  const request = async <T>(path: string, options: any = {}): Promise<T> => {
    try {
      return await $fetch<T>(`${apiBase}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
    } catch (err: any) {
      console.error(`API Error on ${path}:`, err);
      throw err;
    }
  };

  return {
    // Dashboard Stats
    getDashboardStats: () => request<any>('/rooms/dashboard/stats'),

    // Buildings & Rooms
    getBuildings: () => request<any[]>('/rooms/buildings'),
    createBuilding: (data: any) => request<any>('/rooms/buildings', { method: 'POST', body: data }),
    getRooms: (params?: { buildingId?: string; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.buildingId) query.append('buildingId', params.buildingId);
      if (params?.status) query.append('status', params.status);
      const queryString = query.toString() ? `?${query.toString()}` : '';
      return request<any[]>(`/rooms${queryString}`);
    },
    getRoomById: (id: string) => request<any>(`/rooms/${id}`),
    createRoom: (data: any) => request<any>('/rooms', { method: 'POST', body: data }),
    updateRoom: (id: string, data: any) => request<any>(`/rooms/${id}`, { method: 'PUT', body: data }),
    deleteRoom: (id: string) => request<any>(`/rooms/${id}`, { method: 'DELETE' }),

    // Tenants & Contracts
    getTenants: () => request<any[]>('/tenants'),
    getTenantById: (id: string) => request<any>(`/tenants/${id}`),
    createTenant: (data: any) => request<any>('/tenants', { method: 'POST', body: data }),
    updateTenant: (id: string, data: any) => request<any>(`/tenants/${id}`, { method: 'PUT', body: data }),
    deleteTenant: (id: string) => request<any>(`/tenants/${id}`, { method: 'DELETE' }),
    getAllContracts: (status?: string) => {
      const qs = status ? `?status=${status}` : '';
      return request<any[]>(`/tenants/contracts/all${qs}`);
    },
    createContract: (data: any) => request<any>('/tenants/contracts', { method: 'POST', body: data }),
    updateContract: (id: string, data: any) => request<any>(`/tenants/contracts/${id}`, { method: 'PUT', body: data }),

    // Meters
    getMeterReadings: (month: string, buildingId?: string) => {
      const query = new URLSearchParams({ month });
      if (buildingId) query.append('buildingId', buildingId);
      return request<any[]>(`/meters?${query.toString()}`);
    },
    recordMeter: (data: any) => request<any>('/meters', { method: 'POST', body: data }),
    batchRecordMeters: (data: any) => request<any>('/meters/batch', { method: 'POST', body: data }),

    // Invoices
    getInvoices: (month?: string, status?: string) => {
      const query = new URLSearchParams();
      if (month) query.append('month', month);
      if (status) query.append('status', status);
      const qs = query.toString() ? `?${query.toString()}` : '';
      return request<any[]>(`/invoices${qs}`);
    },
    getInvoiceById: (id: string) => request<any>(`/invoices/${id}`),
    generateInvoices: (data: any) => request<any>('/invoices/generate', { method: 'POST', body: data }),
    updateInvoiceStatus: (id: string, data: any) => request<any>(`/invoices/${id}/status`, { method: 'PUT', body: data }),
    recordPayment: (data: any) => request<any>('/invoices/payments', { method: 'POST', body: data })
  };
};
