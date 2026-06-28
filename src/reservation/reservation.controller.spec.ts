import { Test, TestingModule } from '@nestjs/testing';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { CreateReservationDto, UpdateReservationDto } from './dto/create-reservation.dto';

const mockReservationService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('ReservationController', () => {
  let controller: ReservationController;
  let service: typeof mockReservationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: mockReservationService,
        },
      ],
    }).compile();

    controller = module.get<ReservationController>(ReservationController);
    service = module.get(ReservationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with the dto and return the result', () => {
      const dto: CreateReservationDto = {
        name: 'John Doe',
        date: '2025-12-25',
        time: '19:00',
        numberOfGuests: 4,
        phone: '+233244000000',
      };
      const expected = { id: 1, ...dto };
      service.create.mockReturnValue(expected);

      const result = controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should log "New reservation from <name>" when create is called', () => {
      const dto: CreateReservationDto = {
        name: 'Jane Doe',
        date: '2025-12-26',
        time: '20:00',
        numberOfGuests: 2,
        phone: '+233244111111',
      };
      service.create.mockReturnValue({ id: 2, ...dto });

      const logSpy = jest.spyOn((controller as any).logger, 'log');

      controller.create(dto);

      expect(logSpy).toHaveBeenCalledWith(`New reservation from ${dto.name}`);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return the result', () => {
      const expected = [
        { id: 1, name: 'John Doe', date: '2025-12-25', time: '19:00', numberOfGuests: 4, phone: '+233244000000' },
      ];
      service.findAll.mockReturnValue(expected);

      const result = controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with a numeric id and return the result', () => {
      const expected = { id: 1, name: 'John Doe', date: '2025-12-25', time: '19:00', numberOfGuests: 4, phone: '+233244000000' };
      service.findOne.mockReturnValue(expected);

      const result = controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('should call service.update with a numeric id and the dto and return the result', () => {
      const dto: UpdateReservationDto = { numberOfGuests: 6 };
      const expected = { id: 1, name: 'John Doe', date: '2025-12-25', time: '19:00', numberOfGuests: 6, phone: '+233244000000' };
      service.update.mockReturnValue(expected);

      const result = controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('remove', () => {
    it('should call service.remove with a numeric id and return the result', () => {
      service.remove.mockReturnValue(undefined);

      const result = controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });
  });
});
