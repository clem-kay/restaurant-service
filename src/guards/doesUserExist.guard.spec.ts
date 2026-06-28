import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { DoesUserExist } from './doesUserExist.guard';
import { UseraccountService } from 'src/useraccount/useraccount.service';

const makeContext = (body: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body }),
    }),
  } as unknown as ExecutionContext);

describe('DoesUserExist', () => {
  let guard: DoesUserExist;
  const mockUserService = {
    findOneByUsername: jest.fn(),
  } as unknown as UseraccountService;

  beforeEach(() => {
    guard = new DoesUserExist(mockUserService);
    jest.clearAllMocks();
  });

  it('throws BadRequestException when username already exists', async () => {
    (mockUserService.findOneByUsername as jest.Mock).mockResolvedValue({ id: 1, username: 'admin' });
    const ctx = makeContext({ username: 'Admin' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
    expect(mockUserService.findOneByUsername).toHaveBeenCalledWith('admin');
  });

  it('returns true when username does not exist', async () => {
    (mockUserService.findOneByUsername as jest.Mock).mockResolvedValue(null);
    const ctx = makeContext({ username: 'NewUser' });

    const result = await guard.canActivate(ctx);

    expect(mockUserService.findOneByUsername).toHaveBeenCalledWith('newuser');
    expect(result).toBe(true);
  });

  describe('validateRequest', () => {
    it('throws BadRequestException when user found', async () => {
      (mockUserService.findOneByUsername as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(guard.validateRequest({ body: { username: 'exists' } } as any))
        .rejects.toThrow(new BadRequestException('This Username already exist'));
    });

    it('returns true when user not found', async () => {
      (mockUserService.findOneByUsername as jest.Mock).mockResolvedValue(null);

      const result = await guard.validateRequest({ body: { username: 'newuser' } } as any);
      expect(result).toBe(true);
    });
  });
});
