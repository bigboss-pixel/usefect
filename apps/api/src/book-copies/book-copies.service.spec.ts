import { Test, TestingModule } from '@nestjs/testing';
import { BookCopiesService } from './book-copies.service.js';

describe('BookCopiesService', () => {
  let service: BookCopiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookCopiesService],
    }).compile();

    service = module.get<BookCopiesService>(BookCopiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
