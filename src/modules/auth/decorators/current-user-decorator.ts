import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
//, thông thường thông tin người dùng (sau khi qua JWT Guard)
// sẽ được gắn vào đối tượng request.
// là giúp bạn lấy thông tin người dùng hiện tại (đã đăng nhập)
export const CurrentUser = createParamDecorator(
    (data: keyof User | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        //Lấy đối tượng request từ ngữ cảnh
        // thực thi (Execution Context) của NestJS.
        const user = request.user;

        return data ? user?.[data] : user;
        //Nếu bạn gọi @CurrentUser(), data là undefined ->
        // Trả về nguyên cả object user.

        //Nếu bạn gọi @CurrentUser('email'),
        // data là 'email' -> Nó sẽ chỉ trả về giá trị
        // email của user đó (user['email']).
    },
);

//--> @CurrentUser() Thay vì phải viết req.user
