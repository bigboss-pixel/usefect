import { Test, TestingModule } from '@nestjs/testing';
import { BookCopiesController } from './book-copies.controller.js';
import { BookCopiesService } from './book-copies.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('BookCopiesController', () => {
  let controller: BookCopiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookCopiesController],
      providers: [
        {
          provide: BookCopiesService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<BookCopiesController>(BookCopiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
