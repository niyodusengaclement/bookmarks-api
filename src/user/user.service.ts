import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: number) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          hash: false,
          firstName: true,
          lastName: true,
          email: true,
        },
      });
    if (user) return user;
    else
      return {
        status: 404,
        message: 'User not found',
      };
  }
}
