export interface OrderWithFoodCount {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    food_status: string;
    totalAmount: number;
    name: string;
    number: string;
    location: string;
    other_info: string;
    pickup_status: string;
    comment: string;
    paid: boolean;
    totalFoodItems: number;
    email: string;
    orderNumber: string;
  }

  