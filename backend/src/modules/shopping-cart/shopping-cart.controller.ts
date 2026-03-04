import {Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe} from '@nestjs/common';
import {ShoppingCartService} from './shopping-cart.service';
import {AddToCartDto} from './dto/add-to-cart.dto';
import {UpdateCartItemDto} from './dto/update-cart-item.dto';
import {CurrentUser} from "../auth/decorators/current-user-decorator";
import {CartResponseDto} from "./dto/cart-response.dto";
import {UpdateVariantDto} from "../cats/dto/update-variant.dto";

@Controller('shopping-cart')
export class ShoppingCartController {
    constructor(private readonly shoppingCartService: ShoppingCartService) {
    }

    @Get()
    getCart(@CurrentUser('id') userId: number): Promise<CartResponseDto> {
        return this.shoppingCartService.getCart(userId);
    }

    @Post('items')
    addToCart(
        @CurrentUser('id') userId: number,
        @Body() addToCartDto: AddToCartDto,
    ): Promise<CartResponseDto> {
        return this.shoppingCartService.addToCart(userId, addToCartDto);
    }

    @Patch('items/:id')
    updateCartItem(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) itemId: number,
        @Body() updateDto: UpdateCartItemDto,
    ): Promise<CartResponseDto> {
        return this.shoppingCartService.updateCartItem(userId, itemId, updateDto);
    }


    @Delete('items/:id')
    removeCartItem(
        @CurrentUser('id') userId: number,
        @Param('id', ParseIntPipe) itemId: number,
    ): Promise<CartResponseDto> {
        return this.shoppingCartService.removeCartItem(userId, itemId);
    }

    @Delete()
    clearCart(@CurrentUser('id') userId: number) {
        return this.shoppingCartService.clearCart(userId);
    }
}
