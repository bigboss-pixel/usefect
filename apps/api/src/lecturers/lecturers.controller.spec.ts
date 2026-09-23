import { Test, TestingModule } from '@nestjs/testing';
import { LecturersController } from './lecturers.controller.js';
import { LecturersService } from './lecturers.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('LecturersController', () => {
  let controller: LecturersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LecturersController],
      providers: [
        {
          provide: LecturersService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<LecturersController>(LecturersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
