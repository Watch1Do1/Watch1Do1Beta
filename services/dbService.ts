
import type { Video, User, Product, ProjectInsights, VideoStatus, AppEvent, Purchase, SubscriptionStatus } from '../types.js';

/**
 * PRODUCTION DB SERVICE
 * Securely communicates with the Express backend.
 * Database keys are now hidden on the server.
 */

const getLocal = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(`w1d1_${key}`);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error(`[DB Service] Error reading ${key} from local storage:`, e);
        return [];
    }
};

const setLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(`w1d1_${key}`, JSON.stringify(data));
    } catch (e) {
        console.error(`[DB Service] Error writing ${key} to local storage:`, e);
    }
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
        const response = await fetch(url, {
            ...init,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            console.warn(`[API Service] Request failed for ${url}:`, response.status);
            return null;
        }
        return await response.json();
    } catch (e) {
        clearTimeout(timeoutId);
        console.error(`[API Service] Fetch Error for ${url}:`, e);
        return null;
    }
}

export const dbService = {
  async getAllVideos(): Promise<Video[]> {
    const data = await apiFetch<Video[]>('/api/videos');
    if (data) return data;
    return getLocal<Video>('videos');
  },

  async logEvent(event: Omit<AppEvent, 'id' | 'timestamp'>): Promise<void> {
      const newEvent: AppEvent = {
          ...event,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString()
      };
      const events = getLocal<AppEvent>('events');
      setLocal('events', [newEvent, ...events].slice(0, 1000));

      await apiFetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent),
      });
  },

  async getEvents(): Promise<AppEvent[]> {
      const data = await apiFetch<AppEvent[]>('/api/events');
      if (data) return data;
      return getLocal<AppEvent>('events');
  },

  async getAllPurchases(): Promise<Purchase[]> {
      const data = await apiFetch<Purchase[]>('/api/purchases');
      if (data) return data;
      
      // Fallback to legacy scan if API fails
      const users = await this.getAllUsers();
      return users.flatMap(u => u.purchaseHistory || []);
  },

  async getAllUsers(): Promise<User[]> {
      const data = await apiFetch<User[]>('/api/admin/users');
      return data || [];
  },

  async incrementVideoStat(videoId: number, stat: 'views' | 'clicks' | 'addToKitCount' | 'ratingCount' | 'activeBuilders'): Promise<void> {
    const local = getLocal<Video>('videos');
    setLocal('videos', local.map(v => Number(v.id) === Number(videoId) ? {
        ...v,
        ...(stat === 'ratingCount' || stat === 'activeBuilders' 
            ? { [stat]: (v[stat] || 0) + 1 } 
            : { stats: { ...v.stats, [stat]: (v.stats?.[stat] || 0) + 1 } })
    } : v));

    const updateKey = (stat === 'ratingCount' || stat === 'activeBuilders') ? stat : `stats.${stat}`;
    await apiFetch(`/api/videos/${videoId}/increment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: updateKey })
    });
  },

  async insertVideo(video: Video): Promise<boolean> {
    const local = getLocal<Video>('videos');
    setLocal('videos', [video, ...local]);

    const res = await apiFetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video),
    });
    return !!res;
  },

  async deleteVideo(videoId: number): Promise<boolean> {
    const local = getLocal<Video>('videos');
    setLocal('videos', local.filter(v => Number(v.id) !== Number(videoId)));

    const res = await apiFetch(`/api/videos/${videoId}`, {
      method: 'DELETE'
    });
    return !!res;
  },

  async updateVideoStatus(
      videoId: number, 
      status: VideoStatus, 
      products?: Product[], 
      complementary?: Product[],
      insights?: ProjectInsights,
      title?: string
  ): Promise<boolean> {
    const local = getLocal<Video>('videos');
    setLocal('videos', local.map(v => Number(v.id) === Number(videoId) ? {
        ...v,
        status,
        ...(products && { products }),
        ...(complementary && { complementaryProducts: complementary }),
        ...(insights && { insights }),
        ...(title && { title })
    } : v));

    const res = await apiFetch(`/api/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status,
            ...(products && { products }),
            ...(complementary && { complementaryProducts: complementary }),
            ...(insights && { insights }),
            ...(title && { title })
        }),
    });
    return !!res;
  },

  async updateSubscription(email: string, status: SubscriptionStatus): Promise<boolean> {
    const res = await apiFetch('/api/users/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status })
    });
    return !!res;
  },

  // Public creator card for a video (display name, handle, tip info). Never includes the creator's email.
  async getVideoCreator(videoId: number): Promise<Partial<User> | null> {
    return apiFetch<Partial<User>>(`/api/videos/${videoId}/creator`);
  },

  async getUser(email: string): Promise<User | null> {
    const data = await apiFetch<User>(`/api/users/${encodeURIComponent(email)}`);
    return data || null;
  },

  async upsertUser(user: Partial<User>): Promise<User | null> {
    const response = await fetch('/api/users/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error || "Failed to save maker profile.";
        throw new Error(errMsg);
    }

    const res = await response.json().catch(() => null);
    return res?.user || null;
  },

  async adminUpdateUser(email: string, updates: Partial<User>): Promise<boolean> {
    const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, updates }),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error || "Failed to update user.";
        throw new Error(errMsg);
    }

    return true;
  },

  async submitReport(report: any): Promise<boolean> {
    const res = await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
    });
    return !!res;
  },

  async getReports(): Promise<any[]> {
    const data = await apiFetch<any[]>('/api/admin/reports');
    return data || [];
  },

  async resolveReport(reportId: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
    });
    return !!res;
  },

  async getAuditTrail(): Promise<any[]> {
    const data = await apiFetch<any[]>('/api/admin/audit-logs');
    return data || [];
  },

  async getSystemStatus(): Promise<any> {
    const data = await apiFetch<any>('/api/admin/system-status');
    return data || { db: 'disconnected', server: 'unknown', uptime: 0 };
  }
};
