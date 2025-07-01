export interface User {
  id: string;
  name: string;
  email: string;
  points: number;
}

export interface Order {
  id: string;
  userId: string;
  ordernumber: string;
}
