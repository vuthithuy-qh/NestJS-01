

export class CartItemResponseDto {
    id: number;
    catSpecId: number;
    sku: string;
    price: number;
    qty: number;
    catName: string;
    catImage: string;
    subTotal: number
}

export class CartResponseDto {
    id: number;

    userId: number;

    items: CartItemResponseDto[];

    totalItems: number;

    totalAmount: number;

    createdAt: Date;

    updatedAt: Date;
}