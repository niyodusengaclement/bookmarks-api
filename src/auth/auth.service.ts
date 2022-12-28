import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  async signup(dto: AuthDto) {
    const hash = await argon.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          ...dto,
          email: dto.email,
          hash,
        },
        select: {
          id: true,
          email: true,
        },
      });
      return {
        user,
        message:
          'You have signed up successfully',
      };
    } catch (error) {
      if (
        error instanceof
        PrismaClientKnownRequestError
      ) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Credentials has been taken already',
          );
        }
      }
      throw error;
    }
  }

  async signin(dto: AuthDto) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });
    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }
    const hashMatch = await argon.verify(
      user.hash,
      dto.password,
    );
    if (!hashMatch) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }
    const token = await this.generateToken(
      user.id,
      user.email,
    );
    return {
      status: 200,
      token,
      message: 'You have logged in successfully',
    };
  }

  async generateToken(
    userId: number,
    email: string,
  ): Promise<string> {
    const payload = {
      userId,
      email,
    };
    return await this.jwt.signAsync(payload, {
      expiresIn: '1d',
      privateKey: this.config.get('JWT_SECRET'),
    });
  }
}
