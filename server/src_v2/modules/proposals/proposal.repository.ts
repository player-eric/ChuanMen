import type { PrismaClient } from '@prisma/client';

export class ProposalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list() {
    return this.prisma.proposal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        votes: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { votes: true, events: true } },
      },
    });
  }

  getById(id: string) {
    return this.prisma.proposal.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        votes: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        _count: { select: { votes: true } },
      },
    });
  }

  create(input: { title: string; description?: string; authorId: string }) {
    return this.prisma.proposal.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        authorId: input.authorId,
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });
  }

  update(id: string, data: { title?: string; description?: string; status?: string; authorId?: string }) {
    return this.prisma.proposal.update({ where: { id }, data: data as any });
  }

  async toggleVote(proposalId: string, userId: string) {
    const existing = await this.prisma.proposalVote.findUnique({
      where: { proposalId_userId: { proposalId, userId } },
    });
    if (existing) {
      await this.prisma.proposalVote.delete({ where: { id: existing.id } });
      return { voted: false };
    }
    await this.prisma.proposalVote.create({ data: { proposalId, userId } });
    return { voted: true };
  }

  search(keyword: string) {
    return this.prisma.proposal.findMany({
      where: {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        _count: { select: { votes: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.proposal.delete({ where: { id } });
  }
}
