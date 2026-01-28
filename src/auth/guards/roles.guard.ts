import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from "@nestjs/common";
import {Reflector} from "@nestjs/core";
import {UserRole} from "../../users/enum/user-role.enum";
import {ROLES_KEY} from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate{
    constructor(private reflector: Reflector) {
    }

    canActivate(context: ExecutionContext): boolean {
        //getAllAndOverride: Lệnh này bảo NestJS rằng: "Hãy tìm cái nhãn có tên là ROLES_KEY ('roles')
        // ở cả cấp độ hàm (getHandler) và cấp độ class (getClass)".
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>
        (ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }

        const {user} = context.switchToHttp().getRequest();

        if(!user){
            throw new ForbiddenException('User not found');
        }
        //Hàm .some() sẽ kiểm tra: "Liệu có ít nhất một quyền trong danh sách cho phép trùng với quyền của user không?".
        const hasRole = requiredRoles.some((role) => user.role === role);
        if(!hasRole){
            throw new ForbiddenException('You do not have permission to access this resource');
        }

        return hasRole;

    }
}