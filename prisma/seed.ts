import { PrismaClient, FoodStatus, PaymentMethod, PaymentStatus, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const HASH = (pw: string) => bcrypt.hashSync(pw, 10);
const PASSWORD = 'Admin1234!';

async function main() {
  console.log('🌱  Seeding database...');

  // ─── 1. Platform Admin ──────────────────────────────────────────────────────

  const platformAdmin = await prisma.userAccount.upsert({
    where: { username: 'admin@platform.com' },
    update: {},
    create: {
      username: 'admin@platform.com',
      password: HASH(PASSWORD),
      role: 'PLATFORM_ADMIN',
      profile: {
        create: {
          firstname: 'Super',
          lastname: 'Admin',
          email: 'admin@platform.com',
          phone: '+233200000000',
        },
      },
    },
  });
  console.log('  ✓ Platform admin:', platformAdmin.username);

  // ─── 2. Restaurant Admin accounts ──────────────────────────────────────────

  const mamaAccount = await prisma.userAccount.upsert({
    where: { username: 'mama@kitchen.com' },
    update: {},
    create: {
      username: 'mama@kitchen.com',
      password: HASH(PASSWORD),
      role: 'RESTAURANT_ADMIN',
      profile: {
        create: {
          firstname: 'Abena',
          lastname: 'Mensah',
          email: 'mama@kitchen.com',
          phone: '+233244111111',
        },
      },
    },
  });

  const spiceAccount = await prisma.userAccount.upsert({
    where: { username: 'spice@house.com' },
    update: {},
    create: {
      username: 'spice@house.com',
      password: HASH(PASSWORD),
      role: 'RESTAURANT_ADMIN',
      profile: {
        create: {
          firstname: 'Kofi',
          lastname: 'Asante',
          email: 'spice@house.com',
          phone: '+233244222222',
        },
      },
    },
  });

  const burgerAccount = await prisma.userAccount.upsert({
    where: { username: 'burger@lab.com' },
    update: {},
    create: {
      username: 'burger@lab.com',
      password: HASH(PASSWORD),
      role: 'RESTAURANT_ADMIN',
      profile: {
        create: {
          firstname: 'Kojo',
          lastname: 'Boateng',
          email: 'burger@lab.com',
          phone: '+233244333333',
        },
      },
    },
  });
  console.log('  ✓ Restaurant admin accounts created');

  // ─── 3. Restaurants ─────────────────────────────────────────────────────────

  const mamaRestaurant = await prisma.restaurant.upsert({
    where: { ownerId: mamaAccount.id },
    update: {},
    create: {
      name: "Mama's Kitchen",
      description: 'Authentic Ghanaian home cooking. Soups, stews, and rice dishes made fresh daily.',
      address: '14 Oxford Street, Osu, Accra',
      latitude: 5.5537,
      longitude: -0.1869,
      phone: '+233302111111',
      email: 'info@mamaskitchen.gh',
      isOpen: true,
      isApproved: true,
      commissionRate: 0.10,
      deliveryFee: 15.00,
      estimatedMinutes: 25,
      ownerId: mamaAccount.id,
      openingHours: {
        create: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '21:00' },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '21:00' },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '21:00' },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '21:00' },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00' },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '22:00' },
          { dayOfWeek: 0, openTime: '10:00', closeTime: '20:00' },
        ],
      },
    },
  });

  const spiceRestaurant = await prisma.restaurant.upsert({
    where: { ownerId: spiceAccount.id },
    update: {},
    create: {
      name: 'The Spice House',
      description: 'West African fusion cuisine with a modern twist. Bold flavours, generous portions.',
      address: '7 Cantonments Road, Accra',
      latitude: 5.5831,
      longitude: -0.1774,
      phone: '+233302222222',
      email: 'hello@spicehouse.gh',
      isOpen: true,
      isApproved: true,
      commissionRate: 0.12,
      deliveryFee: 20.00,
      estimatedMinutes: 35,
      ownerId: spiceAccount.id,
    },
  });

  // Pending approval
  await prisma.restaurant.upsert({
    where: { ownerId: burgerAccount.id },
    update: {},
    create: {
      name: 'Burger Lab',
      description: 'Craft burgers and loaded fries. Coming soon to Accra.',
      address: '22 Ring Road Central, Accra',
      latitude: 5.5707,
      longitude: -0.2060,
      phone: '+233302333333',
      email: 'hi@burgerlab.gh',
      isOpen: false,
      isApproved: false,
      commissionRate: 0.10,
      deliveryFee: 18.00,
      estimatedMinutes: 20,
      ownerId: burgerAccount.id,
    },
  });
  console.log('  ✓ Restaurants created (2 approved, 1 pending)');

  // ─── 4. Categories & Menu (Mama's Kitchen) ───────────────────────────────────

  const mamaSoups = await prisma.foodCategory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Soups',
      description: 'Traditional Ghanaian soups',
      restaurantId: mamaRestaurant.id,
    },
  });

  const mamaRice = await prisma.foodCategory.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Rice Dishes',
      description: 'Jollof, fried rice, and more',
      restaurantId: mamaRestaurant.id,
    },
  });

  const mamaDrinks = await prisma.foodCategory.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Drinks',
      description: 'Cold beverages and fresh juices',
      restaurantId: mamaRestaurant.id,
    },
  });

  // Mama's menu items
  const mamaMenuItems = [
    { name: 'Light Soup with Chicken', price: 45.00, description: 'Spiced tomato broth with whole chicken pieces. Served with fufu.', categoryId: mamaSoups.id, restaurantId: mamaRestaurant.id, isAvailable: true },
    { name: 'Groundnut Soup', price: 50.00, description: 'Rich and creamy groundnut soup with goat meat. Served with banku.', categoryId: mamaSoups.id, restaurantId: mamaRestaurant.id, isAvailable: true },
    { name: 'Palm Nut Soup', price: 55.00, description: 'Classic palm nut soup with assorted fish. Served with eba.', categoryId: mamaSoups.id, restaurantId: mamaRestaurant.id, isAvailable: false },
    { name: 'Jollof Rice (Chicken)', price: 40.00, description: 'Party-style jollof rice with grilled chicken and coleslaw.', categoryId: mamaRice.id, restaurantId: mamaRestaurant.id, isAvailable: true },
    { name: 'Fried Rice with Chicken', price: 38.00, description: 'Ghanaian-style fried rice with vegetables and grilled chicken.', categoryId: mamaRice.id, restaurantId: mamaRestaurant.id, isAvailable: true },
    { name: 'Waakye Special', price: 42.00, description: 'Rice and beans with spaghetti, salad, gari, wele, and stew.', categoryId: mamaRice.id, restaurantId: mamaRestaurant.id, isAvailable: true },
    { name: 'Malta Drink', price: 8.00, description: 'Chilled Malta Guinness.', categoryId: mamaDrinks.id, restaurantId: mamaRestaurant.id, isAvailable: true },
    { name: 'Fresh Coconut Water', price: 12.00, description: 'Freshly sourced coconut water, served cold.', categoryId: mamaDrinks.id, restaurantId: mamaRestaurant.id, isAvailable: true },
  ];

  const createdMamaMenu: { id: number; name: string }[] = [];
  for (const item of mamaMenuItems) {
    const existing = await prisma.foodMenu.findFirst({ where: { name: item.name, restaurantId: item.restaurantId } });
    if (!existing) {
      const created = await prisma.foodMenu.create({ data: item });
      createdMamaMenu.push(created);
    } else {
      createdMamaMenu.push(existing);
    }
  }

  // ─── 5. Categories & Menu (The Spice House) ─────────────────────────────────

  const spiceStarters = await prisma.foodCategory.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Starters',
      description: 'Appetizers and small plates',
      restaurantId: spiceRestaurant.id,
    },
  });

  const spiceMains = await prisma.foodCategory.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: 'Mains',
      description: 'Hearty main courses',
      restaurantId: spiceRestaurant.id,
    },
  });

  const spiceSides = await prisma.foodCategory.upsert({
    where: { id: 6 },
    update: {},
    create: {
      name: 'Sides',
      description: 'Side dishes and extras',
      restaurantId: spiceRestaurant.id,
    },
  });

  const spiceMenuItems = [
    { name: 'Kelewele', price: 20.00, description: 'Spiced fried plantain cubes with roasted peanuts.', categoryId: spiceStarters.id, restaurantId: spiceRestaurant.id, isAvailable: true },
    { name: 'Grilled Tilapia', price: 85.00, description: 'Whole tilapia grilled over charcoal with pepper sauce and boiled yam.', categoryId: spiceMains.id, restaurantId: spiceRestaurant.id, isAvailable: true },
    { name: 'Chicken Ofam', price: 75.00, description: 'Slow-cooked chicken in rich palm oil sauce with garden eggs. Served with rice.', categoryId: spiceMains.id, restaurantId: spiceRestaurant.id, isAvailable: true },
    { name: 'Kontomire Stew', price: 35.00, description: 'Cocoyam leaves stew with smoked fish and palava sauce.', categoryId: spiceMains.id, restaurantId: spiceRestaurant.id, isAvailable: true },
    { name: 'Fried Plantain', price: 15.00, description: 'Sweet ripe plantain, pan-fried to perfection.', categoryId: spiceSides.id, restaurantId: spiceRestaurant.id, isAvailable: true },
    { name: 'Boiled Yam', price: 12.00, description: 'Plain boiled white yam.', categoryId: spiceSides.id, restaurantId: spiceRestaurant.id, isAvailable: true },
  ];

  const createdSpiceMenu: { id: number; name: string }[] = [];
  for (const item of spiceMenuItems) {
    const existing = await prisma.foodMenu.findFirst({ where: { name: item.name, restaurantId: item.restaurantId } });
    if (!existing) {
      const created = await prisma.foodMenu.create({ data: item });
      createdSpiceMenu.push(created);
    } else {
      createdSpiceMenu.push(existing);
    }
  }

  console.log('  ✓ Categories and menu items created');

  // ─── 6. Customers ───────────────────────────────────────────────────────────

  const customerAccounts = [
    { username: 'john.doe@email.com', firstname: 'John', lastname: 'Doe', phone: '+233244441111' },
    { username: 'jane.smith@email.com', firstname: 'Jane', lastname: 'Smith', phone: '+233244442222' },
    { username: 'kweku.adjei@email.com', firstname: 'Kweku', lastname: 'Adjei', phone: '+233244443333' },
    { username: 'ama.darko@email.com', firstname: 'Ama', lastname: 'Darko', phone: '+233244444444' },
  ];

  const createdCustomers: { id: number }[] = [];
  for (const ca of customerAccounts) {
    const acct = await prisma.userAccount.upsert({
      where: { username: ca.username },
      update: {},
      create: {
        username: ca.username,
        password: HASH(PASSWORD),
        role: 'CUSTOMER',
        profile: {
          create: { firstname: ca.firstname, lastname: ca.lastname, email: ca.username, phone: ca.phone },
        },
        customer: {
          create: {
            firstName: ca.firstname,
            lastName: ca.lastname,
            phone: ca.phone,
            addresses: {
              create: {
                label: 'Home',
                address: `${ca.firstname} Ave, Accra`,
                latitude: 5.5500 + Math.random() * 0.05,
                longitude: -0.2000 + Math.random() * 0.05,
                isDefault: true,
              },
            },
          },
        },
      },
      include: { customer: true },
    });
    if (acct.customer) createdCustomers.push(acct.customer);
  }
  console.log('  ✓ Customers created:', createdCustomers.length);

  // ─── 7. Riders ──────────────────────────────────────────────────────────────

  const riderAccounts = [
    { username: 'kwame.rider@email.com', firstname: 'Kwame', lastname: 'Boateng', phone: '+233244551111', isApproved: true,  vehicle: VehicleType.MOTORCYCLE },
    { username: 'esi.rider@email.com',   firstname: 'Esi',   lastname: 'Mensah',  phone: '+233244552222', isApproved: true,  vehicle: VehicleType.BICYCLE },
    { username: 'yaw.rider@email.com',   firstname: 'Yaw',   lastname: 'Appiah',  phone: '+233244553333', isApproved: false, vehicle: VehicleType.MOTORCYCLE },
  ];

  const createdRiders: { id: number }[] = [];
  for (const ra of riderAccounts) {
    const acct = await prisma.userAccount.upsert({
      where: { username: ra.username },
      update: {},
      create: {
        username: ra.username,
        password: HASH(PASSWORD),
        role: 'RIDER',
        profile: {
          create: { firstname: ra.firstname, lastname: ra.lastname, email: ra.username, phone: ra.phone },
        },
        rider: {
          create: {
            firstName: ra.firstname,
            lastName: ra.lastname,
            phone: ra.phone,
            vehicleType: ra.vehicle,
            isApproved: ra.isApproved,
            isAvailable: ra.isApproved,
            currentLat: 5.56,
            currentLng: -0.20,
          },
        },
      },
      include: { rider: true },
    });
    if (acct.rider) createdRiders.push(acct.rider);
  }
  console.log('  ✓ Riders created:', createdRiders.length);

  // ─── 8. Orders ──────────────────────────────────────────────────────────────
  // Only create orders if customers and addresses exist

  if (createdCustomers.length === 0) {
    console.log('  ⚠ Skipping orders — customers were pre-existing, re-run on a fresh DB to seed orders');
    return;
  }

  const jollofItem = createdMamaMenu.find(m => m.name.startsWith('Jollof'));
  const friedRiceItem = createdMamaMenu.find(m => m.name.startsWith('Fried Rice'));
  const maltaItem = createdMamaMenu.find(m => m.name.startsWith('Malta'));
  const tilapiaItem = createdSpiceMenu.find(m => m.name.startsWith('Grilled'));
  const keleweleItem = createdSpiceMenu.find(m => m.name.startsWith('Kelewele'));
  const friedPlantainItem = createdSpiceMenu.find(m => m.name.startsWith('Fried Plantain'));

  // Fetch addresses for order placement
  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: { in: createdCustomers.map(c => c.id) } },
  });
  const addrFor = (customerId: number) => addresses.find(a => a.customerId === customerId)!;

  type OrderSeed = {
    restaurantId: number;
    customerId: number;
    deliveryAddressId: number;
    totalAmount: number;
    deliveryFee: number;
    platformFee: number;
    restaurantPayout: number;
    foodStatus: FoodStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    note?: string;
    items: { foodMenuId: number; quantity: number; price: number }[];
  };

  const orderSeeds: OrderSeed[] = [
    // Delivered, paid via Paystack
    {
      restaurantId: mamaRestaurant.id,
      customerId: createdCustomers[0].id,
      deliveryAddressId: addrFor(createdCustomers[0].id).id,
      totalAmount: 95.00,
      deliveryFee: 15.00,
      platformFee: 8.00,
      restaurantPayout: 72.00,
      foodStatus: 'DELIVERED',
      paymentMethod: 'PAYSTACK',
      paymentStatus: 'PAID',
      items: [
        { foodMenuId: jollofItem!.id,    quantity: 2, price: 40.00 },
        { foodMenuId: maltaItem!.id,     quantity: 1, price: 8.00  },
      ],
    },
    // Preparing, paid via Paystack
    {
      restaurantId: mamaRestaurant.id,
      customerId: createdCustomers[1].id,
      deliveryAddressId: addrFor(createdCustomers[1].id).id,
      totalAmount: 68.00,
      deliveryFee: 15.00,
      platformFee: 5.80,
      restaurantPayout: 47.20,
      foodStatus: 'PREPARING',
      paymentMethod: 'PAYSTACK',
      paymentStatus: 'PAID',
      note: 'Extra pepper please',
      items: [
        { foodMenuId: friedRiceItem!.id, quantity: 1, price: 38.00 },
        { foodMenuId: maltaItem!.id,     quantity: 2, price: 8.00  },
      ],
    },
    // Pending, COD
    {
      restaurantId: mamaRestaurant.id,
      customerId: createdCustomers[2].id,
      deliveryAddressId: addrFor(createdCustomers[2].id).id,
      totalAmount: 57.00,
      deliveryFee: 15.00,
      platformFee: 4.20,
      restaurantPayout: 37.80,
      foodStatus: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'COD_PENDING',
      items: [
        { foodMenuId: jollofItem!.id, quantity: 1, price: 40.00 },
      ],
    },
    // Accepted, Paystack
    {
      restaurantId: spiceRestaurant.id,
      customerId: createdCustomers[0].id,
      deliveryAddressId: addrFor(createdCustomers[0].id).id,
      totalAmount: 120.00,
      deliveryFee: 20.00,
      platformFee: 10.00,
      restaurantPayout: 90.00,
      foodStatus: 'ACCEPTED',
      paymentMethod: 'PAYSTACK',
      paymentStatus: 'PAID',
      items: [
        { foodMenuId: tilapiaItem!.id,    quantity: 1, price: 85.00 },
        { foodMenuId: keleweleItem!.id,   quantity: 1, price: 20.00 },
      ],
    },
    // Delivered, COD
    {
      restaurantId: spiceRestaurant.id,
      customerId: createdCustomers[3].id,
      deliveryAddressId: addrFor(createdCustomers[3].id).id,
      totalAmount: 55.00,
      deliveryFee: 20.00,
      platformFee: 4.20,
      restaurantPayout: 30.80,
      foodStatus: 'DELIVERED',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentStatus: 'PAID',
      items: [
        { foodMenuId: keleweleItem!.id,       quantity: 1, price: 20.00 },
        { foodMenuId: friedPlantainItem!.id,  quantity: 1, price: 15.00 },
      ],
    },
    // Cancelled, Paystack, refunded
    {
      restaurantId: mamaRestaurant.id,
      customerId: createdCustomers[1].id,
      deliveryAddressId: addrFor(createdCustomers[1].id).id,
      totalAmount: 58.00,
      deliveryFee: 15.00,
      platformFee: 4.30,
      restaurantPayout: 0,
      foodStatus: 'CANCELLED',
      paymentMethod: 'PAYSTACK',
      paymentStatus: 'REFUNDED',
      note: 'Customer cancelled',
      items: [
        { foodMenuId: jollofItem!.id, quantity: 1, price: 40.00 },
      ],
    },
    // Ready for pickup (today)
    {
      restaurantId: mamaRestaurant.id,
      customerId: createdCustomers[3].id,
      deliveryAddressId: addrFor(createdCustomers[3].id).id,
      totalAmount: 80.00,
      deliveryFee: 15.00,
      platformFee: 6.50,
      restaurantPayout: 58.50,
      foodStatus: 'READY',
      paymentMethod: 'PAYSTACK',
      paymentStatus: 'PAID',
      items: [
        { foodMenuId: friedRiceItem!.id, quantity: 2, price: 38.00 },
      ],
    },
  ];

  for (const seed of orderSeeds) {
    const { items, ...orderData } = seed;
    await prisma.order.create({
      data: {
        ...orderData,
        orderItems: { create: items },
      },
    });
  }
  console.log('  ✓ Orders created:', orderSeeds.length);

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log('\n✅  Seed complete!\n');
  console.log('  Credentials (all use password: Admin1234!):');
  console.log('  ┌──────────────────────────────────────┬──────────────────────┐');
  console.log('  │ Username                              │ Role                 │');
  console.log('  ├──────────────────────────────────────┼──────────────────────┤');
  console.log('  │ admin@platform.com                   │ PLATFORM_ADMIN       │');
  console.log('  │ mama@kitchen.com                     │ RESTAURANT_ADMIN     │');
  console.log('  │ spice@house.com                      │ RESTAURANT_ADMIN     │');
  console.log('  │ burger@lab.com                       │ RESTAURANT_ADMIN (!) │');
  console.log('  │ john.doe@email.com                   │ CUSTOMER             │');
  console.log('  │ jane.smith@email.com                 │ CUSTOMER             │');
  console.log('  │ kweku.adjei@email.com                │ CUSTOMER             │');
  console.log('  │ ama.darko@email.com                  │ CUSTOMER             │');
  console.log('  │ kwame.rider@email.com                │ RIDER (approved)     │');
  console.log('  │ esi.rider@email.com                  │ RIDER (approved)     │');
  console.log('  │ yaw.rider@email.com                  │ RIDER (pending)      │');
  console.log('  └──────────────────────────────────────┴──────────────────────┘');
  console.log('  (!) burger@lab.com restaurant is pending approval\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
