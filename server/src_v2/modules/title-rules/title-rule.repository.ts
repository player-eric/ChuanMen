import type { PrismaClient } from '@prisma/client';

export class TitleRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.titleRule.findMany({ orderBy: { name: 'asc' } });
  }

  getById(id: string) {
    return this.prisma.titleRule.findUnique({ where: { id } });
  }

  create(data: { emoji: string; name: string; description: string; stampEmoji: string; threshold: number }) {
    return this.prisma.titleRule.create({ data });
  }

  update(id: string, data: { emoji?: string; name?: string; description?: string; stampEmoji?: string; threshold?: number }) {
    return this.prisma.titleRule.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.titleRule.delete({ where: { id } });
  }

  /** Count how many users hold each title */
  async holdersCount() {
    const rows = await this.prisma.userSocialTitle.groupBy({
      by: ['value'],
      _count: { value: true },
    });
    const map: Record<string, number> = {};
    for (const r of rows) map[r.value] = r._count.value;
    return map;
  }

  /** List members with their social titles */
  listMembersWithTitles() {
    return this.prisma.user.findMany({
      where: { userStatus: 'approved' },
      select: {
        id: true,
        name: true,
        avatar: true,
        socialTitles: { select: { id: true, value: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Grant a social title to a user */
  grantTitle(userId: string, value: string) {
    return this.prisma.userSocialTitle.create({
      data: { userId, value },
    });
  }

  /** Revoke a social title from a user */
  revokeTitle(userId: string, value: string) {
    return this.prisma.userSocialTitle.delete({
      where: { userId_value: { userId, value } },
    });
  }
}
