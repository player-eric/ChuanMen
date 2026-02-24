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
}
