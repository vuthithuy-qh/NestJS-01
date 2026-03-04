

export class CartItemResponseDto {
    id: number;
    catSpecId: number;
    sku: string;
    catName: string;
    catImage: string;
    categoryId: number;
    price: number;           // original price
    discountedPrice: number; // price after promotion (= price if no promo)
    qty: number;
    subTotal: number;        // discountedPrice * qty
    promotion?: {
        name: string;
        discountType: string;
        discountRate: number;
        discountAmount: number;
    } | null;
}

export class CartResponseDto {
    id: number;

    userId: number;

    items: CartItemResponseDto[];

    totalItems: number;

    totalAmount: number;     // sum of discounted subTotals

    totalDiscount: number;   // total saved

    createdAt: Date;

    updatedAt: Date;
}