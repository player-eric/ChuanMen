import type { AboutRepository } from './about.repository.js';

export class AboutService {
  constructor(private readonly repository: AboutRepository) {}

  getStats() {
    return this.repository.getStats();
  }

  getContent(type: string) {
    return this.repository.getContent(type);
  }

  getAnnouncement(id: string) {
    return this.repository.getAnnouncement(id);
  }

  listAnnouncements() {
    return this.repository.listAnnouncements();
  }

  listAnnouncementsAdmin() {
    return this.repository.listAnnouncementsAdmin();
  }

  createAnnouncement(data: { title: string; body: string; url?: string; type: string; pinned: boolean; authorId: string }) {
    return this.repository.createAnnouncement(data);
  }

  updateAnnouncement(id: string, data: { title?: string; body?: string; url?: string; type?: string; pinned?: boolean }) {
    return this.repository.updateAnnouncement(id, data);
  }

  deleteAnnouncement(id: string) {
    return this.repository.deleteAnnouncement(id);
  }

  upsertContent(type: string, data: { title: string; content: string }) {
    return this.repository.upsertContent(type, data);
  }

  listAllContent() {
    return this.repository.listAllContent();
  }
}
