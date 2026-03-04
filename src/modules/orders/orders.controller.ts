import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser } from '../auth/decorators/current-user-decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enum/user-role.enum';
import { Public } from '../auth/decorators/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /* ===== USER ENDPOINTS ===== */

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createOrder(@CurrentUser('id') userId: number, @Body() dto: CreateOrderDto) {
    return this.ordersService.CreateOrder(userId, dto);
  }

  @Get('my-orders')
  getMyOrders(
    @CurrentUser('id') userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getOrderHistory(
      userId,
      page || 1,
      limit || 10,
      status,
    );
  }

  @Get('my-orders/:id')
  getMyOrderDetail(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.findOrderForUser(userId, orderId);
  }

  @Patch('my-orders/:id/cancel')
  cancelMyOrder(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrderByUser(userId, orderId, reason);
  }

  /* ===== ADMIN ENDPOINTS ===== */

  @Get()
  @Roles(UserRole.ADMIN)
  getAllOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAllOrders(page || 1, limit || 10, status);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  getOrderDetail(@Param('id', ParseIntPipe) orderId: number) {
    return this.ordersService.findOrderWithDetails(orderId);
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN)
  confirmOrder(@Param('id', ParseIntPipe) orderId: number) {
    return this.ordersService.confirmOrder(orderId);
  }

  @Patch(':id/process')
  @Roles(UserRole.ADMIN)
  processOrder(@Param('id', ParseIntPipe) orderId: number) {
    return this.ordersService.processOrder(orderId);
  }

  @Patch(':id/ship')
  @Roles(UserRole.ADMIN)
  shipOrder(@Param('id', ParseIntPipe) orderId: number) {
    return this.ordersService.shipOrder(orderId);
  }

  @Patch(':id/deliver')
  @Roles(UserRole.ADMIN)
  deliverOrder(@Param('id', ParseIntPipe) orderId: number) {
    return this.ordersService.deliverOrder(orderId);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN)
  cancelOrder(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancelOrder(orderId, reason);
  }

  /* ===== PUBLIC: Shipping methods ===== */

  @Get('shipping-methods/list')
  @Public()
  getShippingMethods() {
    return this.ordersService.getShippingMethods();
  }
}
