import { Test, TestingModule } from '@nestjs/testing';
import { BookCopiesController } from './book-copies.controller.js';

describe('BookCopiesController', () => {
  let controller: BookCopiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookCopiesController],
    }).compile();

    controller = module.get<BookCopiesController>(BookCopiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
