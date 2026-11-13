import { Body, Controller, Get, Header, Inject, NotFoundException, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { AppService } from './app.service.js';
import { uuidPattern } from './study.js';

const cookieName = 'radpair-browser';

function browserId(request: Request, response: Response) {
  const existing = request.headers.cookie?.split(/;\s*/)
    .find((cookie) => cookie.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (existing && uuidPattern.test(existing)) return existing.toLowerCase();

  const id = randomUUID();
  response.cookie(cookieName, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SECURE_COOKIES !== 'false' && process.env.NODE_ENV === 'production',
    path: '/api/study',
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
  return id;
}

@Controller('study')
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  load(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const id = browserId(request, response);
    const draftId = createHash('sha256').update(`draft:${id}`).digest('hex');
    return { draftId, images: this.appService.studyImages() };
  }

  @Get('report/:id')
  @Header('Cache-Control', 'no-store')
  async report(@Param('id') id: string) {
    if (!uuidPattern.test(id)) throw new NotFoundException('Report not found.');
    const report = await this.appService.load(id);
    if (!report) throw new NotFoundException('Report not found.');
    return { ...report, images: this.appService.studyImages() };
  }

  @Post('report')
  @Header('Cache-Control', 'no-store')
  async save(@Body() body: unknown) {
    const id = randomUUID();
    return { ...await this.appService.save(id, body), id };
  }
}
