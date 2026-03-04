import {UserRole} from "../../users/enum/user-role.enum";
import {SetMetadata} from "@nestjs/common";

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

//Dấu ba chấm (...) cho phép bạn truyền vào số lượng tham số
// không giới hạn, và nó sẽ gom tất cả các tham số đó vào một cái mảng tên là roles.

//Nếu bạn gọi @Roles(UserRole.ADMIN, UserRole.MANAGER), thì roles sẽ là ['ADMIN', 'MANAGER'].