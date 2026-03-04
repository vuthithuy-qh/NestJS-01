import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {ShoppingCart} from "./entities/shopping-cart.entity";
import {Repository} from "typeorm";
import {ShoppingCartItem} from "./entities/shopping-cart-item.entity";
import {CatSpec} from "../cats/entities/cat-spec.entity";
import {CartResponseDto} from "./dto/cart-response.dto";
import {PromotionService} from "../promotion/promotion.service";

@Injectable()
export class ShoppingCartService {
  constructor(
      @InjectRepository(ShoppingCart)
      private cartRepository: Repository<ShoppingCart>,
      @InjectRepository(ShoppingCartItem)
      private cartItemRepository: Repository<ShoppingCartItem>,
      @InjectRepository(CatSpec)
      private catSpecRepository: Repository<CatSpec>,
      private readonly promotionService: PromotionService,
  ) {
  }


  async getOrCreateCart(userId: number) : Promise<ShoppingCart> {
      let cart = await this.cartRepository.findOne({
          where: {userId},
          relations: ['items', 'items.catSpec', 'items.catSpec.cat'],
      });

      if(!cart){
          cart = this.cartRepository.create({userId});
          cart = await this.cartRepository.save(cart);
      }

        return cart;
  }

  async getCart(userId: number) : Promise<CartResponseDto> {
      const cart = await this.getOrCreateCart(userId);
      return this.mapToResponseDto(cart);
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto): Promise<CartResponseDto> {
      const {catSpecId, qty} = addToCartDto;
      //validate cat spec exist
      const catSpec = await this.catSpecRepository.findOne({
          where: {id: catSpecId},
          relations: ['cat'],
      });

      if(!catSpec){
          throw new NotFoundException(`Cat spec with id ${catSpecId} not found`);
      }

      //check stock
      if(catSpec.qtyInStock < qty) {
          throw new BadRequestException(`Insufficient stock. Only ${catSpec.qtyInStock} items available.`);
      }


      const cart = await this.getOrCreateCart(userId);

      //check if item already exist in cart
      const existingItem = await this.cartItemRepository.findOne({
          where: { cartId: cart.id, catSpecId },
      });

      if(existingItem) {
          //update quantity
          const newQty = existingItem.qty + qty;

          if(catSpec.qtyInStock < newQty) {
              throw new BadRequestException(`Cannot add ${qty} items. Only ${catSpec.qtyInStock - existingItem.qty} more items can be added.`);
          }

          existingItem.qty = newQty;
          await  this.cartItemRepository.save(existingItem);
      }else  {
            //create new item
          const cartItem = this.cartItemRepository.create({
              cartId: cart.id,
              catSpecId,
              qty,
          });
          await this.cartItemRepository.save(cartItem);
      }

      return this.getCart(userId);
  }

  async updateCartItem(userId: number, itemId: number, updateDto: UpdateCartItemDto) : Promise<CartResponseDto> {
      const cart = await this.getOrCreateCart(userId);

      const item = await this.cartItemRepository.findOne({
          where: {id : itemId, cartId: cart.id},
          relations: ['catSpec'],
      });

      if(!item) {
          throw new NotFoundException(`Cart item with id ${itemId} not found in your cart`);
      }

      //check stock
      if(item.catSpec.qtyInStock < updateDto.qty) {
          throw new BadRequestException(`Insufficient stock. Only ${item.catSpec.qtyInStock} items available.`);
      }

      item.qty = updateDto.qty;

      await this.cartItemRepository.save(item);

      return this.getCart(userId);
  }

  async removeCartItem (userId: number, itemId: number) : Promise<CartResponseDto> {
      const cart = await this.getOrCreateCart(userId);

      const item = await this.cartItemRepository.findOne({
          where: {id: itemId, cartId: cart.id},
      });

      if(!item) {
          throw new NotFoundException(`Cart item with id ${itemId} not found in your cart`);
      }

      await this.cartItemRepository.remove(item);

      return this.getCart(userId);
  }

  async clearCart(userId: number) : Promise<{message: string}> {
      const cart = await this.getOrCreateCart(userId);

      await this.cartItemRepository.delete({cartId: cart.id});

      return {message: 'Cart cleared successfully'};
  }

  /**
   * Remove specific items from cart (by cart-item IDs).
   * Used when ordering only selected items.
   */
  async removeItems(userId: number, itemIds: number[]): Promise<void> {
    const cart = await this.getOrCreateCart(userId);
    for (const itemId of itemIds) {
      await this.cartItemRepository.delete({ id: itemId, cartId: cart.id });
    }
  }


  private async mapToResponseDto(cart: ShoppingCart): Promise<CartResponseDto> {
      // 1. Collect unique categoryIds from cart items
      const categoryIds = [
        ...new Set(
          cart.items
            ?.map((item) => item.catSpec?.cat?.categoryId)
            .filter(Boolean) as number[],
        ),
      ];

      // 2. Fetch active promotions for each category in parallel
      const promoMap = new Map<number, any>(); // categoryId → best promotion
      if (categoryIds.length > 0) {
        const promoResults = await Promise.all(
          categoryIds.map((catId) =>
            this.promotionService.findByCategory(catId).catch(() => []),
          ),
        );
        categoryIds.forEach((catId, i) => {
          const promos = promoResults[i];
          if (promos && promos.length > 0) {
            // Pick best promotion (highest discount) — we'll evaluate per-item later
            promoMap.set(catId, promos);
          }
        });
      }

      // 3. Map items with discount info
      const items = (cart.items || []).map((item) => {
        const price = Number(item.catSpec.price);
        const categoryId = item.catSpec?.cat?.categoryId || 0;
        const promos = promoMap.get(categoryId) || [];

        // Find best promotion for this price
        let bestPromo: any = null;
        let bestDiscountedPrice = price;

        for (const promo of promos) {
          const discounted = this.promotionService.calculatePriceAfterDiscount(
            price,
            promo as any,
          );
          if (discounted < bestDiscountedPrice) {
            bestDiscountedPrice = discounted;
            bestPromo = promo;
          }
        }

        return {
          id: item.id,
          catSpecId: item.catSpec.id,
          sku: item.catSpec.sku,
          catName: item.catSpec.cat?.name || '',
          catImage: item.catSpec.catImage || item.catSpec.cat?.image || '',
          categoryId,
          price,
          discountedPrice: bestDiscountedPrice,
          qty: item.qty,
          subTotal: bestDiscountedPrice * item.qty,
          promotion: bestPromo
            ? {
                name: bestPromo.name,
                discountType: bestPromo.discountType,
                discountRate: bestPromo.discountRate,
                discountAmount: bestPromo.discountAmount,
              }
            : null,
        };
      });

      const totalAmount = items.reduce((sum, item) => sum + item.subTotal, 0);
      const totalOriginal = items.reduce(
        (sum, item) => sum + item.price * item.qty,
        0,
      );

      return {
        id: cart.id,
        userId: cart.userId,
        items,
        totalItems: items.reduce((sum, item) => sum + item.qty, 0),
        totalAmount,
        totalDiscount: totalOriginal - totalAmount,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };
  }


}
