import {BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import {InjectRepository} from "@nestjs/typeorm";
import {ShoppingCart} from "./entities/shopping-cart.entity";
import {Repository} from "typeorm";
import {ShoppingCartItem} from "./entities/shopping-cart-item.entity";
import {CatSpec} from "../cats/entities/cat-spec.entity";
import {CartResponseDto} from "./dto/cart-response.dto";

@Injectable()
export class ShoppingCartService {
  constructor(
      @InjectRepository(ShoppingCart)
      private cartRepository: Repository<ShoppingCart>,
      @InjectRepository(ShoppingCartItem)
      private cartItemRepository: Repository<ShoppingCartItem>,
      @InjectRepository(CatSpec)
      private catSpecRepository: Repository<CatSpec>
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


  private mapToResponseDto(cart: ShoppingCart): CartResponseDto {
      const items = cart.items?.map(item => ({
          id: item.id,
          catSpecId: item.catSpec.id,
          sku: item.catSpec.sku,
          catName: item.catSpec.cat?.name ||'',
          catImage: item.catSpec.catImage || item.catSpec.cat?.image || '',
          price: Number(item.catSpec.price),
          qty: item.qty,
          subTotal: Number(item.catSpec.price) * item.qty
      })) || [];

      const totalAmount = items.reduce((sum, item) => sum + item.subTotal , 0);

      return {
          id: cart.id,
          userId: cart.userId,
          items,
          totalItems: items.reduce((sum, item) => sum + item.qty, 0),
            totalAmount,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
      };
  }


}
