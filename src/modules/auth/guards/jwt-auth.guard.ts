import {ExecutionContext, Injectable} from "@nestjs/common";
import {AuthGuard} from "@nestjs/passport";
import {Reflector} from "@nestjs/core";
import {IS_PUBLIC_KEY} from "../decorators/public.decorator";


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt'){
    constructor(private reflector: Reflector) {
        super();
    }

    //Reflector: đọc metadata (@Public)

    canActivate(context: ExecutionContext){
        //Dòng này đi tìm xem có decorator @Public()
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(), context.getClass()
        ]);
        if(isPublic){
            return true;
        }
        //Lúc này, quy trình kiểm tra JWT  bắt đầu.
        // Nếu không có Token hoặc Token sai,
        // người dùng sẽ nhận lỗi 401 Unauthorized.
        return super.canActivate(context);
    }
}

//Khi JwtAuthGuard chạy đến dòng super.canActivate(context):
//
// AuthGuard('jwt') sẽ vào một "kho lưu trữ" của Passport (gọi là Registry).
//
// Nó tìm kiếm xem có cái Strategy nào đã được đăng ký với tên là 'jwt' hay không.
//
// Vì bạn đã khai báo JwtStrategy trong providers của AuthModule,
// NestJS đã khởi tạo nó và Passport đã ghi nhận: "À, có ông JwtStrategy này nhận tên là 'jwt' đây rồi!".
//
// Lúc này, AuthGuard sẽ tự động kích hoạt logic của JwtStrategy:
//
// Đầu tiên nó chạy logic của passport-jwt để tách Token và verify chữ ký.
//
// Nếu thành công, nó tự động gọi hàm validate() mà bạn đã viết.