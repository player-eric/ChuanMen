import type { PrismaClient } from '@prisma/client';

export class TaskPresetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.taskPreset.findMany({ orderBy: { tag: 'asc' } });
  }

  getByTag(tag: string) {
    return this.prisma.taskPreset.findUnique({ where: { tag } });
  }

  create(data: { tag: string; roles: string[] }) {
    return this.prisma.taskPreset.create({ data });
  }

  update(id: string, data: { tag?: string; roles?: string[] }) {
    return this.prisma.taskPreset.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.taskPreset.delete({ where: { id } });
  }
}
